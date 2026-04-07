create extension if not exists pgcrypto;

create table if not exists public.contas_instagram (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  page_id text not null,
  instagram_user_id text not null,
  username text,
  profile_picture_url text,
  access_token text not null,
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  last_sync_status text not null default 'pending',
  last_sync_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, instagram_user_id)
);

alter table public.contas_instagram
  add column if not exists token_expires_at timestamptz,
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_sync_status text not null default 'pending',
  add column if not exists last_sync_error text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create index if not exists contas_instagram_profile_id_idx
  on public.contas_instagram (profile_id);

create index if not exists contas_instagram_user_id_idx
  on public.contas_instagram (user_id);

alter table public.contas_instagram enable row level security;

drop policy if exists "Users can read instagram connections for accessible profiles" on public.contas_instagram;
create policy "Users can read instagram connections for accessible profiles"
  on public.contas_instagram
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.workspace_members wm
      where wm.profile_id = contas_instagram.profile_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

revoke all on public.contas_instagram from anon, authenticated;
grant select (
  id,
  user_id,
  profile_id,
  page_id,
  instagram_user_id,
  username,
  profile_picture_url,
  token_expires_at,
  last_synced_at,
  last_sync_status,
  last_sync_error,
  created_at,
  updated_at
) on public.contas_instagram to authenticated;
grant all privileges on public.contas_instagram to service_role;

create table if not exists public.instagram_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_external_id text not null unique,
  metric_scope text not null default 'media' check (metric_scope in ('account', 'media')),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id text not null,
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  page_id text,
  instagram_user_id text,
  media_id text,
  date date,
  data date,
  likes bigint not null default 0,
  comments bigint not null default 0,
  total_interactions bigint not null default 0,
  accounts_engaged bigint not null default 0,
  saves bigint not null default 0,
  shares bigint not null default 0,
  follows bigint not null default 0,
  unfollows bigint not null default 0,
  profile_link_taps bigint not null default 0,
  website_clicks bigint not null default 0,
  profile_views bigint not null default 0,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  impressoes bigint not null default 0,
  alcance bigint not null default 0,
  seguidores bigint not null default 0,
  caption text,
  permalink text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.instagram_metrics
  add column if not exists metric_external_id text,
  add column if not exists metric_scope text not null default 'media',
  add column if not exists user_id uuid,
  add column if not exists instagram_user_id text,
  add column if not exists media_id text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create unique index if not exists instagram_metrics_metric_external_id_idx
  on public.instagram_metrics (metric_external_id);

create index if not exists instagram_metrics_profile_id_idx
  on public.instagram_metrics (profile_id);

create index if not exists instagram_metrics_scope_idx
  on public.instagram_metrics (metric_scope);

alter table public.instagram_metrics enable row level security;

drop policy if exists "Users can read instagram metrics for accessible profiles" on public.instagram_metrics;
create policy "Users can read instagram metrics for accessible profiles"
  on public.instagram_metrics
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.workspace_members wm
      where wm.profile_id = instagram_metrics.profile_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

grant select on public.instagram_metrics to authenticated;
grant all privileges on public.instagram_metrics to service_role;
