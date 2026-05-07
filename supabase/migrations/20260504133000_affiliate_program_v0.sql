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

create or replace function public.normalize_affiliate_code(p_value text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(lower(trim(coalesce(p_value, ''))), '[^a-z0-9_-]+', '', 'g'),
    ''
  );
$$;

alter table public.usuarios
  add column if not exists is_affiliate_partner boolean not null default false,
  add column if not exists affiliate_code text,
  add column if not exists affiliate_commission_percent numeric(5, 2) not null default 30.00,
  add column if not exists affiliate_access_granted_at timestamptz,
  add column if not exists referred_by_affiliate_user_id uuid references public.usuarios(id) on delete set null,
  add column if not exists referred_by_affiliate_code text,
  add column if not exists affiliate_attributed_at timestamptz,
  add column if not exists affiliate_locked_at timestamptz;

update public.usuarios
set affiliate_commission_percent = 30.00
where affiliate_commission_percent is null;

drop index if exists usuarios_affiliate_code_unique_idx;
create unique index if not exists usuarios_affiliate_code_unique_idx
  on public.usuarios (lower(affiliate_code))
  where affiliate_code is not null;

create index if not exists usuarios_referred_by_affiliate_user_id_idx
  on public.usuarios (referred_by_affiliate_user_id)
  where referred_by_affiliate_user_id is not null;

create index if not exists usuarios_affiliate_locked_at_idx
  on public.usuarios (affiliate_locked_at desc)
  where affiliate_locked_at is not null;

alter table public.usuarios
  drop constraint if exists usuarios_affiliate_code_format_check;

alter table public.usuarios
  add constraint usuarios_affiliate_code_format_check
  check (
    affiliate_code is null
    or affiliate_code = public.normalize_affiliate_code(affiliate_code)
    and char_length(affiliate_code) between 3 and 50
  );

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.usuarios(id) on delete cascade,
  referred_user_id uuid references public.usuarios(id) on delete set null,
  referred_user_email text,
  affiliate_code text not null,
  stripe_customer_id text,
  stripe_subscription_id text not null,
  stripe_invoice_id text not null unique,
  stripe_checkout_session_id text,
  plan_id text,
  currency text not null default 'brl',
  gross_amount integer not null,
  commission_percent numeric(5, 2) not null,
  commission_amount integer not null,
  status text not null default 'pending',
  first_paid_at timestamptz not null,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint affiliate_commissions_status_check check (status in ('pending', 'paid', 'canceled')),
  constraint affiliate_commissions_amount_check check (gross_amount >= 0 and commission_amount >= 0),
  constraint affiliate_commissions_percent_check check (commission_percent > 0 and commission_percent <= 100),
  constraint affiliate_commissions_subscription_unique unique (stripe_subscription_id)
);

alter table public.affiliate_commissions
  add column if not exists referred_user_email text,
  add column if not exists affiliate_code text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists plan_id text,
  add column if not exists currency text not null default 'brl',
  add column if not exists gross_amount integer,
  add column if not exists commission_percent numeric(5, 2),
  add column if not exists commission_amount integer,
  add column if not exists status text not null default 'pending',
  add column if not exists first_paid_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.affiliate_commissions
set currency = 'brl'
where currency is null;

create index if not exists affiliate_commissions_affiliate_user_id_idx
  on public.affiliate_commissions (affiliate_user_id, created_at desc);

create index if not exists affiliate_commissions_status_idx
  on public.affiliate_commissions (status, created_at desc);

create or replace function public.set_affiliate_commissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_affiliate_commissions_updated_at on public.affiliate_commissions;
create trigger set_affiliate_commissions_updated_at
  before update on public.affiliate_commissions
  for each row
  execute function public.set_affiliate_commissions_updated_at();

alter table public.affiliate_commissions enable row level security;

drop policy if exists "admins_can_read_affiliate_commissions" on public.affiliate_commissions;
create policy "admins_can_read_affiliate_commissions"
  on public.affiliate_commissions
  for select
  to authenticated
  using (private.is_current_user_admin());

revoke all on public.affiliate_commissions from anon, authenticated;
grant select on public.affiliate_commissions to authenticated;
grant all privileges on public.affiliate_commissions to service_role;

create or replace function public.apply_affiliate_referral(p_affiliate_code text)
returns table (
  applied boolean,
  locked boolean,
  reason text,
  affiliate_user_id uuid,
  affiliate_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_affiliate_code text := public.normalize_affiliate_code(p_affiliate_code);
  v_target_user public.usuarios%rowtype;
  v_affiliate_user public.usuarios%rowtype;
begin
  if v_user_id is null then
    return query select false, false, 'unauthenticated', null::uuid, null::text;
    return;
  end if;

  if v_affiliate_code is null or char_length(v_affiliate_code) < 3 then
    return query select false, false, 'invalid_code', null::uuid, null::text;
    return;
  end if;

  select *
  into v_target_user
  from public.usuarios
  where id = v_user_id
  for update;

  if not found then
    return query select false, false, 'user_not_found', null::uuid, null::text;
    return;
  end if;

  if v_target_user.affiliate_locked_at is not null then
    return query
    select false, true, 'locked', v_target_user.referred_by_affiliate_user_id, v_target_user.referred_by_affiliate_code;
    return;
  end if;

  select *
  into v_affiliate_user
  from public.usuarios
  where is_affiliate_partner = true
    and lower(affiliate_code) = v_affiliate_code
  limit 1;

  if not found then
    return query select false, false, 'affiliate_not_found', null::uuid, null::text;
    return;
  end if;

  if v_affiliate_user.id = v_user_id then
    return query select false, false, 'self_referral', v_affiliate_user.id, v_affiliate_user.affiliate_code;
    return;
  end if;

  if v_affiliate_user.email is not null
     and v_target_user.email is not null
     and lower(v_affiliate_user.email) = lower(v_target_user.email) then
    return query select false, false, 'self_referral', v_affiliate_user.id, v_affiliate_user.affiliate_code;
    return;
  end if;

  update public.usuarios
  set
    referred_by_affiliate_user_id = v_affiliate_user.id,
    referred_by_affiliate_code = v_affiliate_user.affiliate_code,
    affiliate_attributed_at = timezone('utc', now())
  where id = v_user_id;

  return query
  select true, false, 'applied', v_affiliate_user.id, v_affiliate_user.affiliate_code;
end;
$$;

revoke all on function public.apply_affiliate_referral(text) from public;
grant execute on function public.apply_affiliate_referral(text) to authenticated;

create or replace function public.admin_upsert_affiliate_partner(
  p_email text,
  p_affiliate_code text,
  p_commission_percent numeric default 30.00,
  p_grant_product_access boolean default true
)
returns table (
  user_id uuid,
  email text,
  affiliate_code text,
  is_affiliate_partner boolean,
  affiliate_commission_percent numeric,
  affiliate_access_granted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_affiliate_code text := public.normalize_affiliate_code(p_affiliate_code);
  v_commission_percent numeric := coalesce(p_commission_percent, 30.00);
begin
  if not private.is_current_user_admin() then
    raise exception 'Somente administradores podem cadastrar afiliados.';
  end if;

  if v_email is null then
    raise exception 'Informe o email do afiliado.';
  end if;

  if v_affiliate_code is null or char_length(v_affiliate_code) < 3 then
    raise exception 'Informe um codigo de afiliado valido com pelo menos 3 caracteres.';
  end if;

  if v_commission_percent <= 0 or v_commission_percent > 100 then
    raise exception 'A comissao do afiliado deve ficar entre 0 e 100.';
  end if;

  return query
  with target_user as (
    select id
    from public.usuarios
    where lower(coalesce(email, '')) = v_email
    limit 1
  ),
  updated_user as (
    update public.usuarios
    set
      is_affiliate_partner = true,
      affiliate_code = v_affiliate_code,
      affiliate_commission_percent = v_commission_percent,
      affiliate_access_granted_at = case
        when p_grant_product_access then coalesce(affiliate_access_granted_at, timezone('utc', now()))
        else affiliate_access_granted_at
      end
    where id = (select id from target_user)
    returning
      id,
      public.usuarios.email,
      public.usuarios.affiliate_code,
      public.usuarios.is_affiliate_partner,
      public.usuarios.affiliate_commission_percent,
      public.usuarios.affiliate_access_granted_at
  )
  select
    updated_user.id,
    updated_user.email,
    updated_user.affiliate_code,
    updated_user.is_affiliate_partner,
    updated_user.affiliate_commission_percent,
    updated_user.affiliate_access_granted_at
  from updated_user;

  if not found then
    raise exception 'Nenhum usuario encontrado com esse email. Peca para o afiliado criar a conta primeiro.';
  end if;
end;
$$;

revoke all on function public.admin_upsert_affiliate_partner(text, text, numeric, boolean) from public;
grant execute on function public.admin_upsert_affiliate_partner(text, text, numeric, boolean) to authenticated;

create or replace function public.admin_update_affiliate_commission_status(
  p_commission_id uuid,
  p_status text
)
returns table (
  id uuid,
  status text,
  paid_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := lower(trim(coalesce(p_status, '')));
begin
  if not private.is_current_user_admin() then
    raise exception 'Somente administradores podem atualizar comissoes.';
  end if;

  if v_status not in ('pending', 'paid', 'canceled') then
    raise exception 'Status de comissao invalido.';
  end if;

  return query
  update public.affiliate_commissions
  set
    status = v_status,
    paid_at = case
      when v_status = 'paid' then coalesce(paid_at, timezone('utc', now()))
      else null
    end,
    updated_at = timezone('utc', now())
  where id = p_commission_id
  returning
    public.affiliate_commissions.id,
    public.affiliate_commissions.status,
    public.affiliate_commissions.paid_at;

  if not found then
    raise exception 'Comissao nao encontrada.';
  end if;
end;
$$;

revoke all on function public.admin_update_affiliate_commission_status(uuid, text) from public;
grant execute on function public.admin_update_affiliate_commission_status(uuid, text) to authenticated;
