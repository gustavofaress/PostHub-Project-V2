
-- Criar função RPC para buscar logs de email
CREATE OR REPLACE FUNCTION public.get_email_logs()
RETURNS TABLE (
  id UUID,
  email_type TEXT,
  recipient_email TEXT,
  status TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
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
;
