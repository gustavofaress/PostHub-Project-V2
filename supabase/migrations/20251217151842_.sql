-- Atualizar métricas existentes para associar ao perfil padrão do usuário
UPDATE public.instagram_metrics im
SET profile_id = (
  SELECT cp.id 
  FROM public.client_profiles cp 
  WHERE cp.user_id = im.customer_id 
  AND cp.is_default = true
  LIMIT 1
)
WHERE im.profile_id IS NULL;;
