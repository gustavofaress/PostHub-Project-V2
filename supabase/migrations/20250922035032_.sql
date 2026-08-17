-- Criar usuário especial para verificação do Meta
INSERT INTO public.usuarios (
  id,
  email,
  nome,
  tipo_plano,
  quantidade_testes,
  data_criacao,
  ultimo_acesso,
  is_admin,
  current_plan
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'meta@verification.com',
  'Meta Application Review',
  'pro',
  9999,
  now(),
  now(),
  true,
  'pro'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nome = EXCLUDED.nome,
  tipo_plano = EXCLUDED.tipo_plano,
  quantidade_testes = EXCLUDED.quantidade_testes,
  is_admin = EXCLUDED.is_admin,
  current_plan = EXCLUDED.current_plan;;
