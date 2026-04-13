create table if not exists public.profile_purchase_credits (
  id bigserial primary key,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  stripe_event_id text not null unique,
  stripe_checkout_session_id text not null unique,
  stripe_customer_email text,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists profile_purchase_credits_user_id_created_at_idx
  on public.profile_purchase_credits (user_id, created_at desc);

alter table public.profile_purchase_credits enable row level security;

drop policy if exists "Users can read own profile purchase credits" on public.profile_purchase_credits;
create policy "Users can read own profile purchase credits"
  on public.profile_purchase_credits
  for select
  to authenticated
  using (auth.uid() = user_id);
