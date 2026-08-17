
-- Primeiro, vamos remover a constraint existente que está causando problemas
ALTER TABLE public.editorial_calendar 
DROP CONSTRAINT IF EXISTS editorial_calendar_status_check;

-- Criar uma nova constraint que aceite todos os status válidos do sistema
ALTER TABLE public.editorial_calendar 
ADD CONSTRAINT editorial_calendar_status_check 
CHECK (status IN ('rascunho', 'em_producao', 'agendado', 'publicado', 'concluido'));

-- Verificar se algum registro existente precisa ser corrigido
UPDATE public.editorial_calendar 
SET status = 'rascunho' 
WHERE status NOT IN ('rascunho', 'em_producao', 'agendado', 'publicado', 'concluido');
;
