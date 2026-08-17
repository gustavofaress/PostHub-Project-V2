
-- Atualizar usuários para plano PRO
UPDATE public.usuarios 
SET 
  tipo_plano = 'pro',
  quantidade_testes = 9999
WHERE email IN (
  'w.williamvidal@gmail.com',
  'lauraferreirapassos@gmail.com', 
  'sophiapaula1@gmail.com',
  'gabriellevergani@hotmail.com'
);

-- Atualizar também na tabela profiles para manter consistência
UPDATE public.profiles 
SET tipo_plano = 'pro'
WHERE email IN (
  'w.williamvidal@gmail.com',
  'lauraferreirapassos@gmail.com', 
  'sophiapaula1@gmail.com',
  'gabriellevergani@hotmail.com'
);
;
