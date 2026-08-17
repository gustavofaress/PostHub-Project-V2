-- Complete security hardening - Fix all function search paths and finish token encryption

-- Fix all database functions to have secure search paths
CREATE OR REPLACE FUNCTION public.update_instagram_metrics_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.migrate_all_metrics_to_user(target_user_id uuid)
RETURNS TABLE(youtube_updated bigint, instagram_updated bigint, target_user uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  youtube_count bigint;
  instagram_count bigint;
BEGIN
  -- Verificar se o user_id foi fornecido
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'ID do usuário é obrigatório';
  END IF;
  
  -- Atualizar todos os registros da tabela youtube_metrics
  UPDATE public.youtube_metrics 
  SET user_id = target_user_id;
  
  GET DIAGNOSTICS youtube_count = ROW_COUNT;
  
  -- Atualizar todos os registros da tabela instagram_metrics
  -- Convertendo UUID para TEXT já que esta tabela usa user_id como TEXT
  UPDATE public.instagram_metrics 
  SET user_id = target_user_id::text;
  
  GET DIAGNOSTICS instagram_count = ROW_COUNT;
  
  -- Retornar estatísticas da migração
  RETURN QUERY
  SELECT 
    youtube_count as youtube_updated,
    instagram_count as instagram_updated,
    target_user_id as target_user;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.admin_update_user_plan(target_user_id uuid, new_plan text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  UPDATE public.usuarios 
  SET 
    current_plan = new_plan,
    tipo_plano = new_plan,
    quantidade_testes = CASE 
      WHEN new_plan = 'pro' THEN 9999 
      ELSE quantidade_testes 
    END
  WHERE id = target_user_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Insert or update email confirmation
  INSERT INTO public.email_confirmations (user_id, token, confirmed_at)
  VALUES (target_user_id, 'admin_confirmed_' || gen_random_uuid(), NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET confirmed_at = NOW(), token = 'admin_confirmed_' || gen_random_uuid();

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_growth_stats()
RETURNS TABLE(month_year text, new_users bigint, confirmed_users bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar esta função';
  END IF;

  RETURN QUERY
  SELECT 
    TO_CHAR(date_trunc('month', u.data_criacao), 'YYYY-MM') as month_year,
    COUNT(*)::bigint as new_users,
    COUNT(ec.confirmed_at)::bigint as confirmed_users
  FROM public.usuarios u
  LEFT JOIN public.email_confirmations ec ON u.id = ec.user_id AND ec.confirmed_at IS NOT NULL
  WHERE u.data_criacao >= NOW() - INTERVAL '12 months'
  GROUP BY date_trunc('month', u.data_criacao)
  ORDER BY date_trunc('month', u.data_criacao) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_confirmation_link(user_email text)
RETURNS TABLE(token text, confirmation_url text, user_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  target_user_name TEXT;
  new_token TEXT;
  base_url TEXT := 'https://posthub.com.br';
BEGIN
  -- Find user by email
  SELECT id, nome INTO target_user_id, target_user_name
  FROM public.usuarios 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado com email: %', user_email;
  END IF;
  
  -- Generate simple token (UUID without hyphens)
  new_token := replace(gen_random_uuid()::text, '-', '');
  
  -- Insert/update in email_confirmations table
  INSERT INTO public.email_confirmations (user_id, token, sent_at)
  VALUES (target_user_id, new_token, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    token = new_token, 
    sent_at = now(),
    confirmed_at = NULL; -- Reset confirmation if generating new token
  
  -- Return token and URL
  RETURN QUERY
  SELECT 
    new_token as token,
    (base_url || '/confirmar-email?token=' || new_token) as confirmation_url,
    COALESCE(target_user_name, 'Usuário') as user_name;
END;
$$;

-- Complete token encryption migration for social_connections
-- Migrate any remaining unencrypted tokens to encrypted fields
UPDATE public.social_connections 
SET 
  access_token_encrypted = public.encrypt_token(access_token),
  refresh_token_encrypted = public.encrypt_token(refresh_token)
WHERE 
  (access_token_encrypted IS NULL AND access_token IS NOT NULL AND access_token != '[ENCRYPTED]') OR
  (refresh_token_encrypted IS NULL AND refresh_token IS NOT NULL AND refresh_token != '[ENCRYPTED]');

-- Clear unencrypted tokens after migration
UPDATE public.social_connections 
SET 
  access_token = '[ENCRYPTED]',
  refresh_token = '[ENCRYPTED]'
WHERE access_token_encrypted IS NOT NULL OR refresh_token_encrypted IS NOT NULL;

-- Add security logging table for monitoring if it doesn't exist
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

-- Enable RLS on security logs if not already enabled
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on security_logs to avoid conflicts
DROP POLICY IF EXISTS "Only admins can view security logs" ON public.security_logs;
DROP POLICY IF EXISTS "Service role can insert security logs" ON public.security_logs;

-- Create secure policies for security logs
CREATE POLICY "secure_admin_view_security_logs"
ON public.security_logs
FOR SELECT
USING (public.is_current_user_admin());

CREATE POLICY "secure_service_role_insert_security_logs"
ON public.security_logs
FOR INSERT
WITH CHECK (current_setting('role') = 'service_role');;
