
-- Limpeza de dados de exemplo/teste das tabelas de métricas
-- Remover todas as métricas manuais existentes (dados de exemplo)
DELETE FROM manual_metrics WHERE created_at < NOW();

-- Remover todas as métricas do Instagram existentes (dados de exemplo)  
DELETE FROM instagram_metrics WHERE created_at < NOW();

-- Resetar as sequences para começar do ID 1 novamente (opcional)
-- Isso garante que os próximos IDs sejam limpos
SELECT setval(pg_get_serial_sequence('manual_metrics', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('instagram_metrics', 'id'), 1, false);
;
