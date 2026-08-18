-- Manual operational SQL for the PostHub Social Analytics scheduled sync.
-- Run this only after:
-- 1. The migration 20260818112503_social_sync_scheduled_cron_infrastructure.sql has been applied.
-- 2. The Edge Function social-sync-scheduled has been deployed.
-- 3. The function configuration verify_jwt = false is active.
-- 4. A Supabase Secret Key named automations exists in the project API keys settings.
--
-- Replace {{POSTHUB_AUTOMATIONS_SECRET_KEY}} before execution.
-- Do not commit the real key value back to the repository.

do $$
declare
  existing_secret_id uuid;
begin
  select id
  into existing_secret_id
  from vault.decrypted_secrets
  where name = 'posthub_project_url'
  limit 1;

  if existing_secret_id is null then
    perform vault.create_secret(
      'https://wzdlxojiuflixigyxkap.supabase.co',
      'posthub_project_url',
      'PostHub project URL used by the Social Analytics scheduled sync cron job'
    );
  else
    perform vault.update_secret(
      existing_secret_id,
      'https://wzdlxojiuflixigyxkap.supabase.co',
      'posthub_project_url',
      'PostHub project URL used by the Social Analytics scheduled sync cron job'
    );
  end if;
end
$$;

do $$
declare
  existing_secret_id uuid;
begin
  select id
  into existing_secret_id
  from vault.decrypted_secrets
  where name = 'posthub_automations_secret_key'
  limit 1;

  if existing_secret_id is null then
    perform vault.create_secret(
      '{{POSTHUB_AUTOMATIONS_SECRET_KEY}}',
      'posthub_automations_secret_key',
      'Supabase Secret Key named automations used by the Social Analytics scheduled sync cron job'
    );
  else
    perform vault.update_secret(
      existing_secret_id,
      '{{POSTHUB_AUTOMATIONS_SECRET_KEY}}',
      'posthub_automations_secret_key',
      'Supabase Secret Key named automations used by the Social Analytics scheduled sync cron job'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'posthub_project_url'
  ) then
    raise exception 'Vault secret posthub_project_url is missing.';
  end if;

  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'posthub_automations_secret_key'
  ) then
    raise exception 'Vault secret posthub_automations_secret_key is missing.';
  end if;
end
$$;

select cron.schedule(
  'posthub-social-sync-every-6-hours',
  '0 */6 * * *',
  $$
  select
    net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'posthub_project_url' limit 1) || '/functions/v1/social-sync-scheduled',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'posthub_automations_secret_key' limit 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    ) as request_id;
  $$
);

select
  jobid,
  jobname,
  schedule,
  active
from cron.job
where jobname = 'posthub-social-sync-every-6-hours';

select
  id,
  name,
  description,
  updated_at
from vault.decrypted_secrets
where name in ('posthub_project_url', 'posthub_automations_secret_key')
order by name asc;
