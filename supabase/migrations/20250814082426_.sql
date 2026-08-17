-- Reestruturação da tabela instagram_metrics (corrigido)
-- 1. Primeiro, vamos criar uma nova tabela com a estrutura correta
CREATE TABLE IF NOT EXISTS public.instagram_metrics_new (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  likes INTEGER,
  comments INTEGER,
  total_interactions INTEGER,
  accounts_engaged INTEGER,
  saves INTEGER,
  shares INTEGER,
  follows INTEGER,
  unfollows INTEGER,
  profile_link_taps INTEGER,
  website_clicks INTEGER,
  profile_views INTEGER,
  impressions INTEGER,
  reach INTEGER,
  caption TEXT,
  permalink TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Migrar dados existentes da tabela antiga para a nova
-- Como não temos page_id nos dados existentes, vamos usar um valor padrão temporário
INSERT INTO public.instagram_metrics_new (
  user_id, page_id, date, likes, comments, total_interactions, 
  accounts_engaged, saves, shares, follows, unfollows, 
  profile_link_taps, website_clicks, profile_views, caption, permalink
)
SELECT 
  user_id, 
  'MIGRATION_PLACEHOLDER' as page_id, -- Placeholder para dados migrados
  date, likes, comments, total_interactions, 
  accounts_engaged, saves, shares, follows, unfollows, 
  profile_link_taps, website_clicks, profile_views, "Caption", "Permalink"
FROM public.instagram_metrics;

-- 3. Remover a tabela antiga
DROP TABLE public.instagram_metrics;

-- 4. Renomear a nova tabela
ALTER TABLE public.instagram_metrics_new RENAME TO instagram_metrics;

-- 5. Habilitar RLS na nova tabela
ALTER TABLE public.instagram_metrics ENABLE ROW LEVEL SECURITY;

-- 6. Recriar as políticas RLS
CREATE POLICY "Usuários podem ver apenas suas próprias métricas" 
ON public.instagram_metrics 
FOR SELECT 
USING (user_id = (auth.uid())::text);

CREATE POLICY "Usuários podem inserir apenas suas próprias métricas" 
ON public.instagram_metrics 
FOR INSERT 
WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Usuários podem atualizar apenas suas próprias métricas" 
ON public.instagram_metrics 
FOR UPDATE 
USING (user_id = (auth.uid())::text);

CREATE POLICY "Usuários podem deletar apenas suas próprias métricas" 
ON public.instagram_metrics 
FOR DELETE 
USING (user_id = (auth.uid())::text);

-- 7. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_instagram_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger para updated_at
CREATE TRIGGER update_instagram_metrics_updated_at
  BEFORE UPDATE ON public.instagram_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_instagram_metrics_updated_at();

-- 9. Criar índices para melhor performance
CREATE INDEX idx_instagram_metrics_user_id ON public.instagram_metrics(user_id);
CREATE INDEX idx_instagram_metrics_page_id ON public.instagram_metrics(page_id);
CREATE INDEX idx_instagram_metrics_date ON public.instagram_metrics(date);
CREATE INDEX idx_instagram_metrics_user_page ON public.instagram_metrics(user_id, page_id);;
