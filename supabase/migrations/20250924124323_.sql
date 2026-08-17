-- Adicionar coluna lastMetricOn na tabela usuarios para controle de clique diário
ALTER TABLE public.usuarios 
ADD COLUMN last_metric_on date DEFAULT NULL;;
