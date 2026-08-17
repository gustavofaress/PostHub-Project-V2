-- Fix the security definer view issue and complete security hardening

-- Drop the problematic view that has security issues
DROP VIEW IF EXISTS public.social_connections_safe;

-- Instead, create a function that returns safe social connection data
CREATE OR REPLACE FUNCTION public.get_safe_social_connections()
RETURNS TABLE(
  id uuid,
  platform varchar,
  platform_user_id text,
  platform_username text,
  created_at timestamptz,
  updated_at timestamptz,
  token_expires_at timestamptz,
  has_access_token boolean,
  has_refresh_token boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return data for the current user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT 
    sc.id,
    sc.platform,
    sc.platform_user_id,
    sc.platform_username,
    sc.created_at,
    sc.updated_at,
    sc.token_expires_at,
    -- Don't expose actual tokens, just whether they exist
    (sc.access_token_encrypted IS NOT NULL) as has_access_token,
    (sc.refresh_token_encrypted IS NOT NULL) as has_refresh_token
  FROM public.social_connections sc
  WHERE sc.user_id = auth.uid();
END;
$$;

-- Verify all social media tokens are properly encrypted or nullified
-- Check if there are any unencrypted tokens remaining
DO $$
DECLARE
  unencrypted_count integer;
BEGIN
  SELECT COUNT(*) INTO unencrypted_count
  FROM public.social_connections 
  WHERE (access_token IS NOT NULL AND access_token != '') 
     OR (refresh_token IS NOT NULL AND refresh_token != '');
  
  IF unencrypted_count > 0 THEN
    -- Force clear any remaining unencrypted tokens
    UPDATE public.social_connections 
    SET access_token = NULL, refresh_token = NULL
    WHERE (access_token IS NOT NULL AND access_token != '') 
       OR (refresh_token IS NOT NULL AND refresh_token != '');
    
    RAISE NOTICE 'Cleared % unencrypted tokens for security', unencrypted_count;
  END IF;
END $$;

-- Add a constraint to prevent unencrypted tokens from being stored in the future
ALTER TABLE public.social_connections 
DROP CONSTRAINT IF EXISTS check_no_unencrypted_tokens;

ALTER TABLE public.social_connections 
ADD CONSTRAINT check_no_unencrypted_tokens 
CHECK (
  (access_token IS NULL OR access_token = '') AND 
  (refresh_token IS NULL OR refresh_token = '')
);

-- Log security action
INSERT INTO public.security_logs (user_id, action, resource, details) 
VALUES (
  auth.uid(), 
  'SECURITY_HARDENING', 
  'social_connections', 
  jsonb_build_object(
    'action', 'token_encryption_completed',
    'timestamp', now(),
    'constraint_added', true
  )
);;
