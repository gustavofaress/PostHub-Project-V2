-- Primeiro, adicionar a coluna avatar_url na tabela usuarios se não existir
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS avatar_url text;

-- Migrar dados únicos da tabela profiles para usuarios
-- Atualizar usuarios existentes com dados da tabela profiles
UPDATE public.usuarios 
SET 
  avatar_url = COALESCE(usuarios.avatar_url, profiles.avatar_url),
  current_plan = COALESCE(usuarios.current_plan, profiles.current_plan),
  trial_started_at = COALESCE(usuarios.trial_started_at, profiles.trial_started_at),
  trial_expires_at = COALESCE(usuarios.trial_expires_at, profiles.trial_expires_at),
  ultimo_acesso = COALESCE(usuarios.ultimo_acesso, profiles.updated_at, usuarios.ultimo_acesso)
FROM public.profiles 
WHERE usuarios.id = profiles.id;

-- Inserir usuários que existem apenas na tabela profiles
INSERT INTO public.usuarios (
  id, 
  email, 
  nome, 
  tipo_plano, 
  quantidade_testes, 
  data_criacao, 
  ultimo_acesso, 
  current_plan,
  trial_started_at,
  trial_expires_at,
  avatar_url
)
SELECT 
  p.id,
  p.email,
  p.nome,
  COALESCE(p.tipo_plano, 'start_7'),
  3, -- quantidade_testes padrão
  NOW(), -- data_criacao
  COALESCE(p.updated_at, NOW()), -- ultimo_acesso
  p.current_plan,
  p.trial_started_at,
  p.trial_expires_at,
  p.avatar_url
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.usuarios u WHERE u.id = p.id
);

-- Agora excluir a tabela profiles
DROP TABLE IF EXISTS public.profiles CASCADE;;
