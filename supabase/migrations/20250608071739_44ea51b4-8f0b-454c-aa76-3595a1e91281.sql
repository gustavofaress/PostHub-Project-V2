
-- Adicionar constraint única na coluna user_id da tabela email_confirmations
ALTER TABLE public.email_confirmations
ADD CONSTRAINT email_confirmations_user_id_unique UNIQUE (user_id);
;
