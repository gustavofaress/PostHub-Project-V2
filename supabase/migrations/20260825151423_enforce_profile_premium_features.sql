create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_user_has_profile_commercial_feature(
  target_profile_id uuid,
  requested_feature text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  materialized_access boolean;
  actor_plan text := null;
  actor_is_admin boolean := false;
begin
  if requested_feature is null
     or requested_feature not in (
       'references',
       'metrics',
       'social_analytics',
       'approval',
       'approval_link_creation'
     ) then
    return false;
  end if;

  select case requested_feature
    when 'references' then pe.references_enabled
    when 'metrics' then pe.metrics_enabled
    when 'social_analytics' then pe.social_analytics_enabled
    when 'approval' then pe.approval_enabled
    when 'approval_link_creation' then pe.approval_link_creation_enabled
    else false
  end
    into materialized_access
  from public.profile_entitlements pe
  where pe.profile_id = target_profile_id;

  if found then
    return coalesce(materialized_access, false);
  end if;

  select lower(btrim(coalesce(u.current_plan, ''))), coalesce(u.is_admin, false)
    into actor_plan, actor_is_admin
  from public.usuarios u
  where u.id = auth.uid();

  if actor_is_admin then
    return true;
  end if;

  if requested_feature in ('metrics', 'social_analytics') then
    return true;
  end if;

  if actor_plan is null or actor_plan = '' then
    return false;
  end if;

  if actor_plan in ('start_7', 'teste', 'trial') then
    return true;
  end if;

  case requested_feature
    when 'references' then
      return actor_plan in ('growth', 'pro');
    when 'approval' then
      return actor_plan = 'pro';
    when 'approval_link_creation' then
      return actor_plan in ('start', 'growth', 'pro');
    else
      return false;
  end case;
end;
$$;

revoke all on function private.current_user_has_profile_commercial_feature(uuid, text) from public;
grant execute on function private.current_user_has_profile_commercial_feature(uuid, text)
  to authenticated, service_role;

drop policy if exists "Users can read own references" on public.reference_items;
drop policy if exists "Users can insert own references" on public.reference_items;
drop policy if exists "Users can update own references" on public.reference_items;
drop policy if exists "Users can delete own references" on public.reference_items;
drop policy if exists "Users can read references for accessible profiles" on public.reference_items;
drop policy if exists "Users can create references for accessible profiles" on public.reference_items;
drop policy if exists "Users can update references for accessible profiles" on public.reference_items;
drop policy if exists "Users can delete references for accessible profiles" on public.reference_items;

create policy "Users can read own references"
  on public.reference_items
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and public.current_user_can_access_profile(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'references')
  );

create policy "Users can insert own references"
  on public.reference_items
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.current_user_can_access_profile(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'references')
  );

create policy "Users can update own references"
  on public.reference_items
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and public.current_user_can_access_profile(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'references')
  )
  with check (
    auth.uid() = user_id
    and public.current_user_can_access_profile(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'references')
  );

create policy "Users can delete own references"
  on public.reference_items
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and public.current_user_can_access_profile(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'references')
  );

drop policy if exists "Users can read calendar approval links for accessible profiles"
  on public.calendar_approval_links;
drop policy if exists "Users can manage calendar approval links for manageable profiles"
  on public.calendar_approval_links;
drop policy if exists "Users can create calendar approval links for manageable profiles"
  on public.calendar_approval_links;
drop policy if exists "Users can update calendar approval links for manageable profiles"
  on public.calendar_approval_links;
drop policy if exists "Users can delete calendar approval links for manageable profiles"
  on public.calendar_approval_links;

create policy "Users can read calendar approval links for accessible profiles"
  on public.calendar_approval_links
  for select
  to authenticated
  using (
    public.current_user_can_access_profile(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'approval')
  );

create policy "Users can create calendar approval links for manageable profiles"
  on public.calendar_approval_links
  for insert
  to authenticated
  with check (
    public.current_user_can_manage_workspace_members(profile_id)
    and user_id = auth.uid()
    and private.current_user_has_profile_commercial_feature(profile_id, 'approval_link_creation')
  );

create policy "Users can update calendar approval links for manageable profiles"
  on public.calendar_approval_links
  for update
  to authenticated
  using (
    public.current_user_can_manage_workspace_members(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'approval')
  )
  with check (
    public.current_user_can_manage_workspace_members(profile_id)
    and user_id = auth.uid()
    and private.current_user_has_profile_commercial_feature(profile_id, 'approval')
  );

create policy "Users can delete calendar approval links for manageable profiles"
  on public.calendar_approval_links
  for delete
  to authenticated
  using (
    public.current_user_can_manage_workspace_members(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'approval')
  );

drop policy if exists "Users can read calendar post approvals for accessible profiles"
  on public.calendar_post_approvals;
drop policy if exists "Users can manage calendar post approvals for manageable profiles"
  on public.calendar_post_approvals;
drop policy if exists "Users can create calendar post approvals for manageable profiles"
  on public.calendar_post_approvals;
drop policy if exists "Users can update calendar post approvals for manageable profiles"
  on public.calendar_post_approvals;
drop policy if exists "Users can delete calendar post approvals for manageable profiles"
  on public.calendar_post_approvals;

create policy "Users can read calendar post approvals for accessible profiles"
  on public.calendar_post_approvals
  for select
  to authenticated
  using (
    public.current_user_can_access_profile(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'approval')
  );

create policy "Users can create calendar post approvals for manageable profiles"
  on public.calendar_post_approvals
  for insert
  to authenticated
  with check (
    public.current_user_can_manage_workspace_members(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'approval_link_creation')
  );

create policy "Users can update calendar post approvals for manageable profiles"
  on public.calendar_post_approvals
  for update
  to authenticated
  using (
    public.current_user_can_manage_workspace_members(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'approval')
  )
  with check (
    public.current_user_can_manage_workspace_members(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'approval')
  );

create policy "Users can delete calendar post approvals for manageable profiles"
  on public.calendar_post_approvals
  for delete
  to authenticated
  using (
    public.current_user_can_manage_workspace_members(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'approval')
  );

drop policy if exists "Users can read calendar approval feedback for accessible profiles"
  on public.calendar_approval_feedback;
drop policy if exists "Users can create calendar approval feedback for accessible profiles"
  on public.calendar_approval_feedback;

create policy "Users can read calendar approval feedback for accessible profiles"
  on public.calendar_approval_feedback
  for select
  to authenticated
  using (
    public.current_user_can_access_profile(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'approval')
  );

create policy "Users can create calendar approval feedback for accessible profiles"
  on public.calendar_approval_feedback
  for insert
  to authenticated
  with check (
    public.current_user_can_access_profile(profile_id)
    and (
      author_user_id is null
      or author_user_id = auth.uid()
    )
    and private.current_user_has_profile_commercial_feature(profile_id, 'approval')
  );

drop policy if exists "Users can read social account metrics for accessible profiles"
  on public.social_account_metrics;
drop policy if exists "Users can read social connections for accessible profiles"
  on public.social_connections;
drop policy if exists "Users can read social sync runs for accessible profiles"
  on public.social_sync_runs;

create policy "Users can read social account metrics for accessible profiles"
  on public.social_account_metrics
  for select
  to authenticated
  using (
    public.current_user_can_access_profile(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'metrics')
  );

create policy "Users can read social connections for accessible profiles"
  on public.social_connections
  for select
  to authenticated
  using (
    public.current_user_can_access_profile(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'social_analytics')
  );

create policy "Users can read social sync runs for accessible profiles"
  on public.social_sync_runs
  for select
  to authenticated
  using (
    public.current_user_can_access_profile(profile_id)
    and private.current_user_has_profile_commercial_feature(profile_id, 'social_analytics')
  );
