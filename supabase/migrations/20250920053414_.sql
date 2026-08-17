-- Atualizar policies da tabela instagram_metrics para usar customer_id em vez de user_id

-- Remover policies antigas
DROP POLICY IF EXISTS "Usuários podem ver apenas suas próprias métricas" ON public.instagram_metrics;
DROP POLICY IF EXISTS "Usuários podem inserir apenas suas próprias métricas" ON public.instagram_metrics;
DROP POLICY IF EXISTS "Usuários podem atualizar apenas suas próprias métricas" ON public.instagram_metrics;
DROP POLICY IF EXISTS "Usuários podem deletar apenas suas próprias métricas" ON public.instagram_metrics;

-- Criar novas policies usando customer_id
CREATE POLICY "Users can view their own instagram metrics" 
ON public.instagram_metrics 
FOR SELECT 
USING (customer_id = auth.uid());

CREATE POLICY "Users can insert their own instagram metrics" 
ON public.instagram_metrics 
FOR INSERT 
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can update their own instagram metrics" 
ON public.instagram_metrics 
FOR UPDATE 
USING (customer_id = auth.uid());

CREATE POLICY "Users can delete their own instagram metrics" 
ON public.instagram_metrics 
FOR DELETE 
USING (customer_id = auth.uid());;
