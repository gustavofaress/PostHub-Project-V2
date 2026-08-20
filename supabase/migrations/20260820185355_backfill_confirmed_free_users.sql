do $$
declare
  v_total_candidates integer;
  v_legacy_snapshot_candidates integer;
  v_default_free_candidates integer;
  v_admin_candidates integer;
  v_ambiguous_candidates integer;
  v_non_free_candidates integer;
  v_missing_entitlement_candidates integer;
  v_updated_count integer;
begin
  create temporary table tmp_confirmed_free_user_classification
  on commit drop
  as
  with per_user as (
    select
      u.id as user_id,
      coalesce(u.is_admin, false) as is_admin,
      count(cp.id) filter (where cp.id is not null) as owned_profile_count,
      count(pe.profile_id) filter (where cp.id is not null and pe.profile_id is not null) as entitlement_count,
      count(*) filter (where cp.id is not null and pe.plan_code = 'free') as free_entitlement_count,
      count(*) filter (where cp.id is not null and pe.source = 'legacy_snapshot') as legacy_snapshot_count,
      count(*) filter (where cp.id is not null and pe.source = 'default_free') as default_free_count,
      count(*) filter (where cp.id is not null and pe.profile_id is null) as missing_entitlement_count,
      count(*) filter (where cp.id is not null and pe.plan_code is distinct from 'free') as non_free_entitlement_count,
      count(*) filter (
        where cp.id is not null
          and (pe.source is null or pe.source not in ('legacy_snapshot', 'default_free'))
      ) as disallowed_source_count
    from public.usuarios u
    left join public.client_profiles cp
      on cp.user_id = u.id
    left join public.profile_entitlements pe
      on pe.profile_id = cp.id
    where u.current_plan = 'start_7'
    group by u.id, coalesce(u.is_admin, false)
  )
  select
    user_id,
    is_admin,
    case
      when owned_profile_count = 0 then 'no_profile'
      when missing_entitlement_count > 0 then 'missing_entitlement'
      when non_free_entitlement_count > 0 then 'non_free_entitlement'
      when disallowed_source_count > 0 then 'disallowed_source'
      when legacy_snapshot_count = owned_profile_count then 'eligible_legacy_snapshot'
      when default_free_count = owned_profile_count then 'eligible_default_free'
      else 'ambiguous'
    end as classification
  from per_user;

  select
    count(*) filter (
      where not is_admin and classification in ('eligible_legacy_snapshot', 'eligible_default_free')
    )::integer,
    count(*) filter (
      where not is_admin and classification = 'eligible_legacy_snapshot'
    )::integer,
    count(*) filter (
      where not is_admin and classification = 'eligible_default_free'
    )::integer,
    count(*) filter (
      where is_admin and classification in ('eligible_legacy_snapshot', 'eligible_default_free')
    )::integer,
    count(*) filter (
      where not is_admin and classification = 'ambiguous'
    )::integer,
    count(*) filter (
      where not is_admin and classification = 'non_free_entitlement'
    )::integer,
    count(*) filter (
      where not is_admin and classification = 'missing_entitlement'
    )::integer
  into
    v_total_candidates,
    v_legacy_snapshot_candidates,
    v_default_free_candidates,
    v_admin_candidates,
    v_ambiguous_candidates,
    v_non_free_candidates,
    v_missing_entitlement_candidates
  from tmp_confirmed_free_user_classification;

  if v_total_candidates <> 44
    or v_legacy_snapshot_candidates <> 43
    or v_default_free_candidates <> 1
    or v_admin_candidates <> 0
    or v_ambiguous_candidates <> 0
    or v_non_free_candidates <> 0
    or v_missing_entitlement_candidates <> 0 then
    raise exception
      'backfill_confirmed_free_users aborted: expected total=44 legacy_snapshot=43 default_free=1 admin=0 ambiguous=0 non_free=0 missing=0, got total=% legacy_snapshot=% default_free=% admin=% ambiguous=% non_free=% missing=%',
      v_total_candidates,
      v_legacy_snapshot_candidates,
      v_default_free_candidates,
      v_admin_candidates,
      v_ambiguous_candidates,
      v_non_free_candidates,
      v_missing_entitlement_candidates;
  end if;

  update public.usuarios u
  set current_plan = 'free'
  from tmp_confirmed_free_user_classification c
  where u.id = c.user_id
    and u.current_plan = 'start_7'
    and coalesce(u.is_admin, false) = false
    and c.is_admin = false
    and c.classification in ('eligible_legacy_snapshot', 'eligible_default_free');

  get diagnostics v_updated_count = row_count;

  if v_updated_count <> 44 then
    raise exception
      'backfill_confirmed_free_users aborted: expected to update 44 rows, updated %',
      v_updated_count;
  end if;
end;
$$;
