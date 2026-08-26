create table if not exists public.profile_stripe_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.client_profiles(id) on delete restrict,
  purchased_by_user_id uuid not null references auth.users(id) on delete restrict,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  checkout_expires_at timestamptz,
  stripe_subscription_id text,
  stripe_price_id text not null,
  status text not null
    check (
      status in (
        'checkout_pending',
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'paused'
      )
    ),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_stripe_event_id text,
  last_stripe_event_created bigint,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profile_stripe_subscriptions_subscription_unique
    unique (stripe_subscription_id),
  constraint profile_stripe_subscriptions_checkout_session_unique
    unique (stripe_checkout_session_id),
  constraint profile_stripe_subscriptions_last_event_created_check
    check (last_stripe_event_created is null or last_stripe_event_created >= 0)
);

create index if not exists profile_stripe_subscriptions_profile_id_idx
  on public.profile_stripe_subscriptions (profile_id, created_at desc);

create unique index if not exists profile_stripe_subscriptions_current_profile_unique_idx
  on public.profile_stripe_subscriptions (profile_id)
  where status in ('checkout_pending', 'incomplete', 'trialing', 'active', 'past_due', 'paused');

drop trigger if exists update_profile_stripe_subscriptions_updated_at on public.profile_stripe_subscriptions;
create trigger update_profile_stripe_subscriptions_updated_at
  before update on public.profile_stripe_subscriptions
  for each row
  execute function public.update_updated_at_column();

alter table public.profile_stripe_subscriptions enable row level security;

drop policy if exists "Service role full access to profile stripe subscriptions" on public.profile_stripe_subscriptions;
create policy "Service role full access to profile stripe subscriptions"
  on public.profile_stripe_subscriptions
  for all
  to service_role
  using (true)
  with check (true);

revoke all on public.profile_stripe_subscriptions from anon, authenticated;
grant all privileges on public.profile_stripe_subscriptions to service_role;
