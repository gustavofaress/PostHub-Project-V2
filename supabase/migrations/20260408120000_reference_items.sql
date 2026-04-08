create extension if not exists pgcrypto;

create or replace function public.current_user_can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.client_profiles cp
    where cp.id = target_profile_id
      and cp.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.workspace_members wm
    where wm.profile_id = target_profile_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

revoke all on function public.current_user_can_access_profile(uuid) from public;
grant execute on function public.current_user_can_access_profile(uuid) to authenticated;

create table if not exists public.reference_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  type text not null check (type in ('link', 'image', 'video', 'screen_recording')),
  source text not null default '',
  source_url text,
  thumbnail_url text,
  file_url text,
  tags text[] not null default '{}',
  folder text,
  campaign text,
  platform text,
  format text,
  notes text,
  file_name text,
  file_size_mb numeric(10, 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists reference_items_profile_id_created_at_idx
  on public.reference_items (profile_id, created_at desc);

create index if not exists reference_items_user_id_idx
  on public.reference_items (user_id);

create or replace function public.set_reference_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_reference_items_updated_at on public.reference_items;
create trigger set_reference_items_updated_at
  before update on public.reference_items
  for each row
  execute function public.set_reference_items_updated_at();

alter table public.reference_items enable row level security;

drop policy if exists "Users can read references for accessible profiles" on public.reference_items;
create policy "Users can read references for accessible profiles"
  on public.reference_items
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

drop policy if exists "Users can create references for accessible profiles" on public.reference_items;
create policy "Users can create references for accessible profiles"
  on public.reference_items
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can update references for accessible profiles" on public.reference_items;
create policy "Users can update references for accessible profiles"
  on public.reference_items
  for update
  to authenticated
  using (public.current_user_can_access_profile(profile_id))
  with check (public.current_user_can_access_profile(profile_id));

drop policy if exists "Users can delete references for accessible profiles" on public.reference_items;
create policy "Users can delete references for accessible profiles"
  on public.reference_items
  for delete
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

revoke all on public.reference_items from anon, authenticated;
grant select, insert, delete on public.reference_items to authenticated;
grant update (
  profile_id,
  title,
  description,
  type,
  source,
  source_url,
  thumbnail_url,
  file_url,
  tags,
  folder,
  campaign,
  platform,
  format,
  notes,
  file_name,
  file_size_mb
) on public.reference_items to authenticated;
grant all privileges on public.reference_items to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reference-files',
  'reference-files',
  true,
  524288000,
  null
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload reference files for accessible profiles" on storage.objects;
create policy "Users can upload reference files for accessible profiles"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'reference-files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.current_user_can_access_profile(split_part(name, '/', 2)::uuid)
  );

drop policy if exists "Users can update own reference files for accessible profiles" on storage.objects;
create policy "Users can update own reference files for accessible profiles"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'reference-files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.current_user_can_access_profile(split_part(name, '/', 2)::uuid)
  )
  with check (
    bucket_id = 'reference-files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.current_user_can_access_profile(split_part(name, '/', 2)::uuid)
  );

drop policy if exists "Users can delete own reference files for accessible profiles" on storage.objects;
create policy "Users can delete own reference files for accessible profiles"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'reference-files'
    and split_part(name, '/', 1) = auth.uid()::text
    and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.current_user_can_access_profile(split_part(name, '/', 2)::uuid)
  );
