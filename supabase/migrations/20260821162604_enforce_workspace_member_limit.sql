create schema if not exists private;

create or replace function private.enforce_workspace_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_limit integer;
  current_count integer;
  consumes_new_slot boolean := false;
begin
  if tg_op = 'INSERT' then
    consumes_new_slot := new.status in ('invited', 'active');
  elsif tg_op = 'UPDATE' then
    consumes_new_slot := (
      new.status in ('invited', 'active')
      and (
        old.status not in ('invited', 'active')
        or old.profile_id is distinct from new.profile_id
      )
    );
  end if;

  if not consumes_new_slot then
    return new;
  end if;

  perform 1
  from public.client_profiles
  where id = new.profile_id
  for update;

  select pe.max_additional_members
    into target_limit
  from public.profile_entitlements pe
  where pe.profile_id = new.profile_id;

  if not found then
    return new;
  end if;

  if target_limit is null then
    return new;
  end if;

  select count(*)
    into current_count
  from public.workspace_members wm
  where wm.profile_id = new.profile_id
    and wm.status in ('invited', 'active');

  if current_count >= target_limit then
    raise exception using
      errcode = 'P0001',
      message = 'Limite de membros deste workspace atingido.',
      detail = 'MEMBER_LIMIT_REACHED',
      hint = 'Desative ou remova um membro para liberar vaga.';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_workspace_member_limit() from public;

drop trigger if exists enforce_workspace_member_limit on public.workspace_members;
create trigger enforce_workspace_member_limit
  before insert or update of status, profile_id on public.workspace_members
  for each row
  execute function private.enforce_workspace_member_limit();
