
-- Exclusão segura de registros de teste nas tabelas de performance
-- IMPORTANTE: Estas operações respeitam as RLS policies e só afetam o usuário atual

-- 1. Excluir registros de teste da tabela performance_metrics
DELETE FROM performance_metrics 
WHERE (
  -- Títulos com palavras-chave de teste
  LOWER(title) LIKE '%teste%' 
  OR LOWER(title) LIKE '%test%'
  OR LOWER(title) LIKE '%demo%'
  OR LOWER(title) LIKE '%exemplo%'
  OR LOWER(title) LIKE '%sample%'
  
  -- Valores exagerados
  OR reach > 100000 
  OR impressions > 500000 
  OR likes > 10000
  
  -- Registros muito antigos
  OR date < '2024-01-01'
  OR created_at < '2024-01-01'
  
  -- Strategic notes com menções a teste
  OR (strategic_notes IS NOT NULL AND (
    LOWER(strategic_notes) LIKE '%teste%' 
    OR LOWER(strategic_notes) LIKE '%test%'
    OR LOWER(strategic_notes) LIKE '%demo%'
    OR LOWER(strategic_notes) LIKE '%exemplo%'
  ))
  
  -- Registros completamente zerados
  OR (reach = 0 AND impressions = 0 AND likes = 0)
  
  -- Registros criados hoje com padrão suspeito (valores muito baixos ou altos)
  OR (DATE(created_at) = CURRENT_DATE AND (
    reach > 50000 OR likes > 5000 OR 
    (reach < 10 AND impressions < 10 AND likes < 5)
  ))
);

-- 2. Excluir registros de teste da tabela instagram_metrics
DELETE FROM instagram_metrics 
WHERE (
  -- Títulos com palavras-chave de teste
  LOWER(title) LIKE '%teste%' 
  OR LOWER(title) LIKE '%test%'
  OR LOWER(title) LIKE '%demo%'
  OR LOWER(title) LIKE '%exemplo%'
  OR LOWER(title) LIKE '%sample%'
  
  -- Valores exagerados para Instagram
  OR reach > 50000 
  OR impressions > 200000 
  OR likes > 5000
  OR views > 100000
  
  -- Registros muito antigos
  OR post_date < '2024-01-01'
  OR created_at < '2024-01-01'
  
  -- Registros completamente zerados
  OR (reach = 0 AND impressions = 0 AND likes = 0 AND views = 0)
  
  -- Registros criados hoje com padrão suspeito
  OR (DATE(created_at) = CURRENT_DATE AND (
    reach > 25000 OR likes > 2500 OR views > 50000 OR
    (reach < 10 AND impressions < 10 AND likes < 5)
  ))
);

-- 3. Excluir registros de teste da tabela manual_metrics
DELETE FROM manual_metrics 
WHERE (
  -- Títulos com palavras-chave de teste
  LOWER(title) LIKE '%teste%' 
  OR LOWER(title) LIKE '%test%'
  OR LOWER(title) LIKE '%demo%'
  OR LOWER(title) LIKE '%exemplo%'
  OR LOWER(title) LIKE '%sample%'
  OR LOWER(contenttitle) LIKE '%teste%'
  OR LOWER(contenttitle) LIKE '%test%'
  OR LOWER(contenttitle) LIKE '%demo%'
  
  -- Valores exagerados
  OR reach > 50000 
  OR impressions > 200000 
  OR likes > 5000
  OR views > 100000
  
  -- Registros muito antigos
  OR post_date < '2024-01-01'
  OR created_at < '2024-01-01'
  
  -- Registros completamente zerados
  OR (reach = 0 AND impressions = 0 AND likes = 0 AND views = 0)
  
  -- Registros criados hoje com padrão suspeito
  OR (DATE(created_at) = CURRENT_DATE AND (
    reach > 25000 OR likes > 2500 OR views > 50000 OR
    (reach < 10 AND impressions < 10 AND likes < 5)
  ))
);

-- 4. Verificação final - contar quantos registros restaram em cada tabela
SELECT 'performance_metrics' as tabela, COUNT(*) as registros_restantes FROM performance_metrics
UNION ALL
SELECT 'instagram_metrics' as tabela, COUNT(*) as registros_restantes FROM instagram_metrics  
UNION ALL
SELECT 'manual_metrics' as tabela, COUNT(*) as registros_restantes FROM manual_metrics;
;
