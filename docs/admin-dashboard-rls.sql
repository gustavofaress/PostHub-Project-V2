-- Policies para permitir leitura global do Admin Dashboard apenas para usuários admin.
-- Execute este SQL no projeto Supabase do ambiente correspondente.
-- Esta versão evita recursão de RLS usando uma função SECURITY DEFINER.

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

alter table public.usuarios enable row level security;
alter table public.user_onboarding enable row level security;

drop policy if exists "admins_can_read_all_usuarios" on public.usuarios;
create policy "admins_can_read_all_usuarios"
on public.usuarios
for select
to authenticated
using (private.is_current_user_admin());

drop policy if exists "admins_can_read_all_user_onboarding" on public.user_onboarding;
create policy "admins_can_read_all_user_onboarding"
on public.user_onboarding
for select
to authenticated
using (private.is_current_user_admin());
