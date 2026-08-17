
-- Criar tabela para tokens de confirmação de email
CREATE TABLE IF NOT EXISTS public.email_confirmation_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_user_id ON public.email_confirmation_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_token ON public.email_confirmation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_expires_at ON public.email_confirmation_tokens(expires_at);

-- Adicionar RLS (Row Level Security)
ALTER TABLE public.email_confirmation_tokens ENABLE ROW LEVEL SECURITY;

-- Remover política se existir e criar nova
DROP POLICY IF EXISTS "Service role can manage email tokens" ON public.email_confirmation_tokens;

-- Criar política RLS
CREATE POLICY "Service role can manage email tokens" 
  ON public.email_confirmation_tokens 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Criar também tabela para logs de email se não existir
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS para email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Política para email_logs
DROP POLICY IF EXISTS "Service role can manage email logs" ON public.email_logs;
CREATE POLICY "Service role can manage email logs" 
  ON public.email_logs 
  FOR ALL 
  USING (true)
  WITH CHECK (true);
;
