
-- Função para obter estatísticas gerais dos usuários
CREATE OR REPLACE FUNCTION public.get_admin_user_stats()
RETURNS TABLE(
  total_users bigint,
  trial_users bigint,
  confirmed_users bigint,
  unconfirmed_users bigint,
  active_last_week bigint,
  active_last_month bigint,
  inactive_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar esta função';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.usuarios)::bigint as total_users,
    (SELECT COUNT(*) FROM public.usuarios WHERE current_plan = 'start_7')::bigint as trial_users,
    (SELECT COUNT(DISTINCT ec.user_id) FROM public.email_confirmations ec WHERE ec.confirmed_at IS NOT NULL)::bigint as confirmed_users,
    (SELECT COUNT(*) FROM public.usuarios u 
     WHERE NOT EXISTS(SELECT 1 FROM public.email_confirmations ec WHERE ec.user_id = u.id AND ec.confirmed_at IS NOT NULL))::bigint as unconfirmed_users,
    (SELECT COUNT(*) FROM public.usuarios WHERE ultimo_acesso >= NOW() - INTERVAL '7 days')::bigint as active_last_week,
    (SELECT COUNT(*) FROM public.usuarios WHERE ultimo_acesso >= NOW() - INTERVAL '30 days')::bigint as active_last_month,
    (SELECT COUNT(*) FROM public.usuarios WHERE ultimo_acesso < NOW() - INTERVAL '30 days')::bigint as inactive_users;
END;
$$;

-- Função para obter lista completa de usuários com filtros
CREATE OR REPLACE FUNCTION public.get_admin_users_list(
  filter_status text DEFAULT 'all',
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  email text,
  nome text,
  data_criacao timestamp with time zone,
  ultimo_acesso timestamp with time zone,
  current_plan text,
  tipo_plano text,
  quantidade_testes integer,
  is_admin boolean,
  trial_expires_at timestamp with time zone,
  email_confirmed boolean,
  days_since_last_access integer,
  is_trial_expired boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar esta função';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    u.nome,
    u.data_criacao,
    u.ultimo_acesso,
    u.current_plan,
    u.tipo_plano,
    u.quantidade_testes,
    u.is_admin,
    u.trial_expires_at,
    EXISTS(SELECT 1 FROM public.email_confirmations ec WHERE ec.user_id = u.id AND ec.confirmed_at IS NOT NULL) as email_confirmed,
    EXTRACT(DAY FROM (NOW() - u.ultimo_acesso))::integer as days_since_last_access,
    CASE 
      WHEN u.current_plan = 'start_7' AND u.trial_expires_at IS NOT NULL AND NOW() > u.trial_expires_at 
      THEN true 
      ELSE false 
    END as is_trial_expired
  FROM public.usuarios u
  WHERE 
    CASE 
      WHEN filter_status = 'trial' THEN u.current_plan = 'start_7'
      WHEN filter_status = 'confirmed' THEN EXISTS(SELECT 1 FROM public.email_confirmations ec WHERE ec.user_id = u.id AND ec.confirmed_at IS NOT NULL)
      WHEN filter_status = 'unconfirmed' THEN NOT EXISTS(SELECT 1 FROM public.email_confirmations ec WHERE ec.user_id = u.id AND ec.confirmed_at IS NOT NULL)
      WHEN filter_status = 'active' THEN u.ultimo_acesso >= NOW() - INTERVAL '30 days'
      WHEN filter_status = 'inactive' THEN u.ultimo_acesso < NOW() - INTERVAL '30 days'
      WHEN filter_status = 'admin' THEN u.is_admin = true
      ELSE true
    END
  ORDER BY u.data_criacao DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Função para obter estatísticas mensais de crescimento
CREATE OR REPLACE FUNCTION public.get_admin_growth_stats()
RETURNS TABLE(
  month_year text,
  new_users bigint,
  confirmed_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar esta função';
  END IF;

  RETURN QUERY
  SELECT 
    TO_CHAR(date_trunc('month', u.data_criacao), 'YYYY-MM') as month_year,
    COUNT(*)::bigint as new_users,
    COUNT(ec.confirmed_at)::bigint as confirmed_users
  FROM public.usuarios u
  LEFT JOIN public.email_confirmations ec ON u.id = ec.user_id AND ec.confirmed_at IS NOT NULL
  WHERE u.data_criacao >= NOW() - INTERVAL '12 months'
  GROUP BY date_trunc('month', u.data_criacao)
  ORDER BY date_trunc('month', u.data_criacao) DESC;
END;
$$;
;
