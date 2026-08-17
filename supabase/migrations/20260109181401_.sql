-- Tabela para armazenar o progresso do onboarding do usuário
CREATE TABLE public.user_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id)
);

-- Habilitar RLS
ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own onboarding progress"
ON public.user_onboarding_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding progress"
ON public.user_onboarding_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own onboarding progress"
ON public.user_onboarding_progress
FOR DELETE
USING (auth.uid() = user_id);

-- Índice para performance
CREATE INDEX idx_user_onboarding_progress_user_id ON public.user_onboarding_progress(user_id);;
