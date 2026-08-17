-- Fix customer_id issue by handling NULL values properly
begin;

-- First, check what user_id values we have in instagram_metrics
-- and try to map them to existing usuarios
UPDATE public.instagram_metrics 
SET customer_id = (
  SELECT u.id 
  FROM public.usuarios u 
  WHERE u.id::text = instagram_metrics.user_id
  LIMIT 1
)
WHERE customer_id IS NULL AND user_id IS NOT NULL;

-- For any remaining NULL customer_id records without valid user_id mapping,
-- we'll assign them to the first admin user as fallback
UPDATE public.instagram_metrics 
SET customer_id = (
  SELECT id 
  FROM public.usuarios 
  WHERE is_admin = true 
  LIMIT 1
)
WHERE customer_id IS NULL;

-- If no admin exists, create a dummy record or delete orphaned records
-- Let's delete orphaned records for now
DELETE FROM public.instagram_metrics 
WHERE customer_id IS NULL;

-- Now set the default and constraints
ALTER TABLE public.instagram_metrics
ALTER COLUMN customer_id SET DEFAULT auth.uid();

-- Create the enforcement function
CREATE OR REPLACE FUNCTION public.enforce_instagram_metrics_customer_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For normal clients, force customer_id to the current auth user
  IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    NEW.customer_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_set_instagram_metrics_customer_id ON public.instagram_metrics;
CREATE TRIGGER trg_set_instagram_metrics_customer_id
BEFORE INSERT ON public.instagram_metrics
FOR EACH ROW
EXECUTE FUNCTION public.enforce_instagram_metrics_customer_id();

-- Finally, enforce NOT NULL
ALTER TABLE public.instagram_metrics
ALTER COLUMN customer_id SET NOT NULL;

commit;;
