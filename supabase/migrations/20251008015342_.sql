-- Atualizar as métricas do Instagram para datas dentro da semana atual
-- Como temos apenas 1 registro, vamos colocá-lo na data de hoje

UPDATE instagram_metrics
SET date = CURRENT_DATE,
    updated_at = NOW()
WHERE customer_id = '17cabb6e-0b5e-4b43-800e-9ae17b0d0823';;
