-- Fase 1: Adicionar coluna page_id na tabela contas_instagram
ALTER TABLE public.contas_instagram 
ADD COLUMN IF NOT EXISTS page_id text;

-- Atualizar contas existentes com profile_id correto e page_id
-- Conta id=24 (instagram_user_id: 111904674632597) → perfil "Gustavo Fares | Perfil Profissional"
UPDATE public.contas_instagram 
SET profile_id = '78f8051e-d58a-4f28-bb88-4a3dec9337b8',
    page_id = '17841472320173638'
WHERE id = 24;

-- Conta id=25 (instagram_user_id: 585420871311143) → perfil "Gustavo Fares"
UPDATE public.contas_instagram 
SET profile_id = '326c5bfa-0975-4795-83c0-4177d192f26c',
    page_id = '17841471397451006'
WHERE id = 25;

-- Corrigir métricas existentes baseado no page_id
-- Métricas com page_id=17841472320173638 → perfil "Gustavo Fares | Perfil Profissional"
UPDATE public.instagram_metrics 
SET profile_id = '78f8051e-d58a-4f28-bb88-4a3dec9337b8'
WHERE page_id = '17841472320173638';

-- Métricas com page_id=17841471397451006 → perfil "Gustavo Fares"
UPDATE public.instagram_metrics 
SET profile_id = '326c5bfa-0975-4795-83c0-4177d192f26c'
WHERE page_id = '17841471397451006';

-- Criar índice para busca rápida por page_id
CREATE INDEX IF NOT EXISTS idx_contas_instagram_page_id ON public.contas_instagram(page_id);
CREATE INDEX IF NOT EXISTS idx_contas_instagram_profile_customer ON public.contas_instagram(customer_id, profile_id);;
