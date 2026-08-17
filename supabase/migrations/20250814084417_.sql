-- Adicionar coluna access_token na tabela instagram_metrics
ALTER TABLE public.instagram_metrics 
ADD COLUMN access_token TEXT;;
