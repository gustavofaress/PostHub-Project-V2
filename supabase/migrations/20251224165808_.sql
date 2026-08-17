-- Corrigir dados existentes com profile_views NULL
-- Definindo como 0 para métricas que vieram sem esse campo
UPDATE public.instagram_metrics 
SET profile_views = 0
WHERE profile_views IS NULL;

-- Também corrigir outros campos numéricos que podem estar NULL
UPDATE public.instagram_metrics 
SET 
  impressions = COALESCE(impressions, 0),
  reach = COALESCE(reach, 0),
  likes = COALESCE(likes, 0),
  comments = COALESCE(comments, 0),
  shares = COALESCE(shares, 0),
  saves = COALESCE(saves, 0),
  follows = COALESCE(follows, 0),
  unfollows = COALESCE(unfollows, 0),
  total_interactions = COALESCE(total_interactions, 0),
  accounts_engaged = COALESCE(accounts_engaged, 0),
  website_clicks = COALESCE(website_clicks, 0),
  profile_link_taps = COALESCE(profile_link_taps, 0)
WHERE 
  impressions IS NULL OR
  reach IS NULL OR
  likes IS NULL OR
  comments IS NULL OR
  shares IS NULL OR
  saves IS NULL OR
  follows IS NULL OR
  unfollows IS NULL OR
  total_interactions IS NULL OR
  accounts_engaged IS NULL OR
  website_clicks IS NULL OR
  profile_link_taps IS NULL;;
