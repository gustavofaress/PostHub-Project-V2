-- Verificar se o usuário já existe no auth.users
DO $$
DECLARE
    auth_user_exists BOOLEAN;
BEGIN
    -- Verificar se o usuário existe no auth.users
    SELECT EXISTS(
        SELECT 1 FROM auth.users WHERE email = 'paulotartarineto@gmail.com'
    ) INTO auth_user_exists;
    
    -- Se não existir, criar o usuário
    IF NOT auth_user_exists THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_sent_at,
            confirmation_token,
            recovery_sent_at,
            recovery_token,
            email_change_sent_at,
            email_change,
            email_change_confirm_status,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            phone_change,
            phone_change_token,
            phone_change_sent_at,
            email_change_token_current,
            email_change_confirm_status,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at,
            is_sso_user,
            deleted_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            '17cabb6e-0b5e-4b43-800e-9ae17b0d0823',
            'authenticated',
            'authenticated',
            'paulotartarineto@gmail.com',
            crypt('Senha1234@', gen_salt('bf')),
            NOW(),
            NOW(),
            '',
            NULL,
            '',
            NULL,
            '',
            0,
            NULL,
            '{"provider":"email","providers":["email"]}',
            '{"nome":"Paulo Tartarine Neto"}',
            FALSE,
            NOW(),
            NOW(),
            NULL,
            NULL,
            '',
            '',
            NULL,
            '',
            0,
            NULL,
            '',
            NULL,
            FALSE,
            NULL
        );
        
        RAISE NOTICE 'Usuário criado no auth.users';
    ELSE
        RAISE NOTICE 'Usuário já existe no auth.users';
    END IF;
END $$;;
