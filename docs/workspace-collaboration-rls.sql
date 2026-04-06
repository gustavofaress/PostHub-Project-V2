-- Collaboration RLS for PostHub shared workspaces
-- Run this after docs/workspace-members.sql
--
-- Goal:
-- - allow shared workspace members to read workspace profiles
-- - allow module reads/writes only when the member has the mapped permission
-- - keep owners/admins with full workspace access

alter table public.client_profiles enable row level security;
alter table public.script_drafts enable row level security;
alter table public.ideas enable row level security;
alter table public.editorial_columns enable row level security;
alter table public.editorial_calendar enable row level security;

drop policy if exists "client_profiles_select_shared_workspace" on public.client_profiles;
create policy "client_profiles_select_shared_workspace"
on public.client_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_can_access_workspace(id)
);

drop policy if exists "script_drafts_select_shared_workspace" on public.script_drafts;
create policy "script_drafts_select_shared_workspace"
on public.script_drafts
for select
to authenticated
using (
  profile_id is not null
  and public.current_user_can_access_workspace(profile_id)
);

drop policy if exists "script_drafts_insert_shared_workspace" on public.script_drafts;
create policy "script_drafts_insert_shared_workspace"
on public.script_drafts
for insert
to authenticated
with check (
  profile_id is not null
  and user_id = auth.uid()
  and public.current_user_has_workspace_permission(profile_id, 'scripts')
);

drop policy if exists "script_drafts_update_shared_workspace" on public.script_drafts;
create policy "script_drafts_update_shared_workspace"
on public.script_drafts
for update
to authenticated
using (
  profile_id is not null
  and public.current_user_has_workspace_permission(profile_id, 'scripts')
)
with check (
  profile_id is not null
  and public.current_user_has_workspace_permission(profile_id, 'scripts')
);

drop policy if exists "script_drafts_delete_shared_workspace" on public.script_drafts;
create policy "script_drafts_delete_shared_workspace"
on public.script_drafts
for delete
to authenticated
using (
  profile_id is not null
  and public.current_user_has_workspace_permission(profile_id, 'scripts')
);

drop policy if exists "ideas_select_shared_workspace" on public.ideas;
create policy "ideas_select_shared_workspace"
on public.ideas
for select
to authenticated
using (
  profile_id is not null
  and public.current_user_can_access_workspace(profile_id)
);

drop policy if exists "ideas_insert_shared_workspace" on public.ideas;
create policy "ideas_insert_shared_workspace"
on public.ideas
for insert
to authenticated
with check (
  profile_id is not null
  and user_id = auth.uid()
  and public.current_user_has_workspace_permission(profile_id, 'ideas')
);

drop policy if exists "ideas_update_shared_workspace" on public.ideas;
create policy "ideas_update_shared_workspace"
on public.ideas
for update
to authenticated
using (
  profile_id is not null
  and public.current_user_has_workspace_permission(profile_id, 'ideas')
)
with check (
  profile_id is not null
  and public.current_user_has_workspace_permission(profile_id, 'ideas')
);

drop policy if exists "ideas_delete_shared_workspace" on public.ideas;
create policy "ideas_delete_shared_workspace"
on public.ideas
for delete
to authenticated
using (
  profile_id is not null
  and public.current_user_has_workspace_permission(profile_id, 'ideas')
);

drop policy if exists "editorial_columns_select_shared_workspace" on public.editorial_columns;
create policy "editorial_columns_select_shared_workspace"
on public.editorial_columns
for select
to authenticated
using (
  public.current_user_can_access_workspace(profile_id)
);

drop policy if exists "editorial_columns_insert_shared_workspace" on public.editorial_columns;
create policy "editorial_columns_insert_shared_workspace"
on public.editorial_columns
for insert
to authenticated
with check (
  public.current_user_has_workspace_permission(profile_id, 'kanban')
);

drop policy if exists "editorial_columns_update_shared_workspace" on public.editorial_columns;
create policy "editorial_columns_update_shared_workspace"
on public.editorial_columns
for update
to authenticated
using (
  public.current_user_has_workspace_permission(profile_id, 'kanban')
)
with check (
  public.current_user_has_workspace_permission(profile_id, 'kanban')
);

drop policy if exists "editorial_columns_delete_shared_workspace" on public.editorial_columns;
create policy "editorial_columns_delete_shared_workspace"
on public.editorial_columns
for delete
to authenticated
using (
  public.current_user_has_workspace_permission(profile_id, 'kanban')
);

drop policy if exists "editorial_calendar_select_shared_workspace" on public.editorial_calendar;
create policy "editorial_calendar_select_shared_workspace"
on public.editorial_calendar
for select
to authenticated
using (
  profile_id is not null
  and public.current_user_can_access_workspace(profile_id)
);

drop policy if exists "editorial_calendar_insert_shared_workspace" on public.editorial_calendar;
create policy "editorial_calendar_insert_shared_workspace"
on public.editorial_calendar
for insert
to authenticated
with check (
  profile_id is not null
  and user_id = auth.uid()
  and public.current_user_has_workspace_permission(profile_id, 'kanban')
);

drop policy if exists "editorial_calendar_update_shared_workspace" on public.editorial_calendar;
create policy "editorial_calendar_update_shared_workspace"
on public.editorial_calendar
for update
to authenticated
using (
  profile_id is not null
  and public.current_user_has_workspace_permission(profile_id, 'kanban')
)
with check (
  profile_id is not null
  and public.current_user_has_workspace_permission(profile_id, 'kanban')
);

drop policy if exists "editorial_calendar_delete_shared_workspace" on public.editorial_calendar;
create policy "editorial_calendar_delete_shared_workspace"
on public.editorial_calendar
for delete
to authenticated
using (
  profile_id is not null
  and public.current_user_has_workspace_permission(profile_id, 'kanban')
);
