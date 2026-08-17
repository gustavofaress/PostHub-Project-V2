-- Atualizar métricas do Instagram que têm page_id mas profile_id NULL
-- Usando o mapeamento da tabela contas_instagram
UPDATE instagram_metrics im
SET profile_id = ci.profile_id
FROM contas_instagram ci
WHERE im.page_id = ci.page_id
  AND im.customer_id = ci.customer_id
  AND im.profile_id IS NULL
  AND ci.profile_id IS NOT NULL;;
