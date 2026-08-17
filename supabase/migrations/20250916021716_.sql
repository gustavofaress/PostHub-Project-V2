-- Add kanban_stage column to editorial_calendar table
ALTER TABLE public.editorial_calendar 
ADD COLUMN kanban_stage TEXT DEFAULT 'planejamento';

-- Add check constraint for valid kanban stages
ALTER TABLE public.editorial_calendar 
ADD CONSTRAINT valid_kanban_stage 
CHECK (kanban_stage IN ('planejamento', 'desenvolvimento', 'revisao', 'finalizado'));

-- Create index for better performance on kanban queries
CREATE INDEX idx_editorial_calendar_kanban_stage ON public.editorial_calendar(kanban_stage);

-- Update existing records to have default kanban_stage
UPDATE public.editorial_calendar 
SET kanban_stage = 'planejamento' 
WHERE kanban_stage IS NULL;;
