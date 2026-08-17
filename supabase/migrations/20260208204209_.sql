-- Função SECURITY DEFINER para admins criarem perfis sem validação de assinatura
CREATE OR REPLACE FUNCTION public.admin_create_profile(
  p_user_id uuid,
  p_profile_name text,
  p_industry text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_new_profile_id uuid;
BEGIN
  -- Verificar se o usuário atual é admin
  SELECT is_admin INTO v_is_admin
  FROM usuarios
  WHERE id = auth.uid();
  
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Apenas administradores podem usar esta função';
  END IF;
  
  -- Inserir o perfil diretamente, ignorando o trigger de validação de assinatura
  INSERT INTO client_profiles (
    user_id,
    profile_name,
    industry,
    description,
    is_default,
    is_active
  ) VALUES (
    p_user_id,
    p_profile_name,
    p_industry,
    p_description,
    false,
    true
  )
  RETURNING id INTO v_new_profile_id;
  
  -- Criar uma assinatura administrativa vinculada ao perfil
  INSERT INTO profile_subscriptions (
    user_id,
    profile_id,
    kiwify_order_id,
    status,
    started_at
  ) VALUES (
    p_user_id,
    v_new_profile_id,
    'admin_grant_' || gen_random_uuid()::text,
    'linked',
    now()
  );
  
  -- Atualizar o perfil com a subscription_id
  UPDATE client_profiles
  SET subscription_id = (
    SELECT id FROM profile_subscriptions 
    WHERE profile_id = v_new_profile_id 
    LIMIT 1
  )
  WHERE id = v_new_profile_id;
  
  RETURN v_new_profile_id;
END;
$$;;
