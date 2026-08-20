alter table public.usuarios
alter column current_plan set default 'free';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'free',
    null,
    null,
    false
  )
  on conflict (id) do update
  set
    email = excluded.email,
    nome = excluded.nome;

  return new;
end;
$$;
