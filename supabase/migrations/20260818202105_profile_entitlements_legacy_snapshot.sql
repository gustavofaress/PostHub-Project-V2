-- GRANDFATHERING CUTOFF CONGELADO.
-- NAO ALTERAR ESTE TIMESTAMP.
-- UMA ALTERACAO EXIGE NOVA ESTRATEGIA DE MIGRACAO.

do $$
declare
  v_snapshot_total bigint;
  v_free_candidates bigint;
  v_legacy_pro_candidates bigint;
  v_admin_review bigint;
  v_review_required bigint;
  v_conflict bigint;
  v_legacy_start_candidates bigint;
  v_legacy_growth_candidates bigint;
  v_existing_entitlements bigint;
  v_inserted_free bigint;
  v_inserted_legacy_pro bigint;
  v_post_free bigint;
  v_post_legacy_pro bigint;
  v_post_total bigint;
  v_post_unexpected bigint;
begin
  create temporary table profile_entitlements_legacy_snapshot_candidates
  on commit drop
  as
  with params as (
    select '2026-08-18T19:37:00Z'::timestamptz as grandfathering_cutoff_utc
  ),
  profile_base as (
    select
      cp.id as profile_id,
      cp.user_id as owner_user_id,
      u.email as owner_email,
      lower(trim(coalesce(u.current_plan, ''))) as owner_plan_normalized,
      coalesce(u.is_admin, false) as owner_is_admin,
      cp.created_at as profile_created_at
    from public.client_profiles cp
    left join public.usuarios u
      on u.id = cp.user_id
  ),
  subscription_rollup as (
    select
      ps.profile_id,
      count(*) as profile_subscription_rows,
      bool_or(coalesce(ps.kiwify_order_id, '') like 'admin_grant_%') as has_admin_grant_marker
    from public.profile_subscriptions ps
    where ps.profile_id is not null
    group by ps.profile_id
  ),
  subscription_via_fk as (
    select
      cp.id as profile_id,
      ps.id as subscription_id_via_fk,
      ps.user_id as subscription_user_id_via_fk,
      ps.profile_id as subscription_profile_id_via_fk
    from public.client_profiles cp
    left join public.profile_subscriptions ps
      on ps.id = cp.subscription_id
  )
  select
    pb.profile_id,
    case
      when pb.owner_user_id is null or pb.owner_email is null then 'REVIEW_REQUIRED'
      when pb.owner_is_admin then 'ADMIN_REVIEW'
      when pb.owner_plan_normalized in ('blocked', 'bloqueado', 'admin', 'pro_plus') then 'REVIEW_REQUIRED'
      when svf.subscription_id_via_fk is not null
           and (
             svf.subscription_profile_id_via_fk is distinct from pb.profile_id
             or svf.subscription_user_id_via_fk is distinct from pb.owner_user_id
           ) then 'CONFLICT'
      when coalesce(sr.has_admin_grant_marker, false) then 'CONFLICT'
      when coalesce(sr.profile_subscription_rows, 0) > 0
           and pb.owner_plan_normalized not in ('pro', 'growth', 'start', 'start_7', 'trial', 'teste') then 'CONFLICT'
      when coalesce(sr.profile_subscription_rows, 0) > 0
           and pb.owner_plan_normalized in ('start_7', 'trial', 'teste') then 'CONFLICT'
      when pb.owner_plan_normalized = 'pro' then 'LEGACY_PRO_CANDIDATE'
      when pb.owner_plan_normalized = 'growth' then 'LEGACY_GROWTH_CANDIDATE'
      when pb.owner_plan_normalized = 'start' then 'LEGACY_START_CANDIDATE'
      when pb.owner_plan_normalized in ('start_7', 'trial', 'teste') then 'FREE_CANDIDATE'
      else 'REVIEW_REQUIRED'
    end as classification
  from profile_base pb
  cross join params
  left join subscription_rollup sr
    on sr.profile_id = pb.profile_id
  left join subscription_via_fk svf
    on svf.profile_id = pb.profile_id
  where pb.profile_created_at <= params.grandfathering_cutoff_utc;

  select count(*) into v_snapshot_total
  from profile_entitlements_legacy_snapshot_candidates;

  select count(*) into v_free_candidates
  from profile_entitlements_legacy_snapshot_candidates
  where classification = 'FREE_CANDIDATE';

  select count(*) into v_legacy_pro_candidates
  from profile_entitlements_legacy_snapshot_candidates
  where classification = 'LEGACY_PRO_CANDIDATE';

  select count(*) into v_admin_review
  from profile_entitlements_legacy_snapshot_candidates
  where classification = 'ADMIN_REVIEW';

  select count(*) into v_review_required
  from profile_entitlements_legacy_snapshot_candidates
  where classification = 'REVIEW_REQUIRED';

  select count(*) into v_conflict
  from profile_entitlements_legacy_snapshot_candidates
  where classification = 'CONFLICT';

  select count(*) into v_legacy_start_candidates
  from profile_entitlements_legacy_snapshot_candidates
  where classification = 'LEGACY_START_CANDIDATE';

  select count(*) into v_legacy_growth_candidates
  from profile_entitlements_legacy_snapshot_candidates
  where classification = 'LEGACY_GROWTH_CANDIDATE';

  if v_snapshot_total <> 71
     or v_free_candidates <> 43
     or v_legacy_pro_candidates <> 3
     or v_admin_review <> 5
     or v_review_required <> 20
     or v_conflict <> 0
     or v_legacy_start_candidates <> 0
     or v_legacy_growth_candidates <> 0 then
    raise exception using
      message = format(
        'profile_entitlements_legacy_snapshot pre-check failed. Expected total=71, free=43, legacy_pro=3, admin_review=5, review_required=20, conflict=0, legacy_start=0, legacy_growth=0. Got total=%s, free=%s, legacy_pro=%s, admin_review=%s, review_required=%s, conflict=%s, legacy_start=%s, legacy_growth=%s.',
        v_snapshot_total,
        v_free_candidates,
        v_legacy_pro_candidates,
        v_admin_review,
        v_review_required,
        v_conflict,
        v_legacy_start_candidates,
        v_legacy_growth_candidates
      );
  end if;

  select count(*)
  into v_existing_entitlements
  from public.profile_entitlements pe
  join profile_entitlements_legacy_snapshot_candidates c
    on c.profile_id = pe.profile_id
  where c.classification in ('FREE_CANDIDATE', 'LEGACY_PRO_CANDIDATE');

  if v_existing_entitlements <> 0 then
    raise exception using
      message = format(
        'profile_entitlements_legacy_snapshot aborted: found %s existing profile_entitlements rows among the 46 eligible snapshot profiles.',
        v_existing_entitlements
      );
  end if;

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
  select
    c.profile_id,
    'free',
    'legacy_snapshot',
    null,
    '2026-08-18T19:37:00Z'::timestamptz,
    null,
    true,
    true,
    false,
    false,
    false,
    false,
    false,
    2
  from profile_entitlements_legacy_snapshot_candidates c
  where c.classification = 'FREE_CANDIDATE'
  on conflict (profile_id) do nothing;

  get diagnostics v_inserted_free = row_count;

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
  select
    c.profile_id,
    'legacy_pro',
    'legacy_snapshot',
    null,
    '2026-08-18T19:37:00Z'::timestamptz,
    null,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    null
  from profile_entitlements_legacy_snapshot_candidates c
  where c.classification = 'LEGACY_PRO_CANDIDATE'
  on conflict (profile_id) do nothing;

  get diagnostics v_inserted_legacy_pro = row_count;

  if v_inserted_free <> 43 or v_inserted_legacy_pro <> 3 then
    raise exception using
      message = format(
        'profile_entitlements_legacy_snapshot insert verification failed. Expected inserted_free=43 and inserted_legacy_pro=3. Got inserted_free=%s and inserted_legacy_pro=%s.',
        v_inserted_free,
        v_inserted_legacy_pro
      );
  end if;

  select count(*)
  into v_post_free
  from public.profile_entitlements
  where source = 'legacy_snapshot'
    and plan_code = 'free';

  select count(*)
  into v_post_legacy_pro
  from public.profile_entitlements
  where source = 'legacy_snapshot'
    and plan_code = 'legacy_pro';

  select count(*)
  into v_post_total
  from public.profile_entitlements
  where source = 'legacy_snapshot';

  select count(*)
  into v_post_unexpected
  from public.profile_entitlements
  where source = 'legacy_snapshot'
    and plan_code not in ('free', 'legacy_pro');

  if v_post_free <> 43
     or v_post_legacy_pro <> 3
     or v_post_total <> 46
     or v_post_unexpected <> 0 then
    raise exception using
      message = format(
        'profile_entitlements_legacy_snapshot post-check failed. Expected free=43, legacy_pro=3, total=46, unexpected=0. Got free=%s, legacy_pro=%s, total=%s, unexpected=%s.',
        v_post_free,
        v_post_legacy_pro,
        v_post_total,
        v_post_unexpected
      );
  end if;
end
$$;
