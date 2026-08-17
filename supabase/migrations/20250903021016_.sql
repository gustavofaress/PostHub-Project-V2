-- Fix social_connections table security vulnerability
-- Add encryption for sensitive tokens and ensure proper RLS

-- First, let's add a function to encrypt/decrypt tokens using Supabase's vault extension
-- Enable the vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

-- Create a key for encrypting social media tokens
SELECT vault.create_secret('social_tokens_encryption_key', gen_random_uuid()::text);

-- Create functions to encrypt and decrypt tokens
CREATE OR REPLACE FUNCTION public.encrypt_token(token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF token IS NULL OR token = '' THEN
    RETURN token;
  END IF;
  
  RETURN vault.encrypt(token, (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'social_tokens_encryption_key' LIMIT 1));
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF encrypted_token IS NULL OR encrypted_token = '' THEN
    RETURN encrypted_token;
  END IF;
  
  RETURN vault.decrypt(encrypted_token, (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'social_tokens_encryption_key' LIMIT 1));
END;
$$;

-- Add new encrypted columns for tokens
ALTER TABLE public.social_connections 
ADD COLUMN IF NOT EXISTS access_token_encrypted text,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted text;

-- Create a secure function to update social connections with encrypted tokens
CREATE OR REPLACE FUNCTION public.upsert_social_connection(
  p_platform text,
  p_platform_user_id text,
  p_platform_username text,
  p_access_token text,
  p_refresh_token text DEFAULT NULL,
  p_token_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  connection_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Insert or update the connection with encrypted tokens
  INSERT INTO public.social_connections (
    user_id,
    platform,
    platform_user_id,
    platform_username,
    access_token,
    access_token_encrypted,
    refresh_token,
    refresh_token_encrypted,
    token_expires_at
  )
  VALUES (
    current_user_id,
    p_platform,
    p_platform_user_id,
    p_platform_username,
    p_access_token,
    public.encrypt_token(p_access_token),
    p_refresh_token,
    public.encrypt_token(p_refresh_token),
    p_token_expires_at
  )
  ON CONFLICT (user_id, platform)
  DO UPDATE SET
    platform_user_id = EXCLUDED.platform_user_id,
    platform_username = EXCLUDED.platform_username,
    access_token = EXCLUDED.access_token,
    access_token_encrypted = public.encrypt_token(EXCLUDED.access_token),
    refresh_token = EXCLUDED.refresh_token,
    refresh_token_encrypted = public.encrypt_token(EXCLUDED.refresh_token),
    token_expires_at = EXCLUDED.token_expires_at,
    updated_at = now()
  RETURNING id INTO connection_id;

  RETURN connection_id;
END;
$$;

-- Create a function to get decrypted tokens (only for the owner)
CREATE OR REPLACE FUNCTION public.get_social_connection_tokens(p_platform text)
RETURNS TABLE(
  access_token text,
  refresh_token text,
  token_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(
      public.decrypt_token(sc.access_token_encrypted), 
      sc.access_token
    ) as access_token,
    COALESCE(
      public.decrypt_token(sc.refresh_token_encrypted), 
      sc.refresh_token
    ) as refresh_token,
    sc.token_expires_at
  FROM public.social_connections sc
  WHERE sc.user_id = current_user_id 
    AND sc.platform = p_platform;
END;
$$;

-- Update RLS policies to be more restrictive
-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can create their own connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users can view their own connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON public.social_connections;

-- Create more secure RLS policies
CREATE POLICY "Users can create their own connections" 
ON public.social_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own connections (limited fields)" 
ON public.social_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
ON public.social_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
ON public.social_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow service role to manage connections (for edge functions)
CREATE POLICY "Service role can manage social connections" 
ON public.social_connections 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.upsert_social_connection TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_social_connection_tokens TO authenticated;;
