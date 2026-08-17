-- Migrar métricas existentes para o perfil default de cada usuário
UPDATE instagram_metrics im
SET profile_id = (
  SELECT cp.id 
  FROM client_profiles cp 
  WHERE cp.user_id = im.customer_id 
  AND cp.is_default = true 
  LIMIT 1
)
WHERE im.profile_id IS NULL;;
