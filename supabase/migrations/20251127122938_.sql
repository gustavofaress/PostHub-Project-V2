-- Create linkedin_metrics table
CREATE TABLE public.linkedin_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  company_page_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  post_type TEXT,
  permalink TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tiktok_metrics table
CREATE TABLE public.tiktok_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  tiktok_account_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0,
  completion_rate NUMERIC DEFAULT 0,
  permalink TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create twitter_metrics table
CREATE TABLE public.twitter_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  twitter_account_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  permalink TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pinterest_metrics table
CREATE TABLE public.pinterest_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  pinterest_account_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  impressions INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  outbound_clicks INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  closeups INTEGER DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  permalink TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create facebook_metrics table
CREATE TABLE public.facebook_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  post_type TEXT,
  permalink TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.linkedin_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twitter_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinterest_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_metrics ENABLE ROW LEVEL SECURITY;

-- LinkedIn RLS Policies
CREATE POLICY "Users can view their own linkedin metrics" ON public.linkedin_metrics FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Users can insert their own linkedin metrics" ON public.linkedin_metrics FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Users can update their own linkedin metrics" ON public.linkedin_metrics FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "Users can delete their own linkedin metrics" ON public.linkedin_metrics FOR DELETE USING (customer_id = auth.uid());

-- TikTok RLS Policies
CREATE POLICY "Users can view their own tiktok metrics" ON public.tiktok_metrics FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Users can insert their own tiktok metrics" ON public.tiktok_metrics FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Users can update their own tiktok metrics" ON public.tiktok_metrics FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "Users can delete their own tiktok metrics" ON public.tiktok_metrics FOR DELETE USING (customer_id = auth.uid());

-- Twitter RLS Policies
CREATE POLICY "Users can view their own twitter metrics" ON public.twitter_metrics FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Users can insert their own twitter metrics" ON public.twitter_metrics FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Users can update their own twitter metrics" ON public.twitter_metrics FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "Users can delete their own twitter metrics" ON public.twitter_metrics FOR DELETE USING (customer_id = auth.uid());

-- Pinterest RLS Policies
CREATE POLICY "Users can view their own pinterest metrics" ON public.pinterest_metrics FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Users can insert their own pinterest metrics" ON public.pinterest_metrics FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Users can update their own pinterest metrics" ON public.pinterest_metrics FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "Users can delete their own pinterest metrics" ON public.pinterest_metrics FOR DELETE USING (customer_id = auth.uid());

-- Facebook RLS Policies
CREATE POLICY "Users can view their own facebook metrics" ON public.facebook_metrics FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Users can insert their own facebook metrics" ON public.facebook_metrics FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Users can update their own facebook metrics" ON public.facebook_metrics FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "Users can delete their own facebook metrics" ON public.facebook_metrics FOR DELETE USING (customer_id = auth.uid());

-- Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION public.update_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_linkedin_metrics_updated_at BEFORE UPDATE ON public.linkedin_metrics FOR EACH ROW EXECUTE FUNCTION public.update_metrics_updated_at();
CREATE TRIGGER update_tiktok_metrics_updated_at BEFORE UPDATE ON public.tiktok_metrics FOR EACH ROW EXECUTE FUNCTION public.update_metrics_updated_at();
CREATE TRIGGER update_twitter_metrics_updated_at BEFORE UPDATE ON public.twitter_metrics FOR EACH ROW EXECUTE FUNCTION public.update_metrics_updated_at();
CREATE TRIGGER update_pinterest_metrics_updated_at BEFORE UPDATE ON public.pinterest_metrics FOR EACH ROW EXECUTE FUNCTION public.update_metrics_updated_at();
CREATE TRIGGER update_facebook_metrics_updated_at BEFORE UPDATE ON public.facebook_metrics FOR EACH ROW EXECUTE FUNCTION public.update_metrics_updated_at();;
