-- Fix remaining database functions to have secure search paths
-- Update all functions to set search_path = public for security

CREATE OR REPLACE FUNCTION public.update_instagram_metrics_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.migrate_all_metrics_to_user(target_user_id uuid)
RETURNS TABLE(youtube_updated bigint, instagram_updated bigint, target_user uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  youtube_count bigint;
  instagram_count bigint;
BEGIN
  -- Verificar se o user_id foi fornecido
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'ID do usuário é obrigatório';
  END IF;
  
  -- Atualizar todos os registros da tabela youtube_metrics
  UPDATE public.youtube_metrics 
  SET user_id = target_user_id;
  
  GET DIAGNOSTICS youtube_count = ROW_COUNT;
  
  -- Atualizar todos os registros da tabela instagram_metrics
  -- Convertendo UUID para TEXT já que esta tabela usa user_id como TEXT
  UPDATE public.instagram_metrics 
  SET user_id = target_user_id::text;
  
  GET DIAGNOSTICS instagram_count = ROW_COUNT;
  
  -- Retornar estatísticas da migração
  RETURN QUERY
  SELECT 
    youtube_count as youtube_updated,
    instagram_count as instagram_updated,
    target_user_id as target_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_plan(target_user_id uuid, new_plan text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_admin_growth_stats()
RETURNS TABLE(month_year text, new_users bigint, confirmed_users bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.generate_confirmation_link(user_email text)
RETURNS TABLE(token text, confirmation_url text, user_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  target_user_name TEXT;
  new_token TEXT;
  base_url TEXT := 'https://posthub.com.br';
BEGIN
  -- Find user by email
  SELECT id, nome INTO target_user_id, target_user_name
  FROM public.usuarios 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado com email: %', user_email;
  END IF;
  
  -- Generate simple token (UUID without hyphens)
  new_token := replace(gen_random_uuid()::text, '-', '');
  
  -- Insert/update in email_confirmations table
  INSERT INTO public.email_confirmations (user_id, token, sent_at)
  VALUES (target_user_id, new_token, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    token = new_token, 
    sent_at = now(),
    confirmed_at = NULL; -- Reset confirmation if generating new token
  
  -- Return token and URL
  RETURN QUERY
  SELECT 
    new_token as token,
    (base_url || '/confirmar-email?token=' || new_token) as confirmation_url,
    COALESCE(target_user_name, 'Usuário') as user_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_growth_data()
RETURNS TABLE(period text, user_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_admin_users_detailed(search_term text DEFAULT ''::text, plan_filter text DEFAULT 'all'::text, status_filter text DEFAULT 'all'::text, confirmed_filter text DEFAULT 'all'::text, limit_count integer DEFAULT 50, offset_count integer DEFAULT 0)
RETURNS TABLE(user_id uuid, nome text, email text, current_plan text, is_active boolean, email_confirmed boolean, data_criacao timestamp with time zone, ultimo_acesso timestamp with time zone, script_count bigint, scheduled_posts_count bigint, is_admin boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_unconfirmed_users()
RETURNS TABLE(user_id uuid, email text, nome text, data_criacao timestamp with time zone, has_pending_confirmation boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    EXISTS(
      SELECT 1 FROM public.email_confirmations ec 
      WHERE ec.user_id = u.id AND ec.confirmed_at IS NULL
    ) as has_pending_confirmation
  FROM public.usuarios u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.email_confirmations ec 
    WHERE ec.user_id = u.id AND ec.confirmed_at IS NOT NULL
  )
  ORDER BY u.data_criacao DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_email_logs()
RETURNS TABLE(id uuid, email_type text, recipient_email text, status text, error_message text, sent_at timestamp with time zone, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    -- Admin pode ver todos os logs
    RETURN QUERY
    SELECT el.id, el.email_type, el.recipient_email, el.status, 
           el.error_message, el.sent_at, el.created_at
    FROM public.email_logs el
    ORDER BY el.created_at DESC;
  ELSE
    -- Usuários normais veem apenas seus logs
    RETURN QUERY
    SELECT el.id, el.email_type, el.recipient_email, el.status, 
           el.error_message, el.sent_at, el.created_at
    FROM public.email_logs el
    WHERE el.user_id = auth.uid()
    ORDER BY el.created_at DESC;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_script_credits_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ideas_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_calendar_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.modified_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_performance_metrics_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_content_cards_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_manual_metrics_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_editorial_calendar_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(total_users bigint, active_users_today bigint, new_users_last_7_days bigint, total_scripts bigint, total_scheduled_posts bigint, confirmed_emails_percentage numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_admin_user_stats()
RETURNS TABLE(total_users bigint, trial_users bigint, confirmed_users bigint, unconfirmed_users bigint, active_last_week bigint, active_last_month bigint, inactive_users bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_admin_users_list(filter_status text DEFAULT 'all'::text, limit_count integer DEFAULT 50, offset_count integer DEFAULT 0)
RETURNS TABLE(user_id uuid, email text, nome text, data_criacao timestamp with time zone, ultimo_acesso timestamp with time zone, current_plan text, tipo_plano text, quantidade_testes integer, is_admin boolean, trial_expires_at timestamp with time zone, email_confirmed boolean, days_since_last_access integer, is_trial_expired boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_users_by_plan_data()
RETURNS TABLE(plan_name text, user_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nome_valor text;
  tipo_plano_valor text := 'teste';
  quantidade_testes_valor int := 3;
  trial_start TIMESTAMPTZ := NOW();
  trial_end TIMESTAMPTZ := NOW() + INTERVAL '7 days';
BEGIN
  -- Log para debug
  RAISE LOG 'Processando novo usuário: %', new.id;
  
  -- Extrair o nome dos metadados de forma segura
  IF new.raw_user_meta_data IS NOT NULL AND new.raw_user_meta_data ? 'nome' THEN
    nome_valor := new.raw_user_meta_data->>'nome';
  ELSE
    nome_valor := COALESCE(new.email, 'Usuário');
  END IF;

  -- Extrair tipo_plano se fornecido
  IF new.raw_user_meta_data IS NOT NULL AND new.raw_user_meta_data ? 'tipo_plano' THEN
    tipo_plano_valor := new.raw_user_meta_data->>'tipo_plano';
  END IF;

  -- Extrair quantidade_testes se fornecido
  IF new.raw_user_meta_data IS NOT NULL AND new.raw_user_meta_data ? 'quantidade_testes' THEN
    BEGIN
      quantidade_testes_valor := (new.raw_user_meta_data->>'quantidade_testes')::int;
    EXCEPTION WHEN OTHERS THEN
      quantidade_testes_valor := 3; -- fallback para valor padrão
    END;
  END IF;

  -- Inserir na tabela profiles
  INSERT INTO public.profiles (id, email, nome, tipo_plano, current_plan, trial_started_at, trial_expires_at)
  VALUES (new.id, new.email, nome_valor, tipo_plano_valor, 'start_7', trial_start, trial_end)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = EXCLUDED.nome,
    updated_at = NOW();

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
    NOW(),
    'start_7',
    trial_start,
    trial_end
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = EXCLUDED.nome,
    ultimo_acesso = NOW();

  RAISE LOG 'Usuário criado com sucesso: % - %', new.id, new.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar usuário %: %', new.id, SQLERRM;
    RETURN NEW; -- Não bloquear a criação do usuário mesmo com erro
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fazer chamada HTTP para o webhook usando pg_net
  PERFORM
    net.http_post(
      url := 'https://wzdlxojiuflixigyxkap.supabase.co/functions/v1/handle-new-user-webhook',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZGx4b2ppdWZsaXhpZ3l4a2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDczODcsImV4cCI6MjA2MTUyMzM4N30.rDu-ce07Y03tgbSLNHtHlBDe7CglmzM4x20s7_zHelM'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'users',
        'record', jsonb_build_object(
          'id', NEW.id,
          'email', NEW.email,
          'raw_user_meta_data', NEW.raw_user_meta_data,
          'email_confirmed_at', NEW.email_confirmed_at
        )
      )
    );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_confirmation_token(token_input text)
RETURNS TABLE(success boolean, message text, user_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  confirmation_record RECORD;
  user_record RECORD;
BEGIN
  -- Find the token
  SELECT * INTO confirmation_record 
  FROM public.email_confirmations 
  WHERE token = token_input;

  -- Check if token exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Token inválido ou não encontrado', NULL::TEXT;
    RETURN;
  END IF;

  -- Check if already confirmed
  IF confirmation_record.confirmed_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Este email já foi confirmado anteriormente', NULL::TEXT;
    RETURN;
  END IF;

  -- Get user data
  SELECT u.email INTO user_record
  FROM public.usuarios u
  WHERE u.id = confirmation_record.user_id;

  -- Mark as confirmed
  UPDATE public.email_confirmations 
  SET confirmed_at = now()
  WHERE token = token_input;

  -- Return success
  RETURN QUERY SELECT true, 'Email confirmado com sucesso!', user_record.email;
END;
$$;;
