
-- Criar tabela para armazenar dados dos compradores do Stripe
CREATE TABLE public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  nome TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- Política para permitir que edge functions façam operações
CREATE POLICY "edge_functions_full_access" ON public.stripe_customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Política para usuários verem apenas seus próprios dados
CREATE POLICY "users_select_own_data" ON public.stripe_customers
  FOR SELECT
  USING (user_id = auth.uid());
;
