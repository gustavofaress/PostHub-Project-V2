-- DIAGNOSTICO SOMENTE LEITURA PARA profiles cujo owner existe em auth.users
-- mas nao possui row correspondente em public.usuarios.
-- CUTOFF CONGELADO E APROVADO. NAO ALTERAR SEM CRIAR UMA NOVA ESTRATEGIA DE MIGRACAO.
--
-- Objetivo:
--   detalhar os 20 profiles classificados como REVIEW_REQUIRED no snapshot aprovado,
--   sem corrigir, mover ou criar qualquer dado.

with params as (
  select '2026-08-18T19:37:00Z'::timestamptz as grandfathering_cutoff_utc
),
profile_base as (
  select
    cp.id as profile_id,
    cp.profile_name,
    cp.user_id as owner_user_id,
    cp.created_at as profile_created_at,
    cp.subscription_id as profile_subscription_id_fk,
    au.created_at as auth_user_created_at,
    au.last_sign_in_at as auth_last_sign_in_at,
    case
      when lower(coalesce(au.raw_user_meta_data ->> 'workspace_member', '')) in ('true', 't', '1')
        then true
      when lower(coalesce(au.raw_user_meta_data ->> 'workspace_member', '')) in ('false', 'f', '0', '')
        then false
      else null
    end as workspace_member_metadata,
    u.id as usuarios_row_id
  from public.client_profiles cp
  left join auth.users au
    on au.id = cp.user_id
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
membership_rollup as (
  select
    wm.user_id,
    count(*) as workspace_membership_rows,
    count(*) filter (where wm.status = 'active') as active_workspace_membership_rows,
    count(*) filter (where wm.status = 'invited') as invited_workspace_membership_rows,
    count(*) filter (where wm.status = 'disabled') as disabled_workspace_membership_rows,
    array_agg(distinct wm.status order by wm.status) as workspace_membership_statuses
  from public.workspace_members wm
  group by wm.user_id
),
profile_member_rollup as (
  select
    wm.profile_id,
    count(*) as profile_workspace_member_rows,
    count(*) filter (where wm.status = 'active') as profile_active_workspace_member_rows,
    count(*) filter (where wm.status = 'invited') as profile_invited_workspace_member_rows,
    count(*) filter (where wm.status = 'disabled') as profile_disabled_workspace_member_rows
  from public.workspace_members wm
  group by wm.profile_id
),
subscription_rollup as (
  select
    ps.profile_id,
    count(*) as profile_subscription_rows,
    array_agg(distinct ps.status order by ps.status) as profile_subscription_statuses,
    bool_or(ps.status = 'linked') as has_linked_subscription
  from public.profile_subscriptions ps
  where ps.profile_id is not null
  group by ps.profile_id
),
profile_purchase_credit_rollup as (
  select
    ppc.user_id as owner_user_id,
    coalesce(sum(ppc.quantity), 0) as owner_total_profile_purchase_credits
  from public.profile_purchase_credits ppc
  group by ppc.user_id
),
editorial_calendar_rollup as (
  select
    ec.profile_id,
    count(*) as editorial_calendar_rows
  from public.editorial_calendar ec
  group by ec.profile_id
),
reference_items_rollup as (
  select
    ri.profile_id,
    count(*) as reference_items_rows
  from public.reference_items ri
  group by ri.profile_id
),
approval_links_rollup as (
  select
    cal.profile_id,
    count(*) as approval_links_rows
  from public.calendar_approval_links cal
  group by cal.profile_id
),
approval_posts_rollup as (
  select
    cpa.profile_id,
    count(*) as approval_posts_rows
  from public.calendar_post_approvals cpa
  group by cpa.profile_id
),
approval_feedback_rollup as (
  select
    caf.profile_id,
    count(*) as approval_feedback_rows
  from public.calendar_approval_feedback caf
  group by caf.profile_id
),
social_connections_rollup as (
  select
    sc.profile_id,
    count(*) as social_connections_rows
  from public.social_connections sc
  group by sc.profile_id
),
social_account_metrics_rollup as (
  select
    sam.profile_id,
    count(*) as social_account_metrics_rows
  from public.social_account_metrics sam
  group by sam.profile_id
),
social_sync_runs_rollup as (
  select
    ssr.profile_id,
    count(*) as social_sync_runs_rows
  from public.social_sync_runs ssr
  group by ssr.profile_id
)
select
  pb.profile_id,
  pb.profile_name,
  pb.owner_user_id,
  pb.auth_user_created_at,
  pb.auth_last_sign_in_at,
  pb.profile_created_at,
  pb.profile_subscription_id_fk,
  pb.workspace_member_metadata,
  coalesce(opc.owner_owned_profiles_count, 0) as owner_owned_profiles_count,
  greatest(coalesce(opc.owner_owned_profiles_count, 0) - 1, 0) as other_owned_profiles_count,
  coalesce(mr.workspace_membership_rows, 0) as workspace_membership_rows,
  coalesce(mr.active_workspace_membership_rows, 0) as active_workspace_membership_rows,
  coalesce(mr.invited_workspace_membership_rows, 0) as invited_workspace_membership_rows,
  coalesce(mr.disabled_workspace_membership_rows, 0) as disabled_workspace_membership_rows,
  mr.workspace_membership_statuses,
  coalesce(pmr.profile_workspace_member_rows, 0) as profile_workspace_member_rows,
  coalesce(pmr.profile_active_workspace_member_rows, 0) as profile_active_workspace_member_rows,
  coalesce(pmr.profile_invited_workspace_member_rows, 0) as profile_invited_workspace_member_rows,
  coalesce(pmr.profile_disabled_workspace_member_rows, 0) as profile_disabled_workspace_member_rows,
  coalesce(sr.profile_subscription_rows, 0) as profile_subscription_rows,
  sr.profile_subscription_statuses,
  coalesce(sr.has_linked_subscription, false) as has_linked_subscription,
  coalesce(ppc.owner_total_profile_purchase_credits, 0) as owner_total_profile_purchase_credits,
  coalesce(ecr.editorial_calendar_rows, 0) as editorial_calendar_rows,
  coalesce(rir.reference_items_rows, 0) as reference_items_rows,
  coalesce(alr.approval_links_rows, 0) as approval_links_rows,
  coalesce(apr.approval_posts_rows, 0) as approval_posts_rows,
  coalesce(afr.approval_feedback_rows, 0) as approval_feedback_rows,
  coalesce(scr.social_connections_rows, 0) as social_connections_rows,
  coalesce(samr.social_account_metrics_rows, 0) as social_account_metrics_rows,
  coalesce(ssrr.social_sync_runs_rows, 0) as social_sync_runs_rows,
  (
    coalesce(ecr.editorial_calendar_rows, 0)
    + coalesce(rir.reference_items_rows, 0)
    + coalesce(alr.approval_links_rows, 0)
    + coalesce(apr.approval_posts_rows, 0)
    + coalesce(afr.approval_feedback_rows, 0)
    + coalesce(scr.social_connections_rows, 0)
    + coalesce(samr.social_account_metrics_rows, 0)
    + coalesce(ssrr.social_sync_runs_rows, 0)
  ) as total_core_module_rows,
  case
    when pb.auth_last_sign_in_at is null
         and coalesce(mr.workspace_membership_rows, 0) = 0
         and (
           coalesce(ecr.editorial_calendar_rows, 0)
           + coalesce(rir.reference_items_rows, 0)
           + coalesce(alr.approval_links_rows, 0)
           + coalesce(apr.approval_posts_rows, 0)
           + coalesce(afr.approval_feedback_rows, 0)
           + coalesce(scr.social_connections_rows, 0)
           + coalesce(samr.social_account_metrics_rows, 0)
           + coalesce(ssrr.social_sync_runs_rows, 0)
         ) = 0
        then 'forte_sinal_de_conta_abandonada'
    when pb.workspace_member_metadata = true
        then 'conta_marcada_como_workspace_member_no_auth_metadata'
    when coalesce(mr.workspace_membership_rows, 0) > 0
        then 'usuario_tem_memberships_mesmo_sem_row_em_usuarios'
    when (
           coalesce(ecr.editorial_calendar_rows, 0)
           + coalesce(rir.reference_items_rows, 0)
           + coalesce(alr.approval_links_rows, 0)
           + coalesce(apr.approval_posts_rows, 0)
           + coalesce(afr.approval_feedback_rows, 0)
           + coalesce(scr.social_connections_rows, 0)
           + coalesce(samr.social_account_metrics_rows, 0)
           + coalesce(ssrr.social_sync_runs_rows, 0)
         ) > 0
        then 'profile_tem_dados_e_precisa_de_revisao_cuidadosa'
    else 'owner_sem_row_em_usuarios_e_sem_sinal_comercial_confiavel'
  end as orphan_review_signal
from profile_base pb
cross join params
left join owned_profile_counts opc
  on opc.owner_user_id = pb.owner_user_id
left join membership_rollup mr
  on mr.user_id = pb.owner_user_id
left join profile_member_rollup pmr
  on pmr.profile_id = pb.profile_id
left join subscription_rollup sr
  on sr.profile_id = pb.profile_id
left join profile_purchase_credit_rollup ppc
  on ppc.owner_user_id = pb.owner_user_id
left join editorial_calendar_rollup ecr
  on ecr.profile_id = pb.profile_id
left join reference_items_rollup rir
  on rir.profile_id = pb.profile_id
left join approval_links_rollup alr
  on alr.profile_id = pb.profile_id
left join approval_posts_rollup apr
  on apr.profile_id = pb.profile_id
left join approval_feedback_rollup afr
  on afr.profile_id = pb.profile_id
left join social_connections_rollup scr
  on scr.profile_id = pb.profile_id
left join social_account_metrics_rollup samr
  on samr.profile_id = pb.profile_id
left join social_sync_runs_rollup ssrr
  on ssrr.profile_id = pb.profile_id
where pb.usuarios_row_id is null
  and pb.owner_user_id is not null
  and pb.auth_user_created_at is not null
  and pb.profile_created_at <= params.grandfathering_cutoff_utc
order by pb.profile_created_at, pb.profile_id;
