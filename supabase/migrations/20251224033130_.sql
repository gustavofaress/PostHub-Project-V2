-- Criar tabela profile_subscriptions para gerenciar assinaturas por perfil
CREATE TABLE public.profile_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  kiwify_order_id TEXT,
  kiwify_subscription_id TEXT,
  kiwify_customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'available', -- available, linked, cancelled, expired
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_profile_subscriptions_user_id ON public.profile_subscriptions(user_id);
CREATE INDEX idx_profile_subscriptions_status ON public.profile_subscriptions(status);
CREATE INDEX idx_profile_subscriptions_kiwify_order ON public.profile_subscriptions(kiwify_order_id);

-- Habilitar RLS
ALTER TABLE public.profile_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuários verem suas próprias assinaturas
CREATE POLICY "Users can view their own subscriptions"
ON public.profile_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON public.profile_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role pode fazer tudo (para webhooks)
CREATE POLICY "Service role full access"
ON public.profile_subscriptions
FOR ALL
USING (current_setting('role'::text) = 'service_role'::text)
WITH CHECK (current_setting('role'::text) = 'service_role'::text);

-- Adicionar colunas na client_profiles
ALTER TABLE public.client_profiles 
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.profile_subscriptions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_profile_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profile_subscriptions_updated_at
BEFORE UPDATE ON public.profile_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_subscriptions_updated_at();

-- Remover o trigger antigo de limite de 5 perfis
DROP TRIGGER IF EXISTS check_profile_limit_trigger ON public.client_profiles;

-- Criar nova função para verificar se pode criar perfil (tem assinatura disponível)
CREATE OR REPLACE FUNCTION public.check_profile_subscription_available()
RETURNS TRIGGER AS $$
DECLARE
  available_subscription_id UUID;
  profile_count INTEGER;
BEGIN
  -- Contar perfis existentes do usuário
  SELECT COUNT(*) INTO profile_count
  FROM public.client_profiles
  WHERE user_id = NEW.user_id;
  
  -- Primeiro perfil é sempre permitido (perfil default)
  IF profile_count = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se há assinatura disponível para vincular
  SELECT id INTO available_subscription_id
  FROM public.profile_subscriptions
  WHERE user_id = NEW.user_id 
    AND status = 'available'
    AND profile_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF available_subscription_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma assinatura disponível. Adquira um novo perfil para continuar.';
  END IF;
  
  -- Vincular assinatura ao novo perfil
  UPDATE public.profile_subscriptions
  SET profile_id = NEW.id, status = 'linked', updated_at = now()
  WHERE id = available_subscription_id;
  
  -- Salvar referência da assinatura no perfil
  NEW.subscription_id := available_subscription_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para verificar assinatura na criação de perfil
CREATE TRIGGER check_profile_subscription_trigger
BEFORE INSERT ON public.client_profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_profile_subscription_available();

-- Migração: Criar assinaturas para perfis PRO existentes
INSERT INTO public.profile_subscriptions (user_id, profile_id, kiwify_order_id, status, started_at)
SELECT 
  cp.user_id,
  cp.id,
  'migration_' || cp.id::text,
  'linked',
  cp.created_at
FROM public.client_profiles cp
JOIN public.usuarios u ON u.id = cp.user_id
WHERE u.current_plan IN ('pro', 'pro_plus')
ON CONFLICT DO NOTHING;

-- Atualizar client_profiles com subscription_id para perfis migrados
UPDATE public.client_profiles cp
SET subscription_id = ps.id
FROM public.profile_subscriptions ps
WHERE ps.profile_id = cp.id
AND cp.subscription_id IS NULL;;
