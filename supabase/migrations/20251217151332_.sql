-- Add profile_id column to instagram_metrics table
ALTER TABLE public.instagram_metrics 
ADD COLUMN profile_id uuid REFERENCES public.client_profiles(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_instagram_metrics_profile_id ON public.instagram_metrics(profile_id);;
