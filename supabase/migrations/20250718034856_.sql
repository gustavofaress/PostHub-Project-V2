-- Remover a constraint CHECK existente
ALTER TABLE public.instagram_metrics DROP CONSTRAINT IF EXISTS instagram_metrics_content_type_check;

-- Recriar a constraint CHECK com mais valores permitidos, incluindo CAROUSEL_ALBUM
ALTER TABLE public.instagram_metrics 
ADD CONSTRAINT instagram_metrics_content_type_check 
CHECK (content_type = ANY (ARRAY[
    'reel'::text, 
    'story'::text, 
    'post'::text, 
    'carousel'::text,
    'CAROUSEL_ALBUM'::text,
    'IMAGE'::text,
    'VIDEO'::text,
    'REEL'::text
]));;
