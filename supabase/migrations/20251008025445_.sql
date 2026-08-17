-- Adicionar coluna para rastrear total de posts criados historicamente
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS total_posts_created INTEGER DEFAULT 0;

-- Inicializar com a contagem atual de posts para cada usuário
UPDATE public.usuarios u
SET total_posts_created = (
  SELECT COUNT(*) 
  FROM public.editorial_calendar ec 
  WHERE ec.user_id = u.id
);

-- Criar função para incrementar contador de posts criados
CREATE OR REPLACE FUNCTION public.increment_posts_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Incrementar contador de posts criados do usuário
  UPDATE public.usuarios
  SET total_posts_created = total_posts_created + 1
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para incrementar contador automaticamente ao criar post
DROP TRIGGER IF EXISTS increment_user_posts_counter ON public.editorial_calendar;
CREATE TRIGGER increment_user_posts_counter
  AFTER INSERT ON public.editorial_calendar
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_posts_counter();;
