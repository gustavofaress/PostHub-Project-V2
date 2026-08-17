-- Create youtube_metrics table
CREATE TABLE public.youtube_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  subscriber_count BIGINT NOT NULL DEFAULT 0,
  view_count BIGINT NOT NULL DEFAULT 0,
  video_count BIGINT NOT NULL DEFAULT 0
);

-- Create unique index for channel_id per user
CREATE UNIQUE INDEX idx_youtube_metrics_user_channel ON public.youtube_metrics(user_id, channel_id);

-- Create index for better performance
CREATE INDEX idx_youtube_metrics_channel_id ON public.youtube_metrics(channel_id);

-- Enable Row Level Security
ALTER TABLE public.youtube_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can create their own youtube metrics" 
ON public.youtube_metrics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own youtube metrics" 
ON public.youtube_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own youtube metrics" 
ON public.youtube_metrics 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own youtube metrics" 
ON public.youtube_metrics 
FOR DELETE 
USING (auth.uid() = user_id);;
