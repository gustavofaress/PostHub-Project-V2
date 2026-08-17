-- Adicionar coluna profile_id à tabela contas_instagram
ALTER TABLE public.contas_instagram 
ADD COLUMN profile_id uuid REFERENCES public.client_profiles(id);

-- Criar índice para performance
CREATE INDEX idx_contas_instagram_profile_id ON public.contas_instagram(profile_id);;
