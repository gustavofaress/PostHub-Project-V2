-- Update existing user to PRO and create authentication with password
-- Email: paulotartarineto@gmail.com 
-- Password: Senha1234@

DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Get the user ID from usuarios table
  SELECT id INTO user_uuid FROM public.usuarios WHERE email = 'paulotartarineto@gmail.com';
  
  IF user_uuid IS NOT NULL THEN
    -- Insert/update user in auth.users with password
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token,
      email_change_token_new,
      recovery_token
    ) VALUES (
      user_uuid,
      '00000000-0000-0000-0000-000000000000',
      'paulotartarineto@gmail.com',
      crypt('Senha1234@', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      '',
      '',
      ''
    ) ON CONFLICT (id) DO UPDATE SET
      encrypted_password = crypt('Senha1234@', gen_salt('bf')),
      email_confirmed_at = NOW();

    -- Update existing user in usuarios table to PRO
    UPDATE public.usuarios 
    SET 
      is_admin = false,
      tipo_plano = 'pro',
      current_plan = 'pro',
      quantidade_testes = 9999,
      nome = 'Paulo Tartarine Neto'
    WHERE email = 'paulotartarineto@gmail.com';
    
  ELSE
    RAISE EXCEPTION 'Usuário com email paulotartarineto@gmail.com não encontrado na tabela usuarios';
  END IF;
    
END $$;;
