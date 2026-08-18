-- PREVIEW DE GRANDFATHERING PARA profile_entitlements
-- SOMENTE LEITURA. NAO EXECUTAR QUALQUER ESCRITA A PARTIR DESTE ARQUIVO.
-- CUTOFF CONGELADO E APROVADO. NAO ALTERAR SEM CRIAR UMA NOVA ESTRATEGIA DE MIGRACAO.
--
-- Snapshot aprovado externamente para este cutoff:
--   FREE_CANDIDATE         = 43
--   LEGACY_PRO_CANDIDATE   = 3
--   ADMIN_REVIEW           = 5
--   REVIEW_REQUIRED        = 20
--   LEGACY_START_CANDIDATE = 0
--   LEGACY_GROWTH_CANDIDATE= 0
--   CONFLICT               = 0

with params as (
  select '2026-08-18T19:37:00Z'::timestamptz as grandfathering_cutoff_utc
),
profile_base as (
  select
    cp.id as profile_id,
    cp.profile_name,
    cp.user_id as owner_user_id,
    u.email as owner_email,
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
profile_purchase_credit_rollup as (
  select
    ppc.user_id as owner_user_id,
    coalesce(sum(ppc.quantity), 0) as owner_total_profile_purchase_credits
  from public.profile_purchase_credits ppc
  group by ppc.user_id
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
    bool_or(coalesce(ps.kiwify_order_id, '') like 'admin_grant_%') as has_admin_grant_marker,
    bool_or(
      ps.kiwify_order_id is not null
      or ps.kiwify_subscription_id is not null
      or ps.kiwify_customer_email is not null
    ) as has_kiwify_data
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
),
classified_profiles as (
  select
    pb.profile_id,
    pb.profile_name,
    pb.owner_user_id,
    pb.owner_email,
    pb.owner_current_plan,
    pb.owner_is_admin,
    pb.profile_created_at,
    pb.profile_created_at <= params.grandfathering_cutoff_utc as created_before_cutoff,
    coalesce(svf.subscription_id_via_fk, sp.id) as profile_subscription_id,
    coalesce(svf.subscription_status_via_fk, sp.status) as profile_subscription_status,
    sr.profile_subscription_rows,
    sr.profile_subscription_statuses,
    coalesce(sr.has_linked_subscription, false) as has_linked_subscription,
    coalesce(sr.has_admin_grant_marker, false) as has_admin_grant_marker,
    coalesce(sr.has_kiwify_data, false) as has_kiwify_data,
    svf.subscription_user_id_via_fk,
    svf.subscription_profile_id_via_fk,
    coalesce(ppc.owner_total_profile_purchase_credits, 0) as owner_total_profile_purchase_credits,
    coalesce(opc.owner_owned_profiles_count, 0) as owner_owned_profiles_count,
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
    end as classification,
    case
      when svf.subscription_id_via_fk is not null
           and (
             svf.subscription_profile_id_via_fk is distinct from pb.profile_id
             or svf.subscription_user_id_via_fk is distinct from pb.owner_user_id
           ) then 'CONFLICT'
      when coalesce(sr.has_admin_grant_marker, false) then 'CONFLICT'
      when coalesce(sr.profile_subscription_rows, 0) = 0
           and svf.subscription_id_via_fk is null then 'LEGACY_ONLY'
      when coalesce(sr.profile_subscription_rows, 0) > 0
           and pb.owner_plan_normalized in ('pro', 'growth', 'start') then 'CONSISTENT'
      when coalesce(sr.profile_subscription_rows, 0) > 0 then 'SUBSCRIPTION_ONLY'
      else 'REVIEW_REQUIRED'
    end as consistency,
    case
      when pb.owner_user_id is null or pb.owner_email is null then 'owner ausente na tabela usuarios'
      when pb.owner_is_admin then 'owner marcado como ADMIN; fora do auto-backfill'
      when pb.owner_plan_normalized in ('blocked', 'bloqueado') then 'owner bloqueado; exige revisao manual'
      when pb.owner_plan_normalized = 'pro_plus' then 'estado legado pro_plus encontrado; nao classificar silenciosamente'
      when svf.subscription_id_via_fk is not null
           and svf.subscription_profile_id_via_fk is distinct from pb.profile_id
        then 'client_profiles.subscription_id aponta para outro profile'
      when svf.subscription_id_via_fk is not null
           and svf.subscription_user_id_via_fk is distinct from pb.owner_user_id
        then 'subscription vinculada a outro owner_user_id'
      when coalesce(sr.has_admin_grant_marker, false)
        then 'subscription com marcador admin_grant encontrada; revisar manualmente'
      when pb.owner_plan_normalized in ('start_7', 'trial', 'teste')
           and coalesce(sr.profile_subscription_rows, 0) > 0
        then 'trial/free no owner, mas profile possui ledger de assinatura'
      when pb.owner_plan_normalized = 'pro' then 'owner current_plan=pro; candidato a legacy_pro'
      when pb.owner_plan_normalized = 'growth' then 'owner current_plan=growth; candidato a legacy_growth'
      when pb.owner_plan_normalized = 'start' then 'owner current_plan=start; candidato a legacy_start'
      when pb.owner_plan_normalized in ('start_7', 'trial', 'teste')
        then 'owner trial comprovado no runtime atual; candidato a free'
      else 'sem sinal comercial suficiente; revisar'
    end as motivo
  from profile_base pb
  cross join params
  left join owned_profile_counts opc
    on opc.owner_user_id = pb.owner_user_id
  left join profile_purchase_credit_rollup ppc
    on ppc.owner_user_id = pb.owner_user_id
  left join subscription_rollup sr
    on sr.profile_id = pb.profile_id
  left join subscription_primary sp
    on sp.profile_id = pb.profile_id
  left join subscription_via_fk svf
    on svf.profile_id = pb.profile_id
)
select
  profile_id,
  profile_name,
  owner_user_id,
  owner_email,
  owner_current_plan,
  owner_is_admin,
  profile_created_at,
  created_before_cutoff,
  profile_subscription_id,
  profile_subscription_status,
  profile_subscription_rows,
  profile_subscription_statuses,
  has_linked_subscription,
  has_admin_grant_marker,
  has_kiwify_data,
  subscription_user_id_via_fk,
  subscription_profile_id_via_fk,
  owner_total_profile_purchase_credits,
  owner_owned_profiles_count,
  classification,
  consistency,
  motivo
from classified_profiles
order by
  classification,
  owner_email nulls last,
  profile_created_at,
  profile_id;

-- RESUMO PARA SNAPSHOT:
-- considera apenas profiles criados ate o cutoff aprovado.
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
actual_counts as (
  select
    classification,
    count(*) as total_profiles
  from classified_profiles
  where created_before_cutoff = true
  group by classification
),
expected_counts as (
  select *
  from (
    values
      ('ADMIN_REVIEW', 5),
      ('CONFLICT', 0),
      ('FREE_CANDIDATE', 43),
      ('LEGACY_GROWTH_CANDIDATE', 0),
      ('LEGACY_PRO_CANDIDATE', 3),
      ('LEGACY_START_CANDIDATE', 0),
      ('REVIEW_REQUIRED', 20)
  ) as t(classification, expected_profiles)
)
select
  ec.classification,
  ec.expected_profiles,
  coalesce(ac.total_profiles, 0) as actual_profiles,
  coalesce(ac.total_profiles, 0) = ec.expected_profiles as matches_approved_snapshot
from expected_counts ec
left join actual_counts ac
  on ac.classification = ec.classification
order by ec.classification;
