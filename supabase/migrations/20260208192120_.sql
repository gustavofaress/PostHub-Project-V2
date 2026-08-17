-- Create function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create approval_posts table
CREATE TABLE public.approval_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  public_token TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  caption TEXT,
  format TEXT NOT NULL DEFAULT 'single' CHECK (format IN ('single', 'carousel', 'video_vertical', 'video_horizontal')),
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  platforms TEXT[] NOT NULL DEFAULT ARRAY['instagram']::TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create approval_feedback table
CREATE TABLE public.approval_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.approval_posts(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('approved', 'changes_requested', 'rejected')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_approval_posts_user_id ON public.approval_posts(user_id);
CREATE INDEX idx_approval_posts_profile_id ON public.approval_posts(profile_id);
CREATE INDEX idx_approval_posts_public_token ON public.approval_posts(public_token);
CREATE INDEX idx_approval_posts_status ON public.approval_posts(status);
CREATE INDEX idx_approval_feedback_post_id ON public.approval_feedback(post_id);

-- Enable RLS
ALTER TABLE public.approval_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approval_posts

-- Users can view their own posts
CREATE POLICY "Users can view their own approval posts"
ON public.approval_posts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Public access with valid token (for anonymous reviewers)
CREATE POLICY "Public access with valid token"
ON public.approval_posts
FOR SELECT
TO anon
USING (public_token IS NOT NULL AND status != 'expired');

-- Users can create their own posts
CREATE POLICY "Users can create their own approval posts"
ON public.approval_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own approval posts"
ON public.approval_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own approval posts"
ON public.approval_posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for approval_feedback

-- Users can view feedback on their own posts
CREATE POLICY "Users can view feedback on their posts"
ON public.approval_feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.approval_posts ap
    WHERE ap.id = post_id AND ap.user_id = auth.uid()
  )
);

-- Anyone can create feedback (for anonymous reviewers)
CREATE POLICY "Anyone can create feedback"
ON public.approval_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.approval_posts ap
    WHERE ap.id = post_id AND ap.status = 'pending'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_approval_posts_updated_at
  BEFORE UPDATE ON public.approval_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for approval media
INSERT INTO storage.buckets (id, name, public)
VALUES ('approval-media', 'approval-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for approval-media bucket
CREATE POLICY "Users can upload approval media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'approval-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their approval media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'approval-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their approval media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'approval-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Approval media is publicly viewable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'approval-media');;
