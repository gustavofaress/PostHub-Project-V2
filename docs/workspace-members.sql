-- Workspace members + permissions for PostHub
-- Execute this file in Supabase SQL Editor after the base tables already exist.
-- Assumptions:
-- 1) public.client_profiles.id is the workspace identifier used by the app.
-- 2) public.client_profiles.user_id is the owner of the workspace.
-- 3) public.usuarios.id matches auth.uid() for authenticated users.
--
-- This script creates:
-- - public.workspace_members
-- - helper functions for access management
-- - RLS policies for owners/admins/members
-- - an accept invite function for users who already signed up
--
-- Important:
-- This does NOT create auth users automatically from email.
-- The "send invite / create login" step should be done by an Edge Function
-- using the service role key, then this table stores the access model.

create extension if not exists pgcrypto;

create schema if not exists private;

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  user_id uuid null,
  invited_by uuid null,
  email text not null,
  full_name text null,
  role text not null default 'editor',
  status text not null default 'invited',
  permissions text[] not null default '{}',
  invite_token uuid not null default gen_random_uuid(),
  invite_sent_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz null,
  last_access_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workspace_members_role_check
    check (role in ('owner', 'admin', 'editor', 'reviewer')),
  constraint workspace_members_status_check
    check (status in ('invited', 'active', 'disabled')),
  constraint workspace_members_permissions_check
    check (
      permissions <@ array[
        'scripts',
        'ideas',
        'approval',
        'calendar',
        'kanban',
        'scheduler',
        'reports',
        'performance'
      ]::text[]
    )
);

create unique index if not exists workspace_members_profile_email_key
  on public.workspace_members (profile_id, lower(email));

create unique index if not exists workspace_members_invite_token_key
  on public.workspace_members (invite_token);

create unique index if not exists workspace_members_profile_user_id_key
  on public.workspace_members (profile_id, user_id)
  where user_id is not null;

create index if not exists workspace_members_user_id_idx
  on public.workspace_members (user_id);

create index if not exists workspace_members_profile_status_idx
  on public.workspace_members (profile_id, status);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists workspace_members_set_updated_at on public.workspace_members;
create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function private.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios
    where id = auth.uid()
      and coalesce(is_admin, false) = true
  );
$$;

create or replace function private.current_user_owns_profile(target_profile_id uuid)
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
  );
$$;

create or replace function private.current_user_is_workspace_admin(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.profile_id = target_profile_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
  );
$$;

create or replace function private.current_user_can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    private.is_current_user_admin()
    or private.current_user_owns_profile(target_profile_id)
    or exists (
      select 1
      from public.workspace_members wm
      where wm.profile_id = target_profile_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    );
$$;

create or replace function private.current_user_can_manage_profile_members(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    private.is_current_user_admin()
    or private.current_user_owns_profile(target_profile_id)
    or private.current_user_is_workspace_admin(target_profile_id);
$$;

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
  select
    private.is_current_user_admin()
    or private.current_user_owns_profile(target_profile_id)
    or exists (
      select 1
      from public.workspace_members wm
      where wm.profile_id = target_profile_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
        and (
          wm.role in ('owner', 'admin')
          or required_permission = any(wm.permissions)
        )
    );
$$;

create or replace function public.current_user_can_manage_workspace_members(
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.current_user_can_manage_profile_members(target_profile_id);
$$;

create or replace function public.current_user_can_access_workspace(
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.current_user_can_access_profile(target_profile_id);
$$;

create or replace function public.accept_workspace_invite(invite_token_input uuid)
returns public.workspace_members
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  updated_member public.workspace_members;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select email
  into current_email
  from auth.users
  where id = auth.uid();

  if current_email is null then
    raise exception 'AUTH_EMAIL_NOT_FOUND';
  end if;

  update public.workspace_members wm
  set
    user_id = auth.uid(),
    status = 'active',
    accepted_at = timezone('utc', now()),
    last_access_at = timezone('utc', now())
  where wm.invite_token = invite_token_input
    and lower(wm.email) = lower(current_email)
    and wm.status in ('invited', 'active')
  returning wm.*
  into updated_member;

  if updated_member.id is null then
    raise exception 'INVITE_NOT_FOUND_OR_EMAIL_MISMATCH';
  end if;

  return updated_member;
end;
$$;

revoke all on function private.is_current_user_admin() from public;
grant execute on function private.is_current_user_admin() to authenticated;

revoke all on function private.current_user_owns_profile(uuid) from public;
grant execute on function private.current_user_owns_profile(uuid) to authenticated;

revoke all on function private.current_user_is_workspace_admin(uuid) from public;
grant execute on function private.current_user_is_workspace_admin(uuid) to authenticated;

revoke all on function private.current_user_can_access_profile(uuid) from public;
grant execute on function private.current_user_can_access_profile(uuid) to authenticated;

revoke all on function private.current_user_can_manage_profile_members(uuid) from public;
grant execute on function private.current_user_can_manage_profile_members(uuid) to authenticated;

grant execute on function public.current_user_has_workspace_permission(uuid, text) to authenticated;
grant execute on function public.current_user_can_manage_workspace_members(uuid) to authenticated;
grant execute on function public.current_user_can_access_workspace(uuid) to authenticated;
grant execute on function public.accept_workspace_invite(uuid) to authenticated;

alter table public.workspace_members enable row level security;

drop policy if exists "workspace_members_select_visible_rows" on public.workspace_members;
create policy "workspace_members_select_visible_rows"
on public.workspace_members
for select
to authenticated
using (
  private.current_user_can_access_profile(profile_id)
);

drop policy if exists "workspace_members_insert_managers_only" on public.workspace_members;
create policy "workspace_members_insert_managers_only"
on public.workspace_members
for insert
to authenticated
with check (
  private.current_user_can_manage_profile_members(profile_id)
  and invited_by = auth.uid()
);

drop policy if exists "workspace_members_update_managers_or_self_accept" on public.workspace_members;
create policy "workspace_members_update_managers_or_self_accept"
on public.workspace_members
for update
to authenticated
using (
  private.current_user_can_manage_profile_members(profile_id)
  or user_id = auth.uid()
)
with check (
  private.current_user_can_manage_profile_members(profile_id)
  or user_id = auth.uid()
);

drop policy if exists "workspace_members_delete_managers_only" on public.workspace_members;
create policy "workspace_members_delete_managers_only"
on public.workspace_members
for delete
to authenticated
using (
  private.current_user_can_manage_profile_members(profile_id)
);

comment on table public.workspace_members is
'Stores members invited to a client workspace/profile, their role, status, and allowed task modules.';

comment on function public.current_user_has_workspace_permission(uuid, text) is
'Returns true when the authenticated user can operate a given module inside the workspace/profile.';

comment on function public.accept_workspace_invite(uuid) is
'Accepts a workspace invite for the logged-in user when invite email matches auth email.';
