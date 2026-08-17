-- Criação de índices otimizados para melhor performance (somente índices seguros)

-- Índices para performance_metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_date ON public.performance_metrics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_platform ON public.performance_metrics(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_traffic_type ON public.performance_metrics(user_id, traffic_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_composite ON public.performance_metrics(user_id, platform, traffic_type, date DESC);

-- Índices para manual_metrics
CREATE INDEX IF NOT EXISTS idx_manual_metrics_user_date ON public.manual_metrics(user_id, post_date DESC);
CREATE INDEX IF NOT EXISTS idx_manual_metrics_platform ON public.manual_metrics(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_manual_metrics_composite ON public.manual_metrics(user_id, platform, post_date DESC);

-- Índices para editorial_calendar
CREATE INDEX IF NOT EXISTS idx_editorial_calendar_user_date ON public.editorial_calendar(user_id, scheduled_date);

-- Análise de estatísticas para otimização automática do PostgreSQL
ANALYZE public.performance_metrics;
ANALYZE public.manual_metrics;
ANALYZE public.editorial_calendar;;
