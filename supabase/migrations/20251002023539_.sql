-- Atualizar tipo_plano do usuário para pro_plus
UPDATE public.usuarios
SET 
  tipo_plano = 'pro_plus',
  current_plan = 'pro_plus'
WHERE id = '17cabb6e-0b5e-4b43-800e-9ae17b0d0823';;
