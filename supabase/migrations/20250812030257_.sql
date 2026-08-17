-- Vamos remover a função e triggers com CASCADE
DROP FUNCTION IF EXISTS update_instagram_metrics_updated_at() CASCADE;

-- Agora atualizamos o user_id existente para seu UUID
UPDATE instagram_metrics 
SET user_id = '17cabb6e-0b5e-4b43-800e-9ae17b0d0823' 
WHERE user_id = 'posthub.br';;
