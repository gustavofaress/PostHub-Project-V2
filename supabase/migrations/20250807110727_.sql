-- Remover a chave primária atual (id)
ALTER TABLE public.instagram_metrics DROP CONSTRAINT IF EXISTS instagram_metrics_pkey;

-- Remover apenas as colunas desnecessárias (mantendo user_id)
ALTER TABLE public.instagram_metrics 
DROP COLUMN IF EXISTS id,
DROP COLUMN IF EXISTS title,
DROP COLUMN IF EXISTS content_type,
DROP COLUMN IF EXISTS platform,
DROP COLUMN IF EXISTS post_date,
DROP COLUMN IF EXISTS post_link,
DROP COLUMN IF EXISTS likes,
DROP COLUMN IF EXISTS comments,
DROP COLUMN IF EXISTS shares,
DROP COLUMN IF EXISTS saves,
DROP COLUMN IF EXISTS views,
DROP COLUMN IF EXISTS reach,
DROP COLUMN IF EXISTS impressions,
DROP COLUMN IF EXISTS clicks,
DROP COLUMN IF EXISTS reactions,
DROP COLUMN IF EXISTS subscribers_gained,
DROP COLUMN IF EXISTS watch_time_seconds,
DROP COLUMN IF EXISTS avg_watch_time_seconds,
DROP COLUMN IF EXISTS completion_rate_percentage,
DROP COLUMN IF EXISTS engagement_percentage,
DROP COLUMN IF EXISTS ctr_percentage,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at;

-- Adicionar as novas colunas com os nomes exatos do Make.com
ALTER TABLE public.instagram_metrics 
ADD COLUMN "Media ID" TEXT,
ADD COLUMN "Like count" INTEGER,
ADD COLUMN "Comments count" INTEGER,
ADD COLUMN "Caption" TEXT,
ADD COLUMN "Timestamp" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "Permalink" TEXT;

-- Definir "Media ID" como a nova chave primária
ALTER TABLE public.instagram_metrics ADD CONSTRAINT instagram_metrics_pkey PRIMARY KEY ("Media ID");;
