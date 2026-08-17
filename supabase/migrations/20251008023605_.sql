-- Adicionar coluna para rastrear total de roteiros criados historicamente
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS total_scripts_created INTEGER DEFAULT 0;

-- Inicializar com a contagem atual de roteiros para cada usuário
UPDATE public.usuarios u
SET total_scripts_created = (
  SELECT COUNT(*) 
  FROM public.script_drafts sd 
  WHERE sd.user_id = u.id
);

-- Criar função para incrementar contador de roteiros criados
CREATE OR REPLACE FUNCTION public.increment_scripts_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Incrementar contador de roteiros criados do usuário
  UPDATE public.usuarios
  SET total_scripts_created = total_scripts_created + 1
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para incrementar contador automaticamente ao criar roteiro
DROP TRIGGER IF EXISTS increment_user_scripts_counter ON public.script_drafts;
CREATE TRIGGER increment_user_scripts_counter
  AFTER INSERT ON public.script_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_scripts_counter();;
