
-- 1. Habilitar RLS na tabela manual_metrics
ALTER TABLE public.manual_metrics ENABLE ROW LEVEL SECURITY;

-- 2. Criar políticas de segurança para manual_metrics
-- SELECT: Apenas o usuário dono pode ver suas métricas
CREATE POLICY "Users can view their own manual metrics" 
  ON public.manual_metrics 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT: Usuários autenticados podem inserir apenas com seu próprio user_id
CREATE POLICY "Users can insert their own manual metrics" 
  ON public.manual_metrics 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuários podem atualizar apenas suas próprias métricas
CREATE POLICY "Users can update their own manual metrics" 
  ON public.manual_metrics 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- DELETE: Usuários podem deletar apenas suas próprias métricas
CREATE POLICY "Users can delete their own manual metrics" 
  ON public.manual_metrics 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 3. Criar constraint para validar plataformas
ALTER TABLE public.manual_metrics 
ADD CONSTRAINT valid_platform 
CHECK (platform IN ('instagram', 'youtube', 'linkedin', 'tiktok', 'twitter', 'facebook'));

-- 4. Tornar campos obrigatórios (remover NULL onde necessário)
ALTER TABLE public.manual_metrics 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN platform SET NOT NULL,
ALTER COLUMN title SET NOT NULL,
ALTER COLUMN post_date SET NOT NULL;

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_manual_metrics_user_id ON public.manual_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_metrics_platform ON public.manual_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_manual_metrics_post_date ON public.manual_metrics(post_date DESC);
CREATE INDEX IF NOT EXISTS idx_manual_metrics_user_platform ON public.manual_metrics(user_id, platform);

-- 6. Habilitar realtime para a tabela manual_metrics
ALTER TABLE public.manual_metrics REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_metrics;
;
