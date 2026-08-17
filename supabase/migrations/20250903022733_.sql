-- Final security hardening - Fix remaining critical vulnerabilities

-- 1. CRITICAL: Fix email_confirmation_tokens table security
-- This table stores sensitive authentication tokens
DROP POLICY IF EXISTS "Admins can manage confirmation tokens" ON public.email_confirmation_tokens;
DROP POLICY IF EXISTS "Service role full access to confirmation tokens" ON public.email_confirmation_tokens;
DROP POLICY IF EXISTS "Users can update their own confirmation tokens" ON public.email_confirmation_tokens;
DROP POLICY IF EXISTS "Users can view their own confirmation tokens" ON public.email_confirmation_tokens;

-- Create secure policies for email confirmation tokens
CREATE POLICY "secure_email_tokens_select"
ON public.email_confirmation_tokens 
FOR SELECT 
USING (user_id = auth.uid());

-- Only service role should be able to insert/update tokens (for backend processes)
CREATE POLICY "secure_email_tokens_service_role"
ON public.email_confirmation_tokens 
FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- 2. WARNING: Fix profiles table missing INSERT policy
-- Add INSERT policy for profiles
CREATE POLICY "secure_profiles_insert"
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid() AND auth.uid() IS NOT NULL);

-- 3. WARNING: Fix script_credits table missing policies
-- Add missing INSERT and DELETE policies for script_credits
CREATE POLICY "secure_script_credits_insert"
ON public.script_credits 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND 
  auth.uid() IS NOT NULL AND
  credits_remaining <= 10 -- Prevent abuse by limiting initial credits
);

CREATE POLICY "secure_script_credits_delete"
ON public.script_credits 
FOR DELETE 
USING (false); -- Prevent deletion - credits should only be updated, not deleted

-- Service role access for script credits (for system operations)
CREATE POLICY "secure_script_credits_service_role"
ON public.script_credits 
FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- 4. Additional security: Add audit logging trigger for sensitive tables
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log sensitive operations for security monitoring
  INSERT INTO public.security_logs (
    user_id, 
    action, 
    resource, 
    details
  ) VALUES (
    COALESCE(auth.uid(), NEW.user_id, OLD.user_id),
    TG_OP,
    TG_TABLE_NAME,
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW),
      'timestamp', now()
    )
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_social_connections ON public.social_connections;
CREATE TRIGGER audit_social_connections
  AFTER INSERT OR UPDATE OR DELETE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

DROP TRIGGER IF EXISTS audit_email_confirmation_tokens ON public.email_confirmation_tokens;
CREATE TRIGGER audit_email_confirmation_tokens
  AFTER INSERT OR UPDATE OR DELETE ON public.email_confirmation_tokens
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

DROP TRIGGER IF EXISTS audit_stripe_customers ON public.stripe_customers;
CREATE TRIGGER audit_stripe_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.stripe_customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

-- 5. Verify social_connections table security one more time
-- Remove any columns that might still have unencrypted data
UPDATE public.social_connections 
SET 
  access_token = NULL,
  refresh_token = NULL
WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL;

-- 6. Add additional validation for social connections
CREATE OR REPLACE FUNCTION public.validate_social_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure tokens are encrypted if provided
  IF NEW.access_token IS NOT NULL AND NEW.access_token != '' THEN
    RAISE EXCEPTION 'Unencrypted access tokens are not allowed';
  END IF;
  
  IF NEW.refresh_token IS NOT NULL AND NEW.refresh_token != '' THEN
    RAISE EXCEPTION 'Unencrypted refresh tokens are not allowed';
  END IF;
  
  -- Ensure user owns the connection
  IF NEW.user_id != auth.uid() AND current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Cannot create/modify connections for other users';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_social_connection_trigger ON public.social_connections;
CREATE TRIGGER validate_social_connection_trigger
  BEFORE INSERT OR UPDATE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.validate_social_connection();;
