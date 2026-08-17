
-- Adicionar colunas para o sistema de trial na tabela usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS current_plan TEXT DEFAULT 'start_7',
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

-- Atualizar usuários existentes para ter o plano start_7 se ainda estão no plano teste
UPDATE public.usuarios 
SET current_plan = 'start_7',
    trial_started_at = data_criacao,
    trial_expires_at = data_criacao + INTERVAL '7 days'
WHERE tipo_plano = 'teste' AND current_plan IS NULL;

-- Função para verificar se o trial expirou
CREATE OR REPLACE FUNCTION public.is_trial_expired(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expires_at TIMESTAMPTZ;
    current_plan_type TEXT;
BEGIN
    SELECT trial_expires_at, current_plan 
    INTO expires_at, current_plan_type
    FROM public.usuarios 
    WHERE id = user_id;
    
    -- Se não é plano start_7, não há trial para expirar
    IF current_plan_type != 'start_7' THEN
        RETURN FALSE;
    END IF;
    
    -- Se não tem data de expiração, considerar como não expirado
    IF expires_at IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Retorna TRUE se o trial expirou
    RETURN NOW() > expires_at;
END;
$$;

-- Função para calcular dias restantes do trial
CREATE OR REPLACE FUNCTION public.trial_days_remaining(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expires_at TIMESTAMPTZ;
    current_plan_type TEXT;
    days_remaining INTEGER;
BEGIN
    SELECT trial_expires_at, current_plan 
    INTO expires_at, current_plan_type
    FROM public.usuarios 
    WHERE id = user_id;
    
    -- Se não é plano start_7, retorna -1
    IF current_plan_type != 'start_7' THEN
        RETURN -1;
    END IF;
    
    -- Se não tem data de expiração, retorna -1
    IF expires_at IS NULL THEN
        RETURN -1;
    END IF;
    
    -- Calcula dias restantes
    days_remaining := EXTRACT(DAY FROM (expires_at - NOW()));
    
    -- Se já expirou, retorna 0
    IF days_remaining < 0 THEN
        RETURN 0;
    END IF;
    
    RETURN days_remaining;
END;
$$;

-- Atualizar a função handle_new_user para configurar automaticamente o trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  nome_valor text;
  tipo_plano_valor text := 'teste';
  quantidade_testes_valor int := 3;
  trial_start TIMESTAMPTZ := NOW();
  trial_end TIMESTAMPTZ := NOW() + INTERVAL '7 days';
BEGIN
  -- Extrair o nome dos metadados de forma segura
  IF new.raw_user_meta_data ? 'nome' THEN
    nome_valor := new.raw_user_meta_data->>'nome';
  ELSE
    nome_valor := NULL;
  END IF;

  -- Inserir na tabela profiles
  INSERT INTO public.profiles (id, email, nome, tipo_plano)
  VALUES (new.id, new.email, nome_valor, tipo_plano_valor)
  ON CONFLICT (id) DO NOTHING;

  -- Inserir na tabela usuarios com trial de 7 dias
  INSERT INTO public.usuarios (
    id, 
    email, 
    nome, 
    tipo_plano, 
    quantidade_testes, 
    data_criacao,
    current_plan,
    trial_started_at,
    trial_expires_at
  )
  VALUES (
    new.id, 
    new.email, 
    nome_valor, 
    tipo_plano_valor, 
    quantidade_testes_valor, 
    now(),
    'start_7',
    trial_start,
    trial_end
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Adicionar campos na tabela profiles também para consistência
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_plan TEXT DEFAULT 'start_7',
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;
;
