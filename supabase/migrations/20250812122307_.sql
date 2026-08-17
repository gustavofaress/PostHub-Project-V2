-- Transferir registros de métricas para o usuário contatogustavofares@gmail.com
-- Executado de forma segura com transação

BEGIN;

-- Criar função para transferir registros com segurança
CREATE OR REPLACE FUNCTION public.transfer_metrics_to_gustavo()
RETURNS TABLE(
  youtube_transferred bigint,
  instagram_transferred bigint,
  source_user_id uuid,
  target_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  source_user uuid := '17cabb6e-0b5e-4b43-800e-9ae17b0d0823';
  target_user uuid := '619b9808-b536-4846-b71e-83480d571065';
  youtube_count bigint;
  instagram_count bigint;
BEGIN
  -- Verificar se os usuários existem
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = source_user) THEN
    RAISE EXCEPTION 'Usuário de origem não encontrado: %', source_user;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = target_user) THEN
    RAISE EXCEPTION 'Usuário de destino não encontrado: %', target_user;
  END IF;
  
  -- Transferir registros da youtube_metrics
  UPDATE public.youtube_metrics 
  SET user_id = target_user
  WHERE user_id = source_user;
  
  GET DIAGNOSTICS youtube_count = ROW_COUNT;
  
  -- Transferir registros da instagram_metrics (user_id é TEXT nesta tabela)
  UPDATE public.instagram_metrics 
  SET user_id = target_user::text
  WHERE user_id = source_user::text;
  
  GET DIAGNOSTICS instagram_count = ROW_COUNT;
  
  -- Retornar estatísticas da transferência
  RETURN QUERY
  SELECT 
    youtube_count as youtube_transferred,
    instagram_count as instagram_transferred,
    source_user as source_user_id,
    target_user as target_user_id;
END;
$$;

-- Executar a transferência
SELECT * FROM public.transfer_metrics_to_gustavo();

-- Limpar a função após uso
DROP FUNCTION IF EXISTS public.transfer_metrics_to_gustavo();

COMMIT;;
