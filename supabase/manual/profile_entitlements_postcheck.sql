-- POST-CHECK DO PRIMEIRO BACKFILL DE profile_entitlements
-- SOMENTE LEITURA. EXECUTAR APOS O FUTURO INSERT MANUAL.
-- CUTOFF CONGELADO E APROVADO. NAO ALTERAR SEM CRIAR UMA NOVA ESTRATEGIA DE MIGRACAO.
--
-- Resultado esperado:
--   legacy_snapshot/free       = 43
--   legacy_snapshot/legacy_pro = 3
--   total legacy_snapshot      = 46
--   demais legacy_snapshot     = 0

with expected_counts as (
  select *
  from (
    values
      ('legacy_snapshot/free', 43),
      ('legacy_snapshot/legacy_pro', 3),
      ('legacy_snapshot_total', 46),
      ('legacy_snapshot_unexpected_rows', 0)
  ) as t(metric_name, expected_count)
),
actual_counts as (
  select
    'legacy_snapshot/free' as metric_name,
    count(*)::bigint as actual_count
  from public.profile_entitlements
  where source = 'legacy_snapshot'
    and plan_code = 'free'

  union all

  select
    'legacy_snapshot/legacy_pro' as metric_name,
    count(*)::bigint as actual_count
  from public.profile_entitlements
  where source = 'legacy_snapshot'
    and plan_code = 'legacy_pro'

  union all

  select
    'legacy_snapshot_total' as metric_name,
    count(*)::bigint as actual_count
  from public.profile_entitlements
  where source = 'legacy_snapshot'

  union all

  select
    'legacy_snapshot_unexpected_rows' as metric_name,
    count(*)::bigint as actual_count
  from public.profile_entitlements
  where source = 'legacy_snapshot'
    and plan_code not in ('free', 'legacy_pro')
)
select
  ec.metric_name,
  ec.expected_count,
  coalesce(ac.actual_count, 0) as actual_count,
  coalesce(ac.actual_count, 0) = ec.expected_count as matches_expected
from expected_counts ec
left join actual_counts ac
  on ac.metric_name = ec.metric_name
order by ec.metric_name;

select
  profile_id,
  plan_code,
  source,
  effective_from,
  effective_until,
  created_at,
  updated_at
from public.profile_entitlements
where source = 'legacy_snapshot'
  and plan_code not in ('free', 'legacy_pro')
order by created_at, profile_id;
