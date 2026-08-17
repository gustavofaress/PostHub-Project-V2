
-- Function to generate a simple confirmation token for manual sending
CREATE OR REPLACE FUNCTION public.generate_confirmation_link(user_email TEXT)
RETURNS TABLE(token TEXT, confirmation_url TEXT, user_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to validate confirmation token (already exists but updating for consistency)
CREATE OR REPLACE FUNCTION public.validate_confirmation_token(token_input TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, user_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  confirmation_record RECORD;
  user_record RECORD;
BEGIN
  -- Find the token
  SELECT * INTO confirmation_record 
  FROM public.email_confirmations 
  WHERE token = token_input;

  -- Check if token exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Token inválido ou não encontrado', NULL::TEXT;
    RETURN;
  END IF;

  -- Check if already confirmed
  IF confirmation_record.confirmed_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Este email já foi confirmado anteriormente', NULL::TEXT;
    RETURN;
  END IF;

  -- Get user data
  SELECT u.email INTO user_record
  FROM public.usuarios u
  WHERE u.id = confirmation_record.user_id;

  -- Mark as confirmed
  UPDATE public.email_confirmations 
  SET confirmed_at = now()
  WHERE token = token_input;

  -- Return success
  RETURN QUERY SELECT true, 'Email confirmado com sucesso!', user_record.email;
END;
$$;
;
