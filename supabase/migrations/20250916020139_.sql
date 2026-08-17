-- Add customerId field to instagram_metrics table
ALTER TABLE public.instagram_metrics 
ADD COLUMN customer_id UUID REFERENCES public.usuarios(id);

-- Add customerId field to youtube_metrics table  
ALTER TABLE public.youtube_metrics
ADD COLUMN customer_id UUID REFERENCES public.usuarios(id);

-- Create index for better performance
CREATE INDEX idx_instagram_metrics_customer_id ON public.instagram_metrics(customer_id);
CREATE INDEX idx_youtube_metrics_customer_id ON public.youtube_metrics(customer_id);;
