-- DIAGNOSTICO SOMENTE LEITURA PARA profiles ADMIN_REVIEW
-- CUTOFF CONGELADO E APROVADO. NAO ALTERAR SEM CRIAR UMA NOVA ESTRATEGIA DE MIGRACAO.
--
-- Objetivo:
--   listar os 5 profiles existentes ate o cutoff cujo owner esta marcado como ADMIN,
--   sem materializar entitlement comercial automaticamente.

with params as (
  select '2026-08-18T19:37:00Z'::timestamptz as grandfathering_cutoff_utc
),
profile_base as (
  select
    cp.id as profile_id,
    cp.profile_name,
    cp.user_id as owner_user_id,
    u.current_plan as owner_current_plan,
    lower(trim(coalesce(u.current_plan, ''))) as owner_plan_normalized,
    coalesce(u.is_admin, false) as owner_is_admin,
    cp.created_at as profile_created_at,
    cp.subscription_id as profile_subscription_id_fk
  from public.client_profiles cp
  left join public.usuarios u
    on u.id = cp.user_id
),
owned_profile_counts as (
  select
    cp.user_id as owner_user_id,
    count(*) as owner_owned_profiles_count
  from public.client_profiles cp
  group by cp.user_id
),
subscription_ranked as (
  select
    ps.*,
    row_number() over (
      partition by ps.profile_id
      order by
        case ps.status
          when 'linked' then 0
          when 'cancelled' then 1
          when 'expired' then 2
          when 'available' then 3
          else 9
        end,
        ps.updated_at desc nulls last,
        ps.created_at desc nulls last,
        ps.id desc
    ) as rn
  from public.profile_subscriptions ps
  where ps.profile_id is not null
),
subscription_primary as (
  select *
  from subscription_ranked
  where rn = 1
),
subscription_rollup as (
  select
    ps.profile_id,
    count(*) as profile_subscription_rows,
    array_agg(distinct ps.status order by ps.status) as profile_subscription_statuses,
    bool_or(ps.status = 'linked') as has_linked_subscription,
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
    ps.profile_id as subscription_profile_id_via_fk,
    ps.status as subscription_status_via_fk
  from public.client_profiles cp
  left join public.profile_subscriptions ps
    on ps.id = cp.subscription_id
)
select
  pb.profile_id,
  pb.profile_name,
  pb.owner_user_id,
  pb.owner_current_plan,
  pb.profile_created_at,
  pb.profile_subscription_id_fk,
  coalesce(svf.subscription_id_via_fk, sp.id) as resolved_subscription_id,
  coalesce(svf.subscription_status_via_fk, sp.status) as resolved_subscription_status,
  coalesce(sr.profile_subscription_rows, 0) as profile_subscription_rows,
  sr.profile_subscription_statuses,
  coalesce(sr.has_linked_subscription, false) as has_linked_subscription,
  coalesce(sr.has_admin_grant_marker, false) as has_admin_grant_marker,
  coalesce(opc.owner_owned_profiles_count, 0) as owner_owned_profiles_count,
  (
    svf.subscription_id_via_fk is not null
    and (
      svf.subscription_profile_id_via_fk is distinct from pb.profile_id
      or svf.subscription_user_id_via_fk is distinct from pb.owner_user_id
    )
  ) as has_subscription_fk_mismatch,
  case
    when pb.owner_plan_normalized = 'pro' then 'admin + owner_current_plan=pro'
    when pb.owner_plan_normalized in ('start_7', 'trial', 'teste') then 'admin + owner_current_plan trial/free'
    when pb.owner_plan_normalized = 'start' then 'admin + owner_current_plan=start'
    when pb.owner_plan_normalized = 'growth' then 'admin + owner_current_plan=growth'
    else 'admin + owner_current_plan nao previsto'
  end as admin_review_signal
from profile_base pb
cross join params
left join owned_profile_counts opc
  on opc.owner_user_id = pb.owner_user_id
left join subscription_rollup sr
  on sr.profile_id = pb.profile_id
left join subscription_primary sp
  on sp.profile_id = pb.profile_id
left join subscription_via_fk svf
  on svf.profile_id = pb.profile_id
where pb.owner_is_admin = true
  and pb.profile_created_at <= params.grandfathering_cutoff_utc
order by pb.profile_created_at, pb.profile_id;
