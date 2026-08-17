
-- Verificar se existem registros com user_id nulo
SELECT 
  id,
  user_id,
  title,
  status,
  created_at
FROM public.editorial_calendar 
WHERE user_id IS NULL
ORDER BY created_at DESC;

-- Verificar estatísticas gerais da tabela
SELECT 
  COUNT(*) as total_tasks,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_ids
FROM public.editorial_calendar;

-- Verificar os valores de status existentes
SELECT DISTINCT status 
FROM public.editorial_calendar 
ORDER BY status;

-- Verificar se há constraint de check no campo status (versão corrigida)
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.editorial_calendar'::regclass 
  AND contype = 'c';
;
