-- Rename existing columns to match Make.com structure
ALTER TABLE public.instagram_metrics 
RENAME COLUMN "Media ID" TO id;

ALTER TABLE public.instagram_metrics 
RENAME COLUMN "Timestamp" TO date;

ALTER TABLE public.instagram_metrics 
RENAME COLUMN "Like count" TO likes;

ALTER TABLE public.instagram_metrics 
RENAME COLUMN "Comments count" TO comments;

-- Add new columns for Make.com integration
ALTER TABLE public.instagram_metrics 
ADD COLUMN total_interactions INTEGER,
ADD COLUMN accounts_engaged INTEGER,
ADD COLUMN saves INTEGER,
ADD COLUMN shares INTEGER,
ADD COLUMN follows INTEGER,
ADD COLUMN unfollows INTEGER,
ADD COLUMN profile_link_taps INTEGER,
ADD COLUMN website_clicks INTEGER,
ADD COLUMN profile_views INTEGER;

-- Update the data type of date column to ensure it's TIMESTAMP WITH TIME ZONE
ALTER TABLE public.instagram_metrics 
ALTER COLUMN date TYPE TIMESTAMP WITH TIME ZONE USING date::TIMESTAMP WITH TIME ZONE;;
