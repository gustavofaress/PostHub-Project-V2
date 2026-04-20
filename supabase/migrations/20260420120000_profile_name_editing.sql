alter table if exists public.client_profiles enable row level security;

drop policy if exists "Users can update names for manageable profiles" on public.client_profiles;
create policy "Users can update names for manageable profiles"
  on public.client_profiles
  for update
  to authenticated
  using (public.current_user_can_manage_workspace_members(id))
  with check (public.current_user_can_manage_workspace_members(id));

revoke update on public.client_profiles from authenticated;
grant update (profile_name) on public.client_profiles to authenticated;
