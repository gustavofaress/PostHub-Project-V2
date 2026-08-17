
ALTER TABLE editorial_calendar DROP CONSTRAINT IF EXISTS editorial_calendar_status_check;

ALTER TABLE editorial_calendar ADD CONSTRAINT editorial_calendar_status_check 
  CHECK (status = ANY (ARRAY['rascunho', 'em_producao', 'em_revisao', 'agendado', 'publicado', 'concluido']));

-- Migrar tarefas existentes com status 'revisao' para 'em_revisao'
UPDATE editorial_calendar SET status = 'em_revisao' WHERE status = 'revisao';
;
