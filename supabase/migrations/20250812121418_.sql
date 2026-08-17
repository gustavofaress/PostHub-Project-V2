-- Criar uma função que pode ser chamada pelo frontend para migrar as métricas
CREATE OR REPLACE FUNCTION public.migrate_all_metrics_to_user(target_user_id uuid)
RETURNS TABLE(
  youtube_updated bigint,
  instagram_updated bigint,
  target_user uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  youtube_count bigint;
  instagram_count bigint;
BEGIN
  -- Verificar se o user_id foi fornecido
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'ID do usuário é obrigatório';
  END IF;
  
  -- Atualizar todos os registros da tabela youtube_metrics
  UPDATE public.youtube_metrics 
  SET user_id = target_user_id;
  
  GET DIAGNOSTICS youtube_count = ROW_COUNT;
  
  -- Atualizar todos os registros da tabela instagram_metrics
  -- Convertendo UUID para TEXT já que esta tabela usa user_id como TEXT
  UPDATE public.instagram_metrics 
  SET user_id = target_user_id::text;
  
  GET DIAGNOSTICS instagram_count = ROW_COUNT;
  
  -- Retornar estatísticas da migração
  RETURN QUERY
  SELECT 
    youtube_count as youtube_updated,
    instagram_count as instagram_updated,
    target_user_id as target_user;
END;
$$;;
