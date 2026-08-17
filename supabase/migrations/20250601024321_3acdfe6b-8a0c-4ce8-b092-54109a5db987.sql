
-- Habilitar RLS na tabela editorial_calendar
ALTER TABLE public.editorial_calendar ENABLE ROW LEVEL SECURITY;

-- Política SELECT: usuários podem ver apenas suas próprias tarefas
CREATE POLICY "Users can view their own tasks" 
  ON public.editorial_calendar 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política INSERT: usuários podem criar suas próprias tarefas
CREATE POLICY "Users can create their own tasks" 
  ON public.editorial_calendar 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política UPDATE: usuários podem atualizar apenas suas próprias tarefas
CREATE POLICY "Users can update their own tasks" 
  ON public.editorial_calendar 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Política DELETE: usuários podem deletar apenas suas próprias tarefas
CREATE POLICY "Users can delete their own tasks" 
  ON public.editorial_calendar 
  FOR DELETE 
  USING (auth.uid() = user_id);
;
