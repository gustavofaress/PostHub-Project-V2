-- Inserir usuário PRO na tabela usuarios
INSERT INTO public.usuarios (id, email, nome, current_plan, tipo_plano, quantidade_testes, is_admin, data_criacao, ultimo_acesso)
VALUES (
  '7f3232a6-74cf-4a5d-8587-eabf31701ad8',
  'adm@mgbmarketing.com.br',
  'MGB Marketing',
  'pro',
  'pro',
  9999,
  false,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  current_plan = 'pro',
  tipo_plano = 'pro',
  quantidade_testes = 9999;;
