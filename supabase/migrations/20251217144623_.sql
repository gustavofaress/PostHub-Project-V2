-- Adicionar coluna profile_id às tabelas de dados principais

-- 1. script_drafts
ALTER TABLE public.script_drafts 
ADD COLUMN profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;

-- 2. ideas
ALTER TABLE public.ideas 
ADD COLUMN profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;

-- 3. calendar_tasks
ALTER TABLE public.calendar_tasks 
ADD COLUMN profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;

-- 4. editorial_calendar
ALTER TABLE public.editorial_calendar 
ADD COLUMN profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;

-- 5. scheduled_posts
ALTER TABLE public.scheduled_posts 
ADD COLUMN profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;

-- 6. manual_metrics
ALTER TABLE public.manual_metrics 
ADD COLUMN profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;

-- Criar índices para performance
CREATE INDEX idx_script_drafts_profile_id ON public.script_drafts(profile_id);
CREATE INDEX idx_ideas_profile_id ON public.ideas(profile_id);
CREATE INDEX idx_calendar_tasks_profile_id ON public.calendar_tasks(profile_id);
CREATE INDEX idx_editorial_calendar_profile_id ON public.editorial_calendar(profile_id);
CREATE INDEX idx_scheduled_posts_profile_id ON public.scheduled_posts(profile_id);
CREATE INDEX idx_manual_metrics_profile_id ON public.manual_metrics(profile_id);

-- Função para obter o perfil padrão do usuário
CREATE OR REPLACE FUNCTION public.get_user_default_profile_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.client_profiles 
  WHERE user_id = p_user_id AND is_default = true
  LIMIT 1;
$$;

-- Migrar dados existentes para o perfil padrão de cada usuário
UPDATE public.script_drafts sd
SET profile_id = public.get_user_default_profile_id(sd.user_id)
WHERE sd.profile_id IS NULL;

UPDATE public.ideas i
SET profile_id = public.get_user_default_profile_id(i.user_id)
WHERE i.profile_id IS NULL;

UPDATE public.calendar_tasks ct
SET profile_id = public.get_user_default_profile_id(ct.user_id)
WHERE ct.profile_id IS NULL;

UPDATE public.editorial_calendar ec
SET profile_id = public.get_user_default_profile_id(ec.user_id)
WHERE ec.profile_id IS NULL;

UPDATE public.scheduled_posts sp
SET profile_id = public.get_user_default_profile_id(sp.user_id)
WHERE sp.profile_id IS NULL;

UPDATE public.manual_metrics mm
SET profile_id = public.get_user_default_profile_id(mm.user_id)
WHERE mm.profile_id IS NULL;;
