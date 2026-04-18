create extension if not exists pgcrypto;

create table if not exists public.support_password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  used_at timestamptz,
  revoked_at timestamptz,
  constraint support_password_reset_tokens_email_check
    check (email = lower(btrim(email)) and position('@' in email) > 1)
);

create index if not exists support_password_reset_tokens_auth_user_id_idx
  on public.support_password_reset_tokens (auth_user_id);

create index if not exists support_password_reset_tokens_email_idx
  on public.support_password_reset_tokens (email);

create index if not exists support_password_reset_tokens_active_lookup_idx
  on public.support_password_reset_tokens (token_hash, expires_at)
  where used_at is null and revoked_at is null;

alter table public.support_password_reset_tokens enable row level security;

revoke all on public.support_password_reset_tokens from anon, authenticated;
grant all privileges on public.support_password_reset_tokens to service_role;
