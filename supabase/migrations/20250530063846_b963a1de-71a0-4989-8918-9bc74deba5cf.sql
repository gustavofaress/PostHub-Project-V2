
-- Criar tabela para métricas de performance
CREATE TABLE public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'facebook', 'linkedin')),
  traffic_type TEXT NOT NULL CHECK (traffic_type IN ('organico', 'pago')),
  date DATE NOT NULL,

  -- Métricas comuns
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  followers_growth INTEGER DEFAULT 0,
  engagement_rate DECIMAL(6,3) DEFAULT 0,
  cost_per_result DECIMAL(10,2), -- Aplicável somente para tráfego pago

  -- Métricas específicas (JSONB)
  platform_specific_metrics JSONB DEFAULT '{}',

  -- Observações estratégicas
  strategic_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row-Level Security (RLS)
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own performance metrics"
  ON public.performance_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own performance metrics"
  ON public.performance_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance metrics"
  ON public.performance_metrics
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own performance metrics"
  ON public.performance_metrics
  FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para otimização de consultas
CREATE INDEX idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_platform ON public.performance_metrics(platform);
CREATE INDEX idx_performance_metrics_traffic_type ON public.performance_metrics(traffic_type);
CREATE INDEX idx_performance_metrics_date ON public.performance_metrics(date);
CREATE INDEX idx_performance_metrics_user_platform_date ON public.performance_metrics(user_id, platform, date);

-- Trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_performance_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_performance_metrics_updated_at
  BEFORE UPDATE ON public.performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_performance_metrics_updated_at();
;
