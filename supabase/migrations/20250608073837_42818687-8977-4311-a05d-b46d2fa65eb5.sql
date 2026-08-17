
-- Atualizar o usuário administrativo após criação no Auth
UPDATE public.usuarios 
SET 
  tipo_plano = 'pro',
  quantidade_testes = 9999,
  current_plan = 'admin',
  is_admin = true
WHERE email = 'administrativo@posthub.com.br';

-- Confirmar email automaticamente para o usuário administrativo
INSERT INTO public.email_confirmations (user_id, token, confirmed_at)
SELECT id, 'admin_confirmed_' || gen_random_uuid(), NOW()
FROM public.usuarios 
WHERE email = 'administrativo@posthub.com.br'
ON CONFLICT (user_id) DO UPDATE SET
  confirmed_at = NOW(),
  token = 'admin_confirmed_' || gen_random_uuid();
;
