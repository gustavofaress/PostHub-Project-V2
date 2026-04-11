create extension if not exists pgcrypto;

alter table if exists public.workspace_members
  add column if not exists permissions text[] not null default '{}';

create or replace function public.current_user_can_manage_workspace_members(target_profile_id uuid)
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
      and wm.role in ('owner', 'admin')
  );
$$;

revoke all on function public.current_user_can_manage_workspace_members(uuid) from public;
grant execute on function public.current_user_can_manage_workspace_members(uuid) to authenticated;

create or replace function public.current_user_has_workspace_permission(
  target_profile_id uuid,
  required_permission text
)
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
      and required_permission = any(coalesce(wm.permissions, '{}'))
  );
$$;

revoke all on function public.current_user_has_workspace_permission(uuid, text) from public;
grant execute on function public.current_user_has_workspace_permission(uuid, text) to authenticated;

create table if not exists public.workspace_task_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('editorial_calendar', 'idea', 'reference', 'approval_post')),
  entity_id text not null,
  member_id uuid not null references public.workspace_members(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists workspace_task_assignments_unique_idx
  on public.workspace_task_assignments (profile_id, entity_type, entity_id, member_id);

create index if not exists workspace_task_assignments_profile_entity_idx
  on public.workspace_task_assignments (profile_id, entity_type, entity_id);

alter table public.workspace_task_assignments enable row level security;

drop policy if exists "Users can read task assignments for accessible profiles" on public.workspace_task_assignments;
create policy "Users can read task assignments for accessible profiles"
  on public.workspace_task_assignments
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

drop policy if exists "Users can write task assignments for manageable profiles" on public.workspace_task_assignments;
create policy "Users can write task assignments for manageable profiles"
  on public.workspace_task_assignments
  for all
  to authenticated
  using (public.current_user_can_manage_workspace_members(profile_id))
  with check (public.current_user_can_manage_workspace_members(profile_id));

revoke all on public.workspace_task_assignments from anon, authenticated;
grant select, insert, update, delete on public.workspace_task_assignments to authenticated;
grant all privileges on public.workspace_task_assignments to service_role;

create table if not exists public.workspace_task_comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('editorial_calendar', 'idea', 'reference', 'approval_post')),
  entity_id text not null,
  author_user_id uuid references auth.users(id) on delete set null,
  author_name text not null default '',
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists workspace_task_comments_profile_entity_idx
  on public.workspace_task_comments (profile_id, entity_type, entity_id, created_at);

alter table public.workspace_task_comments enable row level security;

drop policy if exists "Users can read task comments for accessible profiles" on public.workspace_task_comments;
create policy "Users can read task comments for accessible profiles"
  on public.workspace_task_comments
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

drop policy if exists "Users can create task comments for accessible profiles" on public.workspace_task_comments;
create policy "Users can create task comments for accessible profiles"
  on public.workspace_task_comments
  for insert
  to authenticated
  with check (
    public.current_user_can_access_profile(profile_id)
    and (
      author_user_id is null
      or author_user_id = auth.uid()
    )
  );

revoke all on public.workspace_task_comments from anon, authenticated;
grant select, insert on public.workspace_task_comments to authenticated;
grant all privileges on public.workspace_task_comments to service_role;
