-- Primeiro, remover todas as políticas RLS que dependem da coluna user_id
DROP POLICY IF EXISTS "Usuários podem atualizar apenas suas próprias métricas" ON public.instagram_metrics;
DROP POLICY IF EXISTS "Usuários podem deletar apenas suas próprias métricas" ON public.instagram_metrics;
DROP POLICY IF EXISTS "Usuários podem inserir apenas suas próprias métricas" ON public.instagram_metrics;
DROP POLICY IF EXISTS "Usuários podem ver apenas suas próprias métricas" ON public.instagram_metrics;

-- Remover a constraint de chave primária se existir
ALTER TABLE public.instagram_metrics DROP CONSTRAINT IF EXISTS instagram_metrics_pkey;

-- Alterar o tipo da coluna id de uuid para text
ALTER TABLE public.instagram_metrics ALTER COLUMN id TYPE text USING id::text;

-- Alterar o tipo da coluna user_id de uuid para text  
ALTER TABLE public.instagram_metrics ALTER COLUMN user_id TYPE text USING user_id::text;

-- Remover o default da coluna id já que não podemos mais usar gen_random_uuid()
ALTER TABLE public.instagram_metrics ALTER COLUMN id DROP DEFAULT;

-- Recriar a chave primária
ALTER TABLE public.instagram_metrics ADD CONSTRAINT instagram_metrics_pkey PRIMARY KEY (id);

-- Recriar as políticas RLS
CREATE POLICY "Usuários podem ver apenas suas próprias métricas" 
ON public.instagram_metrics 
FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Usuários podem inserir apenas suas próprias métricas" 
ON public.instagram_metrics 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Usuários podem atualizar apenas suas próprias métricas" 
ON public.instagram_metrics 
FOR UPDATE 
USING (auth.uid()::text = user_id);

CREATE POLICY "Usuários podem deletar apenas suas próprias métricas" 
ON public.instagram_metrics 
FOR DELETE 
USING (auth.uid()::text = user_id);;
