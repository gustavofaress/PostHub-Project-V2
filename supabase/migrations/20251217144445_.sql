-- Criar perfil padrão para usuários existentes que ainda não têm perfil
-- Apenas para usuários que existem em auth.users
INSERT INTO public.client_profiles (user_id, profile_name, is_default)
SELECT 
  u.id,
  COALESCE(u.nome, 'Meu Perfil'),
  true
FROM public.usuarios u
INNER JOIN auth.users au ON au.id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_profiles cp WHERE cp.user_id = u.id
);;
