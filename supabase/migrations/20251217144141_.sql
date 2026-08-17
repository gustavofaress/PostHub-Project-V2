-- Criar tabela de perfis de clientes
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  avatar_url TEXT,
  industry TEXT,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para busca rápida por user_id
CREATE INDEX idx_client_profiles_user_id ON public.client_profiles(user_id);

-- Índice único para garantir apenas um perfil padrão por usuário
CREATE UNIQUE INDEX idx_client_profiles_default ON public.client_profiles(user_id) WHERE is_default = true;

-- Habilitar RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own profiles"
ON public.client_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profiles"
ON public.client_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles"
ON public.client_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles"
ON public.client_profiles FOR DELETE
USING (auth.uid() = user_id);

-- Função para validar limite de 5 perfis por usuário
CREATE OR REPLACE FUNCTION public.check_profile_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count
  FROM public.client_profiles
  WHERE user_id = NEW.user_id;
  
  IF profile_count >= 5 THEN
    RAISE EXCEPTION 'Limite de 5 perfis por usuário atingido';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para verificar limite antes de inserir
CREATE TRIGGER check_profile_limit_trigger
BEFORE INSERT ON public.client_profiles
FOR EACH ROW EXECUTE FUNCTION public.check_profile_limit();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_client_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_client_profiles_updated_at
BEFORE UPDATE ON public.client_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_client_profiles_updated_at();

-- Função para criar perfil padrão automaticamente para novos usuários
CREATE OR REPLACE FUNCTION public.create_default_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_profiles (user_id, profile_name, is_default)
  VALUES (NEW.id, COALESCE(NEW.nome, 'Meu Perfil'), true);
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil padrão quando usuário é criado na tabela usuarios
CREATE TRIGGER create_default_profile_trigger
AFTER INSERT ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.create_default_profile_for_user();;
