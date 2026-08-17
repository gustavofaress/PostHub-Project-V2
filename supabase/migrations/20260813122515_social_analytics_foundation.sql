create extension if not exists pgcrypto;

create or replace function public.set_social_analytics_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

do $$
declare
  has_legacy_social_connections boolean := false;
  existing_columns text[];
  constraint_record record;
  index_record record;
  renamed_object_name text;
begin
  if to_regclass('public.social_connections') is not null then
    select array_agg(column_name order by column_name)
    into existing_columns
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'social_connections';

    has_legacy_social_connections := coalesce(existing_columns, '{}'::text[]) @> array[
      'user_id',
      'platform',
      'platform_user_id',
      'access_token_encrypted',
      'refresh_token_encrypted'
    ];
  end if;

  if has_legacy_social_connections then
    if to_regclass('public.social_connections_legacy') is not null then
      raise exception
        'Legacy table public.social_connections detected, but public.social_connections_legacy already exists. Resolve manually before applying migration.';
    end if;

    execute 'alter table public.social_connections rename to social_connections_legacy';
    execute 'revoke all on public.social_connections_legacy from anon, authenticated';

    for constraint_record in
      select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'social_connections_legacy'
        and c.conname like 'social_connections%'
    loop
      renamed_object_name := left(
        regexp_replace(
          constraint_record.conname,
          '^social_connections',
          'social_connections_legacy'
        ),
        63
      );

      execute format(
        'alter table public.social_connections_legacy rename constraint %I to %I',
        constraint_record.conname,
        renamed_object_name
      );
    end loop;

    for index_record in
      select idx.relname
      from pg_class idx
      join pg_index i on i.indexrelid = idx.oid
      join pg_class t on t.oid = i.indrelid
      join pg_namespace n on n.oid = idx.relnamespace
      left join pg_constraint c on c.conindid = idx.oid
      where n.nspname = 'public'
        and t.relname = 'social_connections_legacy'
        and idx.relname like 'social_connections%'
        and c.oid is null
    loop
      renamed_object_name := left(
        regexp_replace(
          index_record.relname,
          '^social_connections',
          'social_connections_legacy'
        ),
        63
      );

      execute format(
        'alter index public.%I rename to %I',
        index_record.relname,
        renamed_object_name
      );
    end loop;
  end if;
end;
$$;

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  provider text not null check (provider in ('windsor')),
  platform text not null check (platform in ('instagram', 'youtube', 'tiktok', 'linkedin')),
  provider_datasource text,
  external_account_id text not null,
  external_account_name text,
  external_account_handle text,
  external_account_avatar_url text,
  status text not null default 'active' check (status in ('active', 'disconnected', 'error', 'reauthorization_required')),
  connected_by uuid references auth.users(id) on delete set null,
  provider_metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default timezone('utc', now()),
  disconnected_at timestamptz,
  last_sync_at timestamptz,
  last_successful_sync_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint social_connections_id_profile_id_key unique (id, profile_id),
  constraint social_connections_id_profile_id_platform_key unique (id, profile_id, platform),
  constraint social_connections_id_profile_id_provider_platform_key unique (id, profile_id, provider, platform)
);

create unique index if not exists social_connections_profile_provider_platform_external_account_uidx
  on public.social_connections (profile_id, provider, platform, external_account_id);

create index if not exists social_connections_profile_id_idx
  on public.social_connections (profile_id);

create index if not exists social_connections_platform_idx
  on public.social_connections (platform);

create index if not exists social_connections_provider_idx
  on public.social_connections (provider);

create index if not exists social_connections_external_account_id_idx
  on public.social_connections (external_account_id);

drop trigger if exists set_social_connections_updated_at on public.social_connections;
create trigger set_social_connections_updated_at
  before update on public.social_connections
  for each row
  execute function public.set_social_analytics_updated_at();

create table if not exists public.social_connection_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  provider text not null check (provider in ('windsor')),
  platform text not null check (platform in ('instagram', 'youtube', 'tiktok', 'linkedin')),
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'awaiting_account_selection', 'completed', 'expired', 'failed', 'cancelled')),
  provider_correlation_secret_encrypted text,
  expires_at timestamptz,
  last_checked_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists social_connection_attempts_profile_id_idx
  on public.social_connection_attempts (profile_id);

create index if not exists social_connection_attempts_provider_platform_idx
  on public.social_connection_attempts (provider, platform);

create index if not exists social_connection_attempts_status_idx
  on public.social_connection_attempts (status);

drop trigger if exists set_social_connection_attempts_updated_at on public.social_connection_attempts;
create trigger set_social_connection_attempts_updated_at
  before update on public.social_connection_attempts
  for each row
  execute function public.set_social_analytics_updated_at();

create table if not exists public.social_content (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  connection_id uuid not null,
  platform text not null check (platform in ('instagram', 'youtube', 'tiktok', 'linkedin')),
  external_content_id text not null,
  content_type text,
  title text,
  caption text,
  permalink text,
  thumbnail_url text,
  media_url text,
  published_at timestamptz,
  platform_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint social_content_connection_profile_platform_fkey
    foreign key (connection_id, profile_id, platform)
    references public.social_connections (id, profile_id, platform)
    on delete cascade,
  constraint social_content_id_profile_id_connection_id_key unique (id, profile_id, connection_id)
);

create unique index if not exists social_content_connection_external_content_uidx
  on public.social_content (connection_id, external_content_id);

create index if not exists social_content_profile_id_idx
  on public.social_content (profile_id);

create index if not exists social_content_connection_id_idx
  on public.social_content (connection_id);

create index if not exists social_content_platform_idx
  on public.social_content (platform);

create index if not exists social_content_external_content_id_idx
  on public.social_content (external_content_id);

drop trigger if exists set_social_content_updated_at on public.social_content;
create trigger set_social_content_updated_at
  before update on public.social_content
  for each row
  execute function public.set_social_analytics_updated_at();

create table if not exists public.social_content_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  connection_id uuid not null,
  content_id uuid not null,
  views bigint,
  reach bigint,
  impressions bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  engagement numeric,
  watch_time numeric,
  average_watch_time numeric,
  clicks bigint,
  platform_metrics jsonb not null default '{}'::jsonb,
  raw_data jsonb not null default '{}'::jsonb,
  period_start date,
  period_end date,
  snapshot_at timestamptz,
  fetched_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint social_content_metrics_content_profile_connection_fkey
    foreign key (content_id, profile_id, connection_id)
    references public.social_content (id, profile_id, connection_id)
    on delete cascade
);

create index if not exists social_content_metrics_profile_id_idx
  on public.social_content_metrics (profile_id);

create index if not exists social_content_metrics_connection_id_idx
  on public.social_content_metrics (connection_id);

create index if not exists social_content_metrics_content_id_idx
  on public.social_content_metrics (content_id);

create index if not exists social_content_metrics_snapshot_at_idx
  on public.social_content_metrics (snapshot_at);

drop trigger if exists set_social_content_metrics_updated_at on public.social_content_metrics;
create trigger set_social_content_metrics_updated_at
  before update on public.social_content_metrics
  for each row
  execute function public.set_social_analytics_updated_at();

create table if not exists public.social_account_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  connection_id uuid not null,
  followers bigint,
  followers_gained bigint,
  reach bigint,
  views bigint,
  impressions bigint,
  engagement numeric,
  clicks bigint,
  platform_metrics jsonb not null default '{}'::jsonb,
  raw_data jsonb not null default '{}'::jsonb,
  metric_date date,
  fetched_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint social_account_metrics_connection_profile_fkey
    foreign key (connection_id, profile_id)
    references public.social_connections (id, profile_id)
    on delete cascade
);

create index if not exists social_account_metrics_profile_id_idx
  on public.social_account_metrics (profile_id);

create index if not exists social_account_metrics_connection_id_idx
  on public.social_account_metrics (connection_id);

create index if not exists social_account_metrics_metric_date_idx
  on public.social_account_metrics (metric_date);

drop trigger if exists set_social_account_metrics_updated_at on public.social_account_metrics;
create trigger set_social_account_metrics_updated_at
  before update on public.social_account_metrics
  for each row
  execute function public.set_social_analytics_updated_at();

create table if not exists public.social_sync_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  connection_id uuid,
  provider text not null check (provider in ('windsor')),
  platform text not null check (platform in ('instagram', 'youtube', 'tiktok', 'linkedin')),
  sync_type text not null,
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  period_start date,
  period_end date,
  records_received integer,
  records_created integer,
  records_updated integer,
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint social_sync_runs_connection_profile_provider_platform_fkey
    foreign key (connection_id, profile_id, provider, platform)
    references public.social_connections (id, profile_id, provider, platform)
    on delete cascade
);

create index if not exists social_sync_runs_profile_id_idx
  on public.social_sync_runs (profile_id);

create index if not exists social_sync_runs_connection_id_idx
  on public.social_sync_runs (connection_id);

create index if not exists social_sync_runs_provider_platform_idx
  on public.social_sync_runs (provider, platform);

alter table public.social_connections enable row level security;
alter table public.social_connection_attempts enable row level security;
alter table public.social_content enable row level security;
alter table public.social_content_metrics enable row level security;
alter table public.social_account_metrics enable row level security;
alter table public.social_sync_runs enable row level security;

drop policy if exists "Users can read social connections for accessible profiles" on public.social_connections;
create policy "Users can read social connections for accessible profiles"
  on public.social_connections
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

drop policy if exists "Users can read social content for accessible profiles" on public.social_content;
create policy "Users can read social content for accessible profiles"
  on public.social_content
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

drop policy if exists "Users can read social content metrics for accessible profiles" on public.social_content_metrics;
create policy "Users can read social content metrics for accessible profiles"
  on public.social_content_metrics
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

drop policy if exists "Users can read social account metrics for accessible profiles" on public.social_account_metrics;
create policy "Users can read social account metrics for accessible profiles"
  on public.social_account_metrics
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

drop policy if exists "Users can read social sync runs for accessible profiles" on public.social_sync_runs;
create policy "Users can read social sync runs for accessible profiles"
  on public.social_sync_runs
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

revoke all on public.social_connections from anon, authenticated;
revoke all on public.social_connection_attempts from anon, authenticated;
revoke all on public.social_content from anon, authenticated;
revoke all on public.social_content_metrics from anon, authenticated;
revoke all on public.social_account_metrics from anon, authenticated;
revoke all on public.social_sync_runs from anon, authenticated;

grant select on public.social_connections to authenticated;
grant select on public.social_content to authenticated;
grant select on public.social_content_metrics to authenticated;
grant select on public.social_account_metrics to authenticated;
grant select on public.social_sync_runs to authenticated;

grant all privileges on public.social_connections to service_role;
grant all privileges on public.social_connection_attempts to service_role;
grant all privileges on public.social_content to service_role;
grant all privileges on public.social_content_metrics to service_role;
grant all privileges on public.social_account_metrics to service_role;
grant all privileges on public.social_sync_runs to service_role;;
