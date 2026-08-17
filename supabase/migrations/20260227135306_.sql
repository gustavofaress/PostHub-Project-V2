
-- Tabela unificada de rastreamento de uso de IA
CREATE TABLE public.ai_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  feature text NOT NULL CHECK (feature IN ('script_generate', 'script_quick', 'consultant')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índice para consultas rápidas por usuário e feature
CREATE INDEX idx_ai_usage_user_feature ON public.ai_usage (user_id, feature);

-- Habilitar RLS
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios registros
CREATE POLICY "Users can view their own ai usage"
ON public.ai_usage FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem inserir seus próprios registros
CREATE POLICY "Users can insert their own ai usage"
ON public.ai_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role acesso total
CREATE POLICY "Service role full access to ai_usage"
ON public.ai_usage FOR ALL
USING (current_setting('role'::text) = 'service_role'::text)
WITH CHECK (current_setting('role'::text) = 'service_role'::text);
;
