create table if not exists public.profile_entitlements (
  profile_id uuid primary key references public.client_profiles(id) on delete cascade,
  plan_code text not null check (
    plan_code in ('free', 'pro', 'legacy_start', 'legacy_growth', 'legacy_pro')
  ),
  source text not null check (
    source in ('default_free', 'legacy_snapshot', 'stripe')
  ),
  subscription_ref text,
  effective_from timestamptz not null default timezone('utc', now()),
  effective_until timestamptz,
  calendar_enabled boolean not null,
  kanban_enabled boolean not null,
  references_enabled boolean not null,
  metrics_enabled boolean not null,
  social_analytics_enabled boolean not null,
  approval_enabled boolean not null,
  approval_link_creation_enabled boolean not null,
  max_additional_members integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profile_entitlements_effective_window_check
    check (effective_until is null or effective_until >= effective_from),
  constraint profile_entitlements_max_additional_members_check
    check (max_additional_members is null or max_additional_members >= 0)
);

drop trigger if exists update_profile_entitlements_updated_at on public.profile_entitlements;
create trigger update_profile_entitlements_updated_at
  before update on public.profile_entitlements
  for each row
  execute function public.update_updated_at_column();

alter table public.profile_entitlements enable row level security;

drop policy if exists "Users can read entitlements for accessible profiles" on public.profile_entitlements;
create policy "Users can read entitlements for accessible profiles"
  on public.profile_entitlements
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

revoke all on public.profile_entitlements from anon, authenticated;
grant select on public.profile_entitlements to authenticated;
grant all privileges on public.profile_entitlements to service_role;
