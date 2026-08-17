
-- Criar tabela para confirmações de email
CREATE TABLE public.email_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Adicionar índices para performance
CREATE INDEX idx_email_confirmations_user_id ON public.email_confirmations(user_id);
CREATE INDEX idx_email_confirmations_token ON public.email_confirmations(token);
CREATE INDEX idx_email_confirmations_confirmed_at ON public.email_confirmations(confirmed_at);

-- Habilitar RLS
ALTER TABLE public.email_confirmations ENABLE ROW LEVEL SECURITY;

-- Política para admins verem todos os registros
CREATE POLICY "Admins can view all email confirmations" 
  ON public.email_confirmations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Política para admins inserirem registros
CREATE POLICY "Admins can insert email confirmations" 
  ON public.email_confirmations 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Política para usuários atualizarem suas próprias confirmações
CREATE POLICY "Users can update their own confirmations" 
  ON public.email_confirmations 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Função para obter usuários não confirmados (apenas admins)
CREATE OR REPLACE FUNCTION public.get_unconfirmed_users()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  nome TEXT,
  data_criacao TIMESTAMP WITH TIME ZONE,
  has_pending_confirmation BOOLEAN
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

-- Função para validar token de confirmação
CREATE OR REPLACE FUNCTION public.validate_confirmation_token(token_input TEXT)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  confirmation_record RECORD;
  user_record RECORD;
BEGIN
  -- Buscar o token
  SELECT * INTO confirmation_record 
  FROM public.email_confirmations 
  WHERE token = token_input;

  -- Verificar se o token existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Token inválido ou não encontrado', NULL::TEXT;
    RETURN;
  END IF;

  -- Verificar se já foi confirmado
  IF confirmation_record.confirmed_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Este token já foi utilizado', NULL::TEXT;
    RETURN;
  END IF;

  -- Verificar se expirou
  IF confirmation_record.expires_at < now() THEN
    RETURN QUERY SELECT false, 'Token expirado', NULL::TEXT;
    RETURN;
  END IF;

  -- Buscar dados do usuário
  SELECT u.email INTO user_record
  FROM public.usuarios u
  WHERE u.id = confirmation_record.user_id;

  -- Marcar como confirmado
  UPDATE public.email_confirmations 
  SET confirmed_at = now()
  WHERE token = token_input;

  -- Retornar sucesso
  RETURN QUERY SELECT true, 'Email confirmado com sucesso!', user_record.email;
END;
$$;
;
