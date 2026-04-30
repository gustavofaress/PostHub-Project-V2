create extension if not exists pgcrypto;

create table if not exists public.client_profile_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_profile_notes_profile_created_at_idx
  on public.client_profile_notes (profile_id, created_at desc);

create index if not exists client_profile_notes_user_id_idx
  on public.client_profile_notes (user_id);

alter table public.client_profile_notes enable row level security;

drop policy if exists "Users can read notes for accessible profiles" on public.client_profile_notes;
create policy "Users can read notes for accessible profiles"
  on public.client_profile_notes
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

drop policy if exists "Users can create notes for accessible profiles" on public.client_profile_notes;
create policy "Users can create notes for accessible profiles"
  on public.client_profile_notes
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_can_access_profile(profile_id)
  );

revoke all on public.client_profile_notes from anon, authenticated;
grant select, insert on public.client_profile_notes to authenticated;
grant all privileges on public.client_profile_notes to service_role;
