-- Adicionar coluna is_favorite à tabela script_drafts
ALTER TABLE public.script_drafts 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_script_drafts_is_favorite 
ON public.script_drafts(user_id, is_favorite) 
WHERE is_favorite = true;;
