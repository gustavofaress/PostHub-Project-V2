
-- Atualizar tabelas que referenciam o ID antigo
UPDATE public.client_profiles 
SET user_id = '20bd2a2a-a075-49c9-8872-9b30f164a9b8'
WHERE user_id = '7f3232a6-74cf-4a5d-8587-eabf31701ad8';

UPDATE public.email_confirmations 
SET user_id = '20bd2a2a-a075-49c9-8872-9b30f164a9b8'
WHERE user_id = '7f3232a6-74cf-4a5d-8587-eabf31701ad8';

UPDATE public.profile_subscriptions 
SET user_id = '20bd2a2a-a075-49c9-8872-9b30f164a9b8'
WHERE user_id = '7f3232a6-74cf-4a5d-8587-eabf31701ad8';

UPDATE public.script_drafts 
SET user_id = '20bd2a2a-a075-49c9-8872-9b30f164a9b8'
WHERE user_id = '7f3232a6-74cf-4a5d-8587-eabf31701ad8';

UPDATE public.scheduled_posts 
SET user_id = '20bd2a2a-a075-49c9-8872-9b30f164a9b8'
WHERE user_id = '7f3232a6-74cf-4a5d-8587-eabf31701ad8';

UPDATE public.calendar_tasks 
SET user_id = '20bd2a2a-a075-49c9-8872-9b30f164a9b8'
WHERE user_id = '7f3232a6-74cf-4a5d-8587-eabf31701ad8';

UPDATE public.editorial_calendar 
SET user_id = '20bd2a2a-a075-49c9-8872-9b30f164a9b8'
WHERE user_id = '7f3232a6-74cf-4a5d-8587-eabf31701ad8';

UPDATE public.ideas 
SET user_id = '20bd2a2a-a075-49c9-8872-9b30f164a9b8'
WHERE user_id = '7f3232a6-74cf-4a5d-8587-eabf31701ad8';

-- Atualizar o registro principal por último
UPDATE public.usuarios 
SET id = '20bd2a2a-a075-49c9-8872-9b30f164a9b8'
WHERE id = '7f3232a6-74cf-4a5d-8587-eabf31701ad8';
;
