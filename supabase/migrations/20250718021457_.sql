-- Corrigir o campo email_change que está causando erro
UPDATE auth.users 
SET email_change = ''
WHERE email = 'paulotartarineto@gmail.com' AND email_change IS NULL;;
