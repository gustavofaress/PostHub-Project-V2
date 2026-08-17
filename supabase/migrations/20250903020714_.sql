-- Fix email_confirmation_tokens table security vulnerability
-- Remove the overly permissive policy and replace with secure ones

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Service role can manage email tokens" ON public.email_confirmation_tokens;

-- Create secure policies for email_confirmation_tokens table
CREATE POLICY "Users can view their own confirmation tokens" 
ON public.email_confirmation_tokens 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own confirmation tokens" 
ON public.email_confirmation_tokens 
FOR UPDATE 
USING (user_id = auth.uid());

-- Allow service role (for edge functions) to manage all tokens
CREATE POLICY "Service role full access to confirmation tokens" 
ON public.email_confirmation_tokens 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow admins to manage confirmation tokens
CREATE POLICY "Admins can manage confirmation tokens" 
ON public.email_confirmation_tokens 
FOR ALL 
USING (public.is_current_user_admin()) 
WITH CHECK (public.is_current_user_admin());;
