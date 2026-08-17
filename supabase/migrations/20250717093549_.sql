-- Add updated_at column if it doesn't already exist
ALTER TABLE public.instagram_metrics 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create or replace function to auto-update the updated_at field
CREATE OR REPLACE FUNCTION public.update_instagram_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on updates
CREATE TRIGGER update_instagram_metrics_updated_at
BEFORE UPDATE ON public.instagram_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_instagram_metrics_updated_at();;
