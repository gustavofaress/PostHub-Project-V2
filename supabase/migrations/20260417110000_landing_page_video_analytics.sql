create extension if not exists pgcrypto;

create schema if not exists private;

create or replace function private.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios
    where id = auth.uid()
      and coalesce(is_admin, false) = true
  );
$$;

revoke all on function private.is_current_user_admin() from public;
grant execute on function private.is_current_user_admin() to authenticated;

create table if not exists public.landing_page_video_visits (
  id uuid primary key default gen_random_uuid(),
  visit_id text not null unique,
  landing_path text not null default '/lp',
  page_variant text not null default 'focused',
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  max_video_percent numeric(5, 2) not null default 0,
  max_video_seconds numeric(10, 2) not null default 0,
  video_duration_seconds numeric(10, 2),
  video_started_at timestamptz,
  last_video_event_at timestamptz,
  reached_thruplay boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.landing_page_video_visits
  add column if not exists landing_path text not null default '/lp',
  add column if not exists page_variant text not null default 'focused',
  add column if not exists referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists fbclid text,
  add column if not exists max_video_percent numeric(5, 2) not null default 0,
  add column if not exists max_video_seconds numeric(10, 2) not null default 0,
  add column if not exists video_duration_seconds numeric(10, 2),
  add column if not exists video_started_at timestamptz,
  add column if not exists last_video_event_at timestamptz,
  add column if not exists reached_thruplay boolean not null default false,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create unique index if not exists landing_page_video_visits_visit_id_idx
  on public.landing_page_video_visits (visit_id);

create index if not exists landing_page_video_visits_created_at_idx
  on public.landing_page_video_visits (created_at desc);

create index if not exists landing_page_video_visits_path_created_at_idx
  on public.landing_page_video_visits (landing_path, created_at desc);

alter table public.landing_page_video_visits enable row level security;

drop policy if exists "admins_can_read_landing_page_video_visits" on public.landing_page_video_visits;
create policy "admins_can_read_landing_page_video_visits"
on public.landing_page_video_visits
for select
to authenticated
using (private.is_current_user_admin());

revoke all on public.landing_page_video_visits from anon, authenticated;
grant select on public.landing_page_video_visits to authenticated;
grant all privileges on public.landing_page_video_visits to service_role;

create or replace function public.record_landing_page_visit(
  p_visit_id text,
  p_landing_path text default '/lp',
  p_page_variant text default 'focused',
  p_referrer text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_utm_term text default null,
  p_fbclid text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visit_id text := nullif(btrim(p_visit_id), '');
begin
  if v_visit_id is null then
    return;
  end if;

  insert into public.landing_page_video_visits (
    visit_id,
    landing_path,
    page_variant,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    fbclid
  )
  values (
    v_visit_id,
    coalesce(nullif(btrim(p_landing_path), ''), '/lp'),
    coalesce(nullif(btrim(p_page_variant), ''), 'focused'),
    nullif(btrim(p_referrer), ''),
    nullif(btrim(p_utm_source), ''),
    nullif(btrim(p_utm_medium), ''),
    nullif(btrim(p_utm_campaign), ''),
    nullif(btrim(p_utm_content), ''),
    nullif(btrim(p_utm_term), ''),
    nullif(btrim(p_fbclid), '')
  )
  on conflict (visit_id) do update
    set landing_path = excluded.landing_path,
        page_variant = excluded.page_variant,
        referrer = coalesce(public.landing_page_video_visits.referrer, excluded.referrer),
        utm_source = coalesce(public.landing_page_video_visits.utm_source, excluded.utm_source),
        utm_medium = coalesce(public.landing_page_video_visits.utm_medium, excluded.utm_medium),
        utm_campaign = coalesce(public.landing_page_video_visits.utm_campaign, excluded.utm_campaign),
        utm_content = coalesce(public.landing_page_video_visits.utm_content, excluded.utm_content),
        utm_term = coalesce(public.landing_page_video_visits.utm_term, excluded.utm_term),
        fbclid = coalesce(public.landing_page_video_visits.fbclid, excluded.fbclid),
        updated_at = timezone('utc', now());
end;
$$;

create or replace function public.record_landing_page_video_progress(
  p_visit_id text,
  p_video_percent numeric default 0,
  p_video_seconds numeric default 0,
  p_video_duration_seconds numeric default null,
  p_landing_path text default '/lp',
  p_page_variant text default 'focused'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visit_id text := nullif(btrim(p_visit_id), '');
  v_video_percent numeric(5, 2) := greatest(least(coalesce(p_video_percent, 0), 100), 0);
  v_video_seconds numeric(10, 2) := greatest(coalesce(p_video_seconds, 0), 0);
  v_video_duration_seconds numeric(10, 2) := nullif(greatest(coalesce(p_video_duration_seconds, 0), 0), 0);
begin
  if v_visit_id is null then
    return;
  end if;

  insert into public.landing_page_video_visits (
    visit_id,
    landing_path,
    page_variant,
    max_video_percent,
    max_video_seconds,
    video_duration_seconds,
    video_started_at,
    last_video_event_at,
    reached_thruplay
  )
  values (
    v_visit_id,
    coalesce(nullif(btrim(p_landing_path), ''), '/lp'),
    coalesce(nullif(btrim(p_page_variant), ''), 'focused'),
    v_video_percent,
    v_video_seconds,
    v_video_duration_seconds,
    timezone('utc', now()),
    timezone('utc', now()),
    v_video_percent >= 75
  )
  on conflict (visit_id) do update
    set max_video_percent = greatest(public.landing_page_video_visits.max_video_percent, excluded.max_video_percent),
        max_video_seconds = greatest(public.landing_page_video_visits.max_video_seconds, excluded.max_video_seconds),
        video_duration_seconds = case
          when public.landing_page_video_visits.video_duration_seconds is null then excluded.video_duration_seconds
          when excluded.video_duration_seconds is null then public.landing_page_video_visits.video_duration_seconds
          else greatest(public.landing_page_video_visits.video_duration_seconds, excluded.video_duration_seconds)
        end,
        video_started_at = coalesce(public.landing_page_video_visits.video_started_at, excluded.video_started_at),
        last_video_event_at = timezone('utc', now()),
        reached_thruplay = public.landing_page_video_visits.reached_thruplay or excluded.reached_thruplay,
        updated_at = timezone('utc', now());
end;
$$;

grant execute on function public.record_landing_page_visit(text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.record_landing_page_video_progress(text, numeric, numeric, numeric, text, text) to anon, authenticated;
