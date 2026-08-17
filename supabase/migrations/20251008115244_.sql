-- Drop e recria a função set_instagram_customer_id sem o fallback de admin
DROP FUNCTION IF EXISTS public.set_instagram_customer_id() CASCADE;

CREATE OR REPLACE FUNCTION public.set_instagram_customer_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      NULL;
    END;
    
    -- Se não encontrar por ID, tentar por email se user_id for um email
    IF NEW.customer_id IS NULL AND NEW.user_id LIKE '%@%' THEN
      SELECT id INTO NEW.customer_id 
      FROM public.usuarios 
      WHERE email = NEW.user_id 
      LIMIT 1;
    END IF;
  END IF;
  
  -- Se user_id estiver vazio mas temos auth.uid(), usar ele
  IF NEW.customer_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.customer_id := auth.uid();
  END IF;
  
  -- REMOVIDO: Fallback perigoso de usar o primeiro admin
  -- Se ainda não temos customer_id, a inserção deve falhar
  IF NEW.customer_id IS NULL THEN
    RAISE EXCEPTION 'Não foi possível identificar o customer_id. O user_id fornecido (%) não corresponde a nenhum usuário.', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recria o trigger se não existir
DROP TRIGGER IF EXISTS set_instagram_customer_id_trigger ON public.instagram_metrics;
CREATE TRIGGER set_instagram_customer_id_trigger
  BEFORE INSERT ON public.instagram_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_instagram_customer_id();;
