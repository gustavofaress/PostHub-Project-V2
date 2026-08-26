create schema if not exists private;

create or replace function private.ensure_default_profile_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_entitlements (
    profile_id,
    plan_code,
    source,
    subscription_ref,
    effective_from,
    effective_until,
    calendar_enabled,
    kanban_enabled,
    references_enabled,
    metrics_enabled,
    social_analytics_enabled,
    approval_enabled,
    approval_link_creation_enabled,
    max_additional_members
  )
  values (
    new.id,
    'free',
    'default_free',
    null,
    coalesce(new.created_at, timezone('utc', now())),
    null,
    true,
    true,
    false,
    false,
    false,
    false,
    false,
    2
  )
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

revoke all on function private.ensure_default_profile_entitlement() from public;

drop trigger if exists ensure_default_profile_entitlement on public.client_profiles;
create trigger ensure_default_profile_entitlement
  after insert on public.client_profiles
  for each row
  execute function private.ensure_default_profile_entitlement();
