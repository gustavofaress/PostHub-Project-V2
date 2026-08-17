-- Create admin user in the usuarios table
-- This user will have admin privileges and can login normally

-- Insert admin user directly into usuarios table
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
  gen_random_uuid(),
  'paulotartarineto@gmail.com',
  'Paulo Tartarine Neto',
  'admin',
  9999,
  NOW(),
  NOW(),
  true,
  'admin'
) ON CONFLICT (email) DO UPDATE SET
  is_admin = true,
  tipo_plano = 'admin',
  current_plan = 'admin',
  quantidade_testes = 9999;;
