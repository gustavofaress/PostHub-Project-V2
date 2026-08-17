-- Remove a PRIMARY KEY atual se existir
ALTER TABLE public.instagram_metrics DROP CONSTRAINT IF EXISTS instagram_metrics_pkey;

-- Garante que o campo id é BIGINT para suportar valores grandes
ALTER TABLE public.instagram_metrics ALTER COLUMN id TYPE BIGINT USING id::bigint;

-- Cria a sequence se não existir
CREATE SEQUENCE IF NOT EXISTS instagram_metrics_id_seq OWNED BY public.instagram_metrics.id;

-- Configura o DEFAULT para usar a sequence
ALTER TABLE public.instagram_metrics ALTER COLUMN id SET DEFAULT nextval('instagram_metrics_id_seq');

-- Atualiza a sequence para o próximo valor disponível
SELECT setval('instagram_metrics_id_seq', COALESCE((SELECT MAX(id) FROM public.instagram_metrics), 0) + 1, false);

-- Adiciona a constraint de PRIMARY KEY
ALTER TABLE public.instagram_metrics ADD PRIMARY KEY (id);;
