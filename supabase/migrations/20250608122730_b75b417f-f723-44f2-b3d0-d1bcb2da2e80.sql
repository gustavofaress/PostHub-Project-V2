
-- Primeiro, vamos garantir que o webhook está configurado corretamente
-- Criar/recriar o trigger para novos usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar função para chamar o webhook quando um novo usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Criar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_webhook();

-- Garantir que as tabelas necessárias existem e estão configuradas
-- Verificar se email_confirmation_tokens existe
CREATE TABLE IF NOT EXISTS public.email_confirmation_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Verificar se email_logs existe
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Garantir que pg_net está habilitado para webhooks
CREATE EXTENSION IF NOT EXISTS pg_net;
;
