-- Adiciona as colunas necessárias à tabela instagram_metrics, se elas ainda não existirem
ALTER TABLE public.instagram_metrics
ADD COLUMN IF NOT EXISTS conta_id BIGINT,
ADD COLUMN IF NOT EXISTS data DATE,
ADD COLUMN IF NOT EXISTS alcance INTEGER,
ADD COLUMN IF NOT EXISTS impressoes INTEGER,
ADD COLUMN IF NOT EXISTS seguidores INTEGER;;
