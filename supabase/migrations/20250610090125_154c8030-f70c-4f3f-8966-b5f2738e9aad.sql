
-- Criar tabela para armazenar aceites da política de privacidade
CREATE TABLE public.privacy_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  email TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  accepted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.privacy_acceptances ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas seus próprios aceites
CREATE POLICY "Users can view their own privacy acceptances" 
  ON public.privacy_acceptances 
  FOR SELECT 
  USING (auth.uid() = user_id OR email = auth.email());

-- Política para permitir inserção de aceites
CREATE POLICY "Anyone can create privacy acceptances" 
  ON public.privacy_acceptances 
  FOR INSERT 
  WITH CHECK (true);

-- Índice para otimizar consultas por email
CREATE INDEX idx_privacy_acceptances_email ON public.privacy_acceptances(email);
CREATE INDEX idx_privacy_acceptances_user_id ON public.privacy_acceptances(user_id);
;
