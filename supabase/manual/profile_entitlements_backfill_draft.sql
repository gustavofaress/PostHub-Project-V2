-- RASCUNHO DE BACKFILL PARA profile_entitlements
-- NAO EXECUTAR SEM PREVIEW E APROVACAO EXPLICITA.
-- ESTE ARQUIVO NAO DEVE SER TRANSFORMADO EM MIGRATION AUTOMATICA SEM REVISAO.
--
-- CUTOFF CONGELADO E APROVADO. NAO ALTERAR SEM CRIAR UMA NOVA ESTRATEGIA DE MIGRACAO.
-- Primeiro backfill aprovado para esta estrategia:
--   FREE_CANDIDATE       = 43
--   LEGACY_PRO_CANDIDATE = 3
--   TOTAL                = 46
--
-- Regras desta versao:
--   1. Inserir apenas FREE e LEGACY_PRO.
--   2. Nao materializar ADMIN_REVIEW, REVIEW_REQUIRED, START, GROWTH ou CONFLICT.
--   3. Nao sobrescrever entitlements existentes.
--   4. Se a contagem esperada nao bater, o INSERT deve resultar em zero linhas.

-- PRE-CHECK OBRIGATORIO:
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
),
classified_profiles as (
  select
    pb.profile_id,
    pb.profile_created_at <= params.grandfathering_cutoff_utc as created_before_cutoff,
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
),
eligible_profiles as (
  select *
  from classified_profiles
  where created_before_cutoff = true
    and classification in ('FREE_CANDIDATE', 'LEGACY_PRO_CANDIDATE')
),
count_guard as (
  select
    count(*) filter (where classification = 'FREE_CANDIDATE') as actual_free_candidates,
    count(*) filter (where classification = 'LEGACY_PRO_CANDIDATE') as actual_legacy_pro_candidates,
    count(*) as actual_total_candidates
  from eligible_profiles
)
select
  actual_free_candidates,
  actual_legacy_pro_candidates,
  actual_total_candidates,
  43 as expected_free_candidates,
  3 as expected_legacy_pro_candidates,
  46 as expected_total_candidates,
  (
    actual_free_candidates = 43
    and actual_legacy_pro_candidates = 3
    and actual_total_candidates = 46
  ) as counts_match_expected
from count_guard;

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
    cp.created_at as profile_created_at,
    cp.subscription_id as profile_subscription_id_fk
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
),
classified_profiles as (
  select
    pb.profile_id,
    pb.profile_created_at <= params.grandfathering_cutoff_utc as created_before_cutoff,
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
),
eligible_profiles as (
  select *
  from classified_profiles
  where created_before_cutoff = true
    and classification in ('FREE_CANDIDATE', 'LEGACY_PRO_CANDIDATE')
),
count_guard as (
  select
    count(*) filter (where classification = 'FREE_CANDIDATE') as actual_free_candidates,
    count(*) filter (where classification = 'LEGACY_PRO_CANDIDATE') as actual_legacy_pro_candidates,
    count(*) as actual_total_candidates,
    (
      count(*) filter (where classification = 'FREE_CANDIDATE') = 43
      and count(*) filter (where classification = 'LEGACY_PRO_CANDIDATE') = 3
      and count(*) = 46
    ) as counts_match_expected
  from eligible_profiles
)
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
  cp.profile_id,
  case cp.classification
    when 'FREE_CANDIDATE' then 'free'
    when 'LEGACY_PRO_CANDIDATE' then 'legacy_pro'
  end as plan_code,
  'legacy_snapshot' as source,
  null as subscription_ref,
  params.grandfathering_cutoff_utc as effective_from,
  null as effective_until,
  true as calendar_enabled,
  true as kanban_enabled,
  case
    when cp.classification = 'LEGACY_PRO_CANDIDATE' then true
    else false
  end as references_enabled,
  case
    when cp.classification = 'LEGACY_PRO_CANDIDATE' then true
    else false
  end as metrics_enabled,
  case
    when cp.classification = 'LEGACY_PRO_CANDIDATE' then true
    else false
  end as social_analytics_enabled,
  case
    when cp.classification = 'LEGACY_PRO_CANDIDATE' then true
    else false
  end as approval_enabled,
  case
    when cp.classification = 'LEGACY_PRO_CANDIDATE' then true
    else false
  end as approval_link_creation_enabled,
  case
    when cp.classification = 'LEGACY_PRO_CANDIDATE' then null
    else 2
  end as max_additional_members
from eligible_profiles cp
cross join params
cross join count_guard cg
where cg.counts_match_expected = true
on conflict (profile_id) do nothing;
