-- Fix email_logs table security vulnerability
-- Remove the overly permissive policy and replace with secure ones

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Service role can manage email logs" ON public.email_logs;

-- Create secure policies for email_logs table
CREATE POLICY "Admins can view all email logs" 
ON public.email_logs 
FOR SELECT 
USING (public.is_current_user_admin());

CREATE POLICY "Admins can insert email logs" 
ON public.email_logs 
FOR INSERT 
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update email logs" 
ON public.email_logs 
FOR UPDATE 
USING (public.is_current_user_admin());

CREATE POLICY "Admins can delete email logs" 
ON public.email_logs 
FOR DELETE 
USING (public.is_current_user_admin());

-- Allow service role (for edge functions) to manage email logs
CREATE POLICY "Service role full access to email logs" 
ON public.email_logs 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);;
