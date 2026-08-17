CREATE OR REPLACE FUNCTION public.check_profile_subscription_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_subscription_id UUID;
  profile_count INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Verificar se o usuário atual é admin
  SELECT is_admin INTO v_is_admin
  FROM usuarios
  WHERE id = auth.uid();
  
  -- Admins podem criar perfis sem restrição
  IF v_is_admin = TRUE THEN
    RETURN NEW;
  END IF;

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
$$;;
