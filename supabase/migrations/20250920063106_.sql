-- Remover trigger e função na ordem correta
DROP TRIGGER IF EXISTS trg_set_instagram_metrics_customer_id ON public.instagram_metrics;
DROP TRIGGER IF EXISTS enforce_customer_id_trigger ON public.instagram_metrics;
DROP FUNCTION IF EXISTS public.enforce_instagram_metrics_customer_id() CASCADE;

-- Alterar a coluna customer_id para permitir NULL temporariamente
ALTER TABLE public.instagram_metrics 
ALTER COLUMN customer_id DROP DEFAULT,
ALTER COLUMN customer_id DROP NOT NULL;

-- Criar uma função que mapeia user_id (do Make) para customer_id (da PostHub)
CREATE OR REPLACE FUNCTION public.set_instagram_customer_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se customer_id já estiver definido, manter como está
  IF NEW.customer_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Se user_id estiver presente, tentar encontrar o customer_id correspondente na tabela usuarios
  IF NEW.user_id IS NOT NULL THEN
    -- Primeiro, tentar como UUID direto
    BEGIN
      SELECT id INTO NEW.customer_id 
      FROM public.usuarios 
      WHERE id::text = NEW.user_id 
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar, tentar outras formas de match
      NULL;
    END;
    
    -- Se não encontrar por ID, tentar por email se user_id for um email
    IF NEW.customer_id IS NULL AND NEW.user_id LIKE '%@%' THEN
      SELECT id INTO NEW.customer_id 
      FROM public.usuarios 
      WHERE email = NEW.user_id 
      LIMIT 1;
    END IF;
    
    -- Se ainda não encontrar, usar o primeiro admin disponível como fallback
    IF NEW.customer_id IS NULL THEN
      SELECT id INTO NEW.customer_id 
      FROM public.usuarios 
      WHERE is_admin = true 
      LIMIT 1;
    END IF;
  END IF;
  
  -- Se user_id estiver vazio mas temos auth.uid(), usar ele
  IF NEW.customer_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.customer_id := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar o trigger para executar antes de inserir ou atualizar
CREATE TRIGGER set_customer_id_trigger
  BEFORE INSERT OR UPDATE ON public.instagram_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_instagram_customer_id();

-- Atualizar registros existentes que não têm customer_id
UPDATE public.instagram_metrics 
SET customer_id = (
  SELECT u.id 
  FROM public.usuarios u 
  WHERE u.id::text = instagram_metrics.user_id 
  LIMIT 1
)
WHERE customer_id IS NULL;

-- Se ainda houver registros sem customer_id, associar ao primeiro admin
UPDATE public.instagram_metrics 
SET customer_id = (
  SELECT id 
  FROM public.usuarios 
  WHERE is_admin = true 
  LIMIT 1
)
WHERE customer_id IS NULL;

-- Agora tornar customer_id obrigatório novamente
ALTER TABLE public.instagram_metrics 
ALTER COLUMN customer_id SET NOT NULL;;
