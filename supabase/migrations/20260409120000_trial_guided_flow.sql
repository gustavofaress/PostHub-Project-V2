alter table if exists public.user_onboarding
  add column if not exists guided_current_step text default 'references';

alter table if exists public.user_onboarding
  add column if not exists guided_steps_completed text[] not null default '{}';

alter table if exists public.user_onboarding
  add column if not exists guided_flow_completed_at timestamptz;
