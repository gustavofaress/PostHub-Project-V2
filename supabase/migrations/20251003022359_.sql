-- Atualizar o plano do usuário para PRO
UPDATE public.usuarios 
SET 
  tipo_plano = 'pro',
  current_plan = 'pro',
  quantidade_testes = 9999
WHERE id = '17cabb6e-0b5e-4b43-800e-9ae17b0d0823';;
