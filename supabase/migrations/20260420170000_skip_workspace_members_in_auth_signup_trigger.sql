create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  is_workspace_member boolean := coalesce((metadata ->> 'workspace_member')::boolean, false);
  display_name text := nullif(
    trim(
      coalesce(
        metadata ->> 'full_name',
        metadata ->> 'name',
        split_part(coalesce(new.email, ''), '@', 1),
        'Usuario'
      )
    ),
    ''
  );
  initial_profile_name text := nullif(
    trim(
      coalesce(
        metadata ->> 'initial_profile_name',
        display_name,
        'Workspace'
      )
    ),
    ''
  );
begin
  if is_workspace_member then
    return new;
  end if;

  insert into public.usuarios (
    id,
    email,
    nome,
    current_plan,
    trial_started_at,
    trial_expires_at,
    is_admin
  )
  values (
    new.id,
    new.email,
    coalesce(display_name, 'Usuario'),
    'start_7',
    now(),
    now() + interval '7 days',
    false
  )
  on conflict (id) do update
    set
      email = excluded.email,
      nome = coalesce(public.usuarios.nome, excluded.nome);

  if not exists (
    select 1
    from public.user_onboarding
    where user_id = new.id
  ) then
    insert into public.user_onboarding (user_id)
    values (new.id);
  end if;

  if not exists (
    select 1
    from public.client_profiles
    where user_id = new.id
  ) then
    insert into public.client_profiles (
      user_id,
      profile_name,
      is_default
    )
    values (
      new.id,
      coalesce(initial_profile_name, display_name, 'Workspace'),
      true
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
