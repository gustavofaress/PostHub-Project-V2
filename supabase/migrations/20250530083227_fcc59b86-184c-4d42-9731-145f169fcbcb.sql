
-- Adicionar campo title na tabela performance_metrics
ALTER TABLE public.performance_metrics
ADD COLUMN title TEXT NOT NULL DEFAULT '';

-- Atualizar registros existentes que não têm título para terem um título baseado na plataforma e data
UPDATE public.performance_metrics 
SET title = CONCAT(INITCAP(platform), ' - ', TO_CHAR(date, 'DD/MM/YYYY'))
WHERE title = '' OR title IS NULL;
;
