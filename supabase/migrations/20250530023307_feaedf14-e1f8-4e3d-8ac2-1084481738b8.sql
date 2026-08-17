
-- Criar tabela para tarefas do calendário
CREATE TABLE public.calendar_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_andamento', 'concluido')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para cards de conteúdo
CREATE TABLE public.content_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.calendar_tasks(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'reel', 'story', 'carrossel')),
  topic TEXT NOT NULL,
  script_id UUID,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'pronto', 'publicado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS (Row Level Security) para ambas as tabelas
ALTER TABLE public.calendar_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_cards ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para calendar_tasks
CREATE POLICY "Users can view their own calendar tasks" 
  ON public.calendar_tasks 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar tasks" 
  ON public.calendar_tasks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar tasks" 
  ON public.calendar_tasks 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar tasks" 
  ON public.calendar_tasks 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Políticas RLS para content_cards (através da relação com calendar_tasks)
CREATE POLICY "Users can view content cards of their tasks" 
  ON public.content_cards 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.calendar_tasks 
    WHERE calendar_tasks.id = content_cards.task_id 
    AND calendar_tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can create content cards for their tasks" 
  ON public.content_cards 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_tasks 
    WHERE calendar_tasks.id = content_cards.task_id 
    AND calendar_tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can update content cards of their tasks" 
  ON public.content_cards 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.calendar_tasks 
    WHERE calendar_tasks.id = content_cards.task_id 
    AND calendar_tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete content cards of their tasks" 
  ON public.content_cards 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.calendar_tasks 
    WHERE calendar_tasks.id = content_cards.task_id 
    AND calendar_tasks.user_id = auth.uid()
  ));

-- Criar índices para melhor performance
CREATE INDEX idx_calendar_tasks_user_id ON public.calendar_tasks(user_id);
CREATE INDEX idx_calendar_tasks_date ON public.calendar_tasks(date);
CREATE INDEX idx_content_cards_task_id ON public.content_cards(task_id);

-- Criar triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_calendar_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_content_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_tasks_updated_at
  BEFORE UPDATE ON public.calendar_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_calendar_tasks_updated_at();

CREATE TRIGGER update_content_cards_updated_at
  BEFORE UPDATE ON public.content_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_content_cards_updated_at();
;
