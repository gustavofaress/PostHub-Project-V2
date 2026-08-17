
-- Corrigir a função generate_confirmation_link para garantir funcionamento correto
CREATE OR REPLACE FUNCTION public.generate_confirmation_link(user_email text)
 RETURNS TABLE(token text, confirmation_url text, user_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;
