create extension if not exists pgcrypto;

create table if not exists public.user_account_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  website text,
  avatar_url text,
  notification_preferences jsonb not null default '{
    "inApp": true,
    "taskAssigned": true,
    "taskUpdated": true,
    "commentMentioned": true,
    "taskCommented": true
  }'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_user_account_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_user_account_settings_updated_at on public.user_account_settings;
create trigger set_user_account_settings_updated_at
  before update on public.user_account_settings
  for each row
  execute function public.set_user_account_settings_updated_at();

alter table public.user_account_settings enable row level security;

drop policy if exists "Users can read their own account settings" on public.user_account_settings;
create policy "Users can read their own account settings"
  on public.user_account_settings
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create their own account settings" on public.user_account_settings;
create policy "Users can create their own account settings"
  on public.user_account_settings
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own account settings" on public.user_account_settings;
create policy "Users can update their own account settings"
  on public.user_account_settings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.user_account_settings from anon, authenticated;
grant select, insert, update on public.user_account_settings to authenticated;
grant all privileges on public.user_account_settings to service_role;

create or replace function public.get_user_notification_preferences(target_user_ids uuid[])
returns table (
  user_id uuid,
  notification_preferences jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select settings.user_id, settings.notification_preferences
  from public.user_account_settings settings
  where settings.user_id = any(target_user_ids)
    and (
      settings.user_id = auth.uid()
      or exists (
        select 1
        from public.workspace_members current_member
        join public.workspace_members target_member
          on target_member.profile_id = current_member.profile_id
        where current_member.user_id = auth.uid()
          and current_member.status = 'active'
          and target_member.user_id = settings.user_id
          and target_member.status = 'active'
      )
      or exists (
        select 1
        from public.client_profiles owned_profile
        join public.workspace_members target_member
          on target_member.profile_id = owned_profile.id
        where owned_profile.user_id = auth.uid()
          and target_member.user_id = settings.user_id
          and target_member.status = 'active'
      )
    );
$$;

revoke all on function public.get_user_notification_preferences(uuid[]) from public;
grant execute on function public.get_user_notification_preferences(uuid[]) to authenticated;

alter table if exists public.usuarios enable row level security;

drop policy if exists "Users can update their own visible account name" on public.usuarios;
create policy "Users can update their own visible account name"
  on public.usuarios
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant update (nome) on public.usuarios to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-avatars',
  'user-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'user-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'user-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );
