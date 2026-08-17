
-- Inserir usuário PRO apenas na tabela usuarios (sem profiles por enquanto)
INSERT INTO public.usuarios (
  id,
  email,
  nome,
  tipo_plano,
  quantidade_testes,
  data_criacao,
  ultimo_acesso,
  is_admin
) VALUES (
  gen_random_uuid(),
  'gameirolucas3112@gmail.com',
  'Lucas Gameiro',
  'pro',
  9999,
  now(),
  now(),
  false
) ON CONFLICT (email) DO UPDATE SET
  tipo_plano = 'pro',
  quantidade_testes = 9999,
  nome = 'Lucas Gameiro';
;
