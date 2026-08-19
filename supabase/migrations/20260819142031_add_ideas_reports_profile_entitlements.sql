alter table public.profile_entitlements
  add column if not exists ideas_enabled boolean,
  add column if not exists reports_enabled boolean;

update public.profile_entitlements
set
  ideas_enabled = coalesce(
    ideas_enabled,
    case
      when plan_code in ('free', 'pro', 'legacy_start', 'legacy_growth', 'legacy_pro') then true
      else null
    end
  ),
  reports_enabled = coalesce(
    reports_enabled,
    case
      when plan_code in ('free', 'legacy_start') then false
      when plan_code in ('pro', 'legacy_growth', 'legacy_pro') then true
      else null
    end
  )
where ideas_enabled is null
   or reports_enabled is null;

do $$
declare
  null_capability_count bigint;
begin
  select count(*)
  into null_capability_count
  from public.profile_entitlements
  where ideas_enabled is null
     or reports_enabled is null;

  if null_capability_count <> 0 then
    raise exception
      'profile_entitlements ideas/reports backfill failed: found % rows with null ideas_enabled or reports_enabled after plan_code mapping.',
      null_capability_count;
  end if;
end
$$;

alter table public.profile_entitlements
  alter column ideas_enabled set not null,
  alter column reports_enabled set not null;

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
    ideas_enabled,
    calendar_enabled,
    kanban_enabled,
    references_enabled,
    metrics_enabled,
    social_analytics_enabled,
    approval_enabled,
    approval_link_creation_enabled,
    reports_enabled,
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
    true,
    false,
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
