alter function public.set_social_analytics_updated_at()
  set search_path = public, pg_temp;

do $$
declare
  function_record record;
  rewritten_definition text;
begin
  for function_record in
    select p.oid,
           p.proname,
           pg_get_functiondef(p.oid) as function_def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'get_safe_social_connections',
        'get_social_connection_tokens',
        'upsert_social_connection'
      )
  loop
    rewritten_definition := replace(
      function_record.function_def,
      'public.social_connections',
      'public.social_connections_legacy'
    );

    if rewritten_definition <> function_record.function_def then
      execute rewritten_definition;
    end if;
  end loop;
end;
$$;

do $$
declare
  function_record record;
begin
  for function_record in
    select p.proname,
           pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'get_safe_social_connections',
        'get_social_connection_tokens',
        'upsert_social_connection',
        'validate_social_connection'
      )
  loop
    execute format(
      'revoke execute on function public.%I(%s) from public, anon, authenticated',
      function_record.proname,
      function_record.identity_args
    );
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where not t.tgisinternal
      and n.nspname = 'public'
      and p.proname = 'validate_social_connection'
      and c.relname = 'social_connections'
  ) then
    raise exception
      'Legacy trigger function public.validate_social_connection is attached to public.social_connections. Move it to public.social_connections_legacy before applying this migration.';
  end if;
end;
$$;
