-- CRITICAL SECURITY FIX: Remove overly permissive RLS policies on usuarios table
-- Drop all existing policies on usuarios table
DROP POLICY IF EXISTS "Admins can read all users data" ON public.usuarios;
DROP POLICY IF EXISTS "Admins can update all users data" ON public.usuarios;
DROP POLICY IF EXISTS "Service role can do all operations" ON public.usuarios;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.usuarios;
DROP POLICY IF EXISTS "Users can read their own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update their own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update their own record" ON public.usuarios;
DROP POLICY IF EXISTS "Users can view their own record" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;

-- Create secure RLS policies for usuarios table
-- Policy for users to view their own data only
CREATE POLICY "Users can view own data only"
ON public.usuarios 
FOR SELECT 
USING (auth.uid() = id);

-- Policy for users to update their own data only
CREATE POLICY "Users can update own data only"
ON public.usuarios 
FOR UPDATE 
USING (auth.uid() = id);

-- Policy for new user registration (insert)
CREATE POLICY "Users can insert own record only"
ON public.usuarios 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Admin policy for viewing all users (restricted to verified admins only)
CREATE POLICY "Verified admins can view all users"
ON public.usuarios 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.usuarios admin_check 
    WHERE admin_check.id = auth.uid() 
    AND admin_check.is_admin = true
  )
);

-- Admin policy for updating users (restricted to verified admins only)
CREATE POLICY "Verified admins can update all users"
ON public.usuarios 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.usuarios admin_check 
    WHERE admin_check.id = auth.uid() 
    AND admin_check.is_admin = true
  )
);

-- Service role access (for edge functions and backend operations)
CREATE POLICY "Service role full access"
ON public.usuarios 
FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- Complete token encryption migration for social_connections
-- Migrate any remaining unencrypted tokens to encrypted fields
UPDATE public.social_connections 
SET 
  access_token_encrypted = public.encrypt_token(access_token),
  refresh_token_encrypted = public.encrypt_token(refresh_token)
WHERE 
  (access_token_encrypted IS NULL AND access_token IS NOT NULL) OR
  (refresh_token_encrypted IS NULL AND refresh_token IS NOT NULL);

-- Clear unencrypted tokens after migration
UPDATE public.social_connections 
SET 
  access_token = '[ENCRYPTED]',
  refresh_token = '[ENCRYPTED]'
WHERE access_token_encrypted IS NOT NULL OR refresh_token_encrypted IS NOT NULL;

-- Enhance database function security by setting search paths
-- Update functions to have secure search paths
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trial_days_remaining(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expires_at TIMESTAMPTZ;
    current_plan_type TEXT;
    days_remaining INTEGER;
BEGIN
    SELECT trial_expires_at, current_plan 
    INTO expires_at, current_plan_type
    FROM public.usuarios 
    WHERE id = user_id;
    
    -- Se não é plano start_7, retorna -1
    IF current_plan_type != 'start_7' THEN
        RETURN -1;
    END IF;
    
    -- Se não tem data de expiração, retorna -1
    IF expires_at IS NULL THEN
        RETURN -1;
    END IF;
    
    -- Calcula dias restantes
    days_remaining := EXTRACT(DAY FROM (expires_at - NOW()));
    
    -- Se já expirou, retorna 0
    IF days_remaining < 0 THEN
        RETURN 0;
    END IF;
    
    RETURN days_remaining;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_trial_expired(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expires_at TIMESTAMPTZ;
    current_plan_type TEXT;
BEGIN
    SELECT trial_expires_at, current_plan 
    INTO expires_at, current_plan_type
    FROM public.usuarios 
    WHERE id = user_id;
    
    -- Se não é plano start_7, não há trial para expirar
    IF current_plan_type != 'start_7' THEN
        RETURN FALSE;
    END IF;
    
    -- Se não tem data de expiração, considerar como não expirado
    IF expires_at IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Retorna TRUE se o trial expirou
    RETURN NOW() > expires_at;
END;
$$;

-- Add security logging table for monitoring
CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource text,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on security logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Only admins can view security logs"
ON public.security_logs
FOR SELECT
USING (public.is_current_user_admin());

-- Service role can insert security logs
CREATE POLICY "Service role can insert security logs"
ON public.security_logs
FOR INSERT
WITH CHECK (current_setting('role') = 'service_role');;
