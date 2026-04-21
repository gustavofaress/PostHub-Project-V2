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

create table if not exists public.trial_lead_daily_accesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  access_date date not null,
  first_accessed_at timestamptz not null default timezone('utc', now()),
  last_accessed_at timestamptz not null default timezone('utc', now()),
  access_count integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trial_lead_daily_accesses_access_count_check check (access_count > 0)
);

alter table public.trial_lead_daily_accesses
  add column if not exists access_date date,
  add column if not exists first_accessed_at timestamptz not null default timezone('utc', now()),
  add column if not exists last_accessed_at timestamptz not null default timezone('utc', now()),
  add column if not exists access_count integer not null default 1,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create unique index if not exists trial_lead_daily_accesses_user_date_idx
  on public.trial_lead_daily_accesses (user_id, access_date);

create index if not exists trial_lead_daily_accesses_access_date_idx
  on public.trial_lead_daily_accesses (access_date desc);

create index if not exists trial_lead_daily_accesses_last_accessed_idx
  on public.trial_lead_daily_accesses (last_accessed_at desc);

alter table public.trial_lead_daily_accesses enable row level security;

drop policy if exists "users_and_admins_can_read_trial_lead_daily_accesses" on public.trial_lead_daily_accesses;
create policy "users_and_admins_can_read_trial_lead_daily_accesses"
on public.trial_lead_daily_accesses
for select
to authenticated
using (
  user_id = auth.uid()
  or private.is_current_user_admin()
);

revoke all on public.trial_lead_daily_accesses from anon, authenticated;
grant select on public.trial_lead_daily_accesses to authenticated;
grant all privileges on public.trial_lead_daily_accesses to service_role;

create or replace function public.record_trial_lead_access(p_access_date date default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_access_date date := coalesce(p_access_date, timezone('America/Sao_Paulo', now())::date);
  v_today date := timezone('America/Sao_Paulo', now())::date;
  v_current_plan text;
  v_trial_started_at timestamptz;
  v_trial_expires_at timestamptz;
  v_is_admin boolean;
begin
  if v_user_id is null then
    return;
  end if;

  select
    current_plan,
    trial_started_at,
    trial_expires_at,
    coalesce(is_admin, false)
  into
    v_current_plan,
    v_trial_started_at,
    v_trial_expires_at,
    v_is_admin
  from public.usuarios
  where id = v_user_id;

  if v_is_admin then
    return;
  end if;

  if coalesce(lower(trim(v_current_plan)), '') not in ('start_7', 'teste', 'trial') then
    return;
  end if;

  if v_trial_expires_at is not null and v_trial_expires_at < timezone('utc', now()) then
    return;
  end if;

  if v_access_date > v_today then
    v_access_date := v_today;
  end if;

  if v_trial_started_at is not null and v_access_date < timezone('America/Sao_Paulo', v_trial_started_at)::date then
    v_access_date := timezone('America/Sao_Paulo', v_trial_started_at)::date;
  end if;

  insert into public.trial_lead_daily_accesses (
    user_id,
    access_date,
    first_accessed_at,
    last_accessed_at,
    access_count,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    v_access_date,
    timezone('utc', now()),
    timezone('utc', now()),
    1,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (user_id, access_date) do update
    set
      last_accessed_at = timezone('utc', now()),
      access_count = public.trial_lead_daily_accesses.access_count + 1,
      updated_at = timezone('utc', now());
end;
$$;

revoke all on function public.record_trial_lead_access(date) from public;
grant execute on function public.record_trial_lead_access(date) to authenticated;
