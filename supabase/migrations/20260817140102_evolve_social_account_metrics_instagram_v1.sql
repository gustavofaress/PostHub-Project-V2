do $$
begin
  if exists (
    select 1
    from (
      select connection_id, metric_date
      from public.social_account_metrics
      where connection_id is not null
        and metric_date is not null
      group by connection_id, metric_date
      having count(*) > 1
    ) duplicate_metric_keys
  ) then
    raise exception
      'Cannot add social_account_metrics_connection_metric_date_key: duplicate connection_id + metric_date rows exist.';
  end if;
end
$$;

alter table public.social_account_metrics
  add column if not exists datasource text,
  add column if not exists followers_count bigint,
  add column if not exists follower_count_1d bigint,
  add column if not exists reach_1d bigint,
  add column if not exists impressions_1d bigint,
  add column if not exists accounts_engaged bigint,
  add column if not exists likes bigint,
  add column if not exists comments bigint,
  add column if not exists saves bigint,
  add column if not exists shares bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.social_account_metrics'::regclass
      and conname = 'social_account_metrics_connection_metric_date_key'
  ) then
    alter table public.social_account_metrics
      add constraint social_account_metrics_connection_metric_date_key
      unique (connection_id, metric_date);
  end if;
end
$$;

create index if not exists social_account_metrics_profile_metric_date_desc_idx
  on public.social_account_metrics (profile_id, metric_date desc);

create index if not exists social_account_metrics_profile_connection_metric_date_desc_idx
  on public.social_account_metrics (profile_id, connection_id, metric_date desc);
