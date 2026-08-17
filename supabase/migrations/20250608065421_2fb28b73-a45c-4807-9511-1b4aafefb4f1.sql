
-- First, let's ensure we have proper admin role checking functions
-- Check if admin users table exists and create admin checking functions

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$;

-- Function to get admin dashboard stats
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(
  total_users bigint,
  active_users_today bigint,
  new_users_last_7_days bigint,
  total_scripts bigint,
  total_scheduled_posts bigint,
  confirmed_emails_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.usuarios)::bigint as total_users,
    (SELECT COUNT(*) FROM public.usuarios WHERE ultimo_acesso >= CURRENT_DATE)::bigint as active_users_today,
    (SELECT COUNT(*) FROM public.usuarios WHERE data_criacao >= CURRENT_DATE - INTERVAL '7 days')::bigint as new_users_last_7_days,
    (SELECT COUNT(*) FROM public.script_drafts)::bigint as total_scripts,
    (SELECT COUNT(*) FROM public.scheduled_posts)::bigint as total_scheduled_posts,
    (SELECT 
      CASE 
        WHEN (SELECT COUNT(*) FROM public.usuarios) = 0 THEN 0
        ELSE ROUND(
          (SELECT COUNT(DISTINCT ec.user_id) FROM public.email_confirmations ec WHERE ec.confirmed_at IS NOT NULL)::numeric / 
          (SELECT COUNT(*) FROM public.usuarios)::numeric * 100, 2
        )
      END
    ) as confirmed_emails_percentage;
END;
$$;

-- Function to get user growth data for charts
CREATE OR REPLACE FUNCTION public.get_user_growth_data()
RETURNS TABLE(
  period text,
  user_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    TO_CHAR(date_trunc('week', data_criacao), 'YYYY-MM-DD') as period,
    COUNT(*)::bigint as user_count
  FROM public.usuarios 
  WHERE data_criacao >= CURRENT_DATE - INTERVAL '12 weeks'
  GROUP BY date_trunc('week', data_criacao)
  ORDER BY date_trunc('week', data_criacao);
END;
$$;

-- Function to get users by plan data for charts
CREATE OR REPLACE FUNCTION public.get_users_by_plan_data()
RETURNS TABLE(
  plan_name text,
  user_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(current_plan, 'undefined') as plan_name,
    COUNT(*)::bigint as user_count
  FROM public.usuarios 
  GROUP BY current_plan
  ORDER BY user_count DESC;
END;
$$;

-- Function to get detailed users list for admin table
CREATE OR REPLACE FUNCTION public.get_admin_users_detailed(
  search_term text DEFAULT '',
  plan_filter text DEFAULT 'all',
  status_filter text DEFAULT 'all',
  confirmed_filter text DEFAULT 'all',
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  nome text,
  email text,
  current_plan text,
  is_active boolean,
  email_confirmed boolean,
  data_criacao timestamp with time zone,
  ultimo_acesso timestamp with time zone,
  script_count bigint,
  scheduled_posts_count bigint,
  is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.nome,
    u.email,
    u.current_plan,
    (u.ultimo_acesso >= CURRENT_DATE - INTERVAL '30 days') as is_active,
    EXISTS(SELECT 1 FROM public.email_confirmations ec WHERE ec.user_id = u.id AND ec.confirmed_at IS NOT NULL) as email_confirmed,
    u.data_criacao,
    u.ultimo_acesso,
    (SELECT COUNT(*) FROM public.script_drafts sd WHERE sd.user_id = u.id)::bigint as script_count,
    (SELECT COUNT(*) FROM public.scheduled_posts sp WHERE sp.user_id = u.id)::bigint as scheduled_posts_count,
    COALESCE(u.is_admin, false) as is_admin
  FROM public.usuarios u
  WHERE 
    (search_term = '' OR u.nome ILIKE '%' || search_term || '%' OR u.email ILIKE '%' || search_term || '%')
    AND (plan_filter = 'all' OR u.current_plan = plan_filter)
    AND (status_filter = 'all' OR 
         (status_filter = 'active' AND u.ultimo_acesso >= CURRENT_DATE - INTERVAL '30 days') OR
         (status_filter = 'inactive' AND u.ultimo_acesso < CURRENT_DATE - INTERVAL '30 days'))
    AND (confirmed_filter = 'all' OR 
         (confirmed_filter = 'confirmed' AND EXISTS(SELECT 1 FROM public.email_confirmations ec WHERE ec.user_id = u.id AND ec.confirmed_at IS NOT NULL)) OR
         (confirmed_filter = 'unconfirmed' AND NOT EXISTS(SELECT 1 FROM public.email_confirmations ec WHERE ec.user_id = u.id AND ec.confirmed_at IS NOT NULL)))
  ORDER BY u.data_criacao DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Function to update user plan (admin action)
CREATE OR REPLACE FUNCTION public.admin_update_user_plan(
  target_user_id uuid,
  new_plan text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  UPDATE public.usuarios 
  SET 
    current_plan = new_plan,
    tipo_plano = new_plan,
    quantidade_testes = CASE 
      WHEN new_plan = 'pro' THEN 9999 
      ELSE quantidade_testes 
    END
  WHERE id = target_user_id;

  RETURN FOUND;
END;
$$;

-- Function to manually confirm user email (admin action)
CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Insert or update email confirmation
  INSERT INTO public.email_confirmations (user_id, token, confirmed_at)
  VALUES (target_user_id, 'admin_confirmed_' || gen_random_uuid(), NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET confirmed_at = NOW(), token = 'admin_confirmed_' || gen_random_uuid();

  RETURN FOUND;
END;
$$;
;
