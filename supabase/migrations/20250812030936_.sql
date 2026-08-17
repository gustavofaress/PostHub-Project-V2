-- Corrigir o user_id da tabela youtube_metrics
UPDATE youtube_metrics 
SET user_id = '17cabb6e-0b5e-4b43-800e-9ae17b0d0823' 
WHERE user_id = '00000000-0000-0000-0000-000000000000';;
