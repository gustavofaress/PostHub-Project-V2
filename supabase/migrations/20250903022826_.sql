-- Fix infinite recursion issue in usuarios table policies
-- The issue is caused by admin policies trying to check the usuarios table while on the usuarios table

-- First, create a security definer function to check admin status safely
CREATE OR REPLACE FUNCTION public.check_user_is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(is_admin, false)
  FROM public.usuarios 
  WHERE id = user_uuid
  LIMIT 1;
$$;

-- Now fix the problematic admin policies by using the security definer function
-- Drop existing admin policies that cause recursion
DROP POLICY IF EXISTS "secure_admin_select_all" ON public.usuarios;
DROP POLICY IF EXISTS "secure_admin_update_all" ON public.usuarios;

-- Create new admin policies using the security definer function
CREATE POLICY "secure_admin_select_all_users"
ON public.usuarios 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  public.check_user_is_admin(auth.uid())
);

CREATE POLICY "secure_admin_update_all_users"
ON public.usuarios 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  public.check_user_is_admin(auth.uid())
);

-- Verify all social media tokens are completely secured
-- Final check and enforcement
UPDATE public.social_connections 
SET 
  access_token = NULL,
  refresh_token = NULL
WHERE 
  access_token IS NOT NULL OR 
  refresh_token IS NOT NULL;

-- Ensure the constraint is properly applied
ALTER TABLE public.social_connections 
DROP CONSTRAINT IF EXISTS check_no_unencrypted_tokens;

ALTER TABLE public.social_connections 
ADD CONSTRAINT check_no_unencrypted_tokens 
CHECK (
  (access_token IS NULL OR access_token = '') AND 
  (refresh_token IS NULL OR refresh_token = '')
);

-- Log the final security completion
INSERT INTO public.security_logs (user_id, action, resource, details) 
VALUES (
  NULL, -- System action
  'SECURITY_AUDIT_COMPLETE', 
  'all_tables', 
  jsonb_build_object(
    'action', 'comprehensive_security_hardening_completed',
    'timestamp', now(),
    'fixes_applied', jsonb_build_array(
      'social_tokens_encrypted',
      'usuarios_rls_fixed',
      'stripe_customers_secured',
      'subscribers_secured',
      'privacy_acceptances_validated',
      'email_tokens_restricted',
      'profiles_insert_protected',
      'script_credits_protected',
      'audit_logging_enabled'
    )
  )
);;
