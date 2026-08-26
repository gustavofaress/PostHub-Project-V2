create table if not exists public.profile_extra_subscriptions (
  id uuid primary key default gen_random_uuid(),
  purchased_by_user_id uuid not null references auth.users(id) on delete restrict,
  source_profile_id uuid references public.client_profiles(id) on delete set null,
  target_profile_id uuid references public.client_profiles(id) on delete set null deferrable initially deferred,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  checkout_expires_at timestamptz,
  stripe_subscription_id text,
  stripe_price_id text not null,
  status text not null
    check (
      status in (
        'checkout_pending',
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'paused'
      )
    ),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_stripe_event_id text,
  last_stripe_event_created bigint,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profile_extra_subscriptions_subscription_unique
    unique (stripe_subscription_id),
  constraint profile_extra_subscriptions_checkout_session_unique
    unique (stripe_checkout_session_id),
  constraint profile_extra_subscriptions_target_profile_unique
    unique (target_profile_id),
  constraint profile_extra_subscriptions_last_event_created_check
    check (last_stripe_event_created is null or last_stripe_event_created >= 0)
);

create index if not exists profile_extra_subscriptions_purchased_by_user_idx
  on public.profile_extra_subscriptions (purchased_by_user_id, created_at desc);

create index if not exists profile_extra_subscriptions_source_profile_idx
  on public.profile_extra_subscriptions (source_profile_id, created_at desc);

create index if not exists profile_extra_subscriptions_target_profile_idx
  on public.profile_extra_subscriptions (target_profile_id)
  where target_profile_id is not null;

create unique index if not exists profile_extra_subscriptions_unlinked_checkout_reservation_unique_idx
  on public.profile_extra_subscriptions (purchased_by_user_id)
  where target_profile_id is null
    and status in ('checkout_pending', 'incomplete', 'trialing');

drop trigger if exists update_profile_extra_subscriptions_updated_at
  on public.profile_extra_subscriptions;
create trigger update_profile_extra_subscriptions_updated_at
  before update on public.profile_extra_subscriptions
  for each row
  execute function public.update_updated_at_column();

alter table public.profile_extra_subscriptions enable row level security;

drop policy if exists "Service role full access to profile extra subscriptions"
  on public.profile_extra_subscriptions;
create policy "Service role full access to profile extra subscriptions"
  on public.profile_extra_subscriptions
  for all
  to service_role
  using (true)
  with check (true);

revoke all on public.profile_extra_subscriptions from anon, authenticated;
grant all privileges on public.profile_extra_subscriptions to service_role;

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and coalesce(u.is_admin, false)
  );
$$;

revoke all on function private.current_user_is_admin() from public;
grant execute on function private.current_user_is_admin() to authenticated, service_role;

create or replace function private.current_user_owns_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.client_profiles cp
    where cp.id = target_profile_id
      and cp.user_id = auth.uid()
      and coalesce(cp.is_active, true)
  );
$$;

revoke all on function private.current_user_owns_profile(uuid) from public;
grant execute on function private.current_user_owns_profile(uuid) to authenticated, service_role;

create or replace function private.current_user_can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.current_user_is_admin()
  or private.current_user_owns_profile(target_profile_id)
  or exists (
    select 1
    from public.workspace_members wm
    join public.client_profiles cp on cp.id = wm.profile_id
    where wm.profile_id = target_profile_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and coalesce(cp.is_active, true)
  );
$$;

revoke all on function private.current_user_can_access_profile(uuid) from public;
grant execute on function private.current_user_can_access_profile(uuid)
  to authenticated, service_role;

create or replace function public.current_user_can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.current_user_can_access_profile(target_profile_id);
$$;

revoke all on function public.current_user_can_access_profile(uuid) from public;
grant execute on function public.current_user_can_access_profile(uuid) to authenticated;

create or replace function public.current_user_can_access_workspace(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.current_user_can_access_profile(target_profile_id);
$$;

revoke all on function public.current_user_can_access_workspace(uuid) from public;
grant execute on function public.current_user_can_access_workspace(uuid) to authenticated;

create or replace function private.current_user_can_manage_profile_members(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.current_user_is_admin()
  or private.current_user_owns_profile(target_profile_id)
  or exists (
    select 1
    from public.workspace_members wm
    join public.client_profiles cp on cp.id = wm.profile_id
    where wm.profile_id = target_profile_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
      and coalesce(cp.is_active, true)
  );
$$;

revoke all on function private.current_user_can_manage_profile_members(uuid) from public;
grant execute on function private.current_user_can_manage_profile_members(uuid)
  to authenticated, service_role;

create or replace function public.current_user_can_manage_workspace_members(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.current_user_can_manage_profile_members(target_profile_id);
$$;

revoke all on function public.current_user_can_manage_workspace_members(uuid) from public;
grant execute on function public.current_user_can_manage_workspace_members(uuid) to authenticated;

create or replace function public.current_user_has_workspace_permission(
  target_profile_id uuid,
  required_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.current_user_is_admin()
  or private.current_user_owns_profile(target_profile_id)
  or exists (
    select 1
    from public.workspace_members wm
    join public.client_profiles cp on cp.id = wm.profile_id
    where wm.profile_id = target_profile_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and required_permission = any(coalesce(wm.permissions, '{}'))
      and coalesce(cp.is_active, true)
  );
$$;

revoke all on function public.current_user_has_workspace_permission(uuid, text) from public;
grant execute on function public.current_user_has_workspace_permission(uuid, text)
  to authenticated;

create or replace function public.current_calendar_approval_link_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cal.id
  from public.calendar_approval_links cal
  join public.client_profiles cp on cp.id = cal.profile_id
  where cal.public_token = public.current_calendar_approval_token()
    and cal.status = 'active'
    and cal.expires_at > timezone('utc', now())
    and coalesce(cp.is_active, true)
  limit 1;
$$;

revoke all on function public.current_calendar_approval_link_id() from public;
grant execute on function public.current_calendar_approval_link_id()
  to anon, authenticated, service_role;

create or replace function public.check_profile_subscription_available()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  available_subscription_id uuid;
  available_extra_subscription_id uuid;
  profile_count integer;
  v_is_admin boolean;
  affected_rows integer;
begin
  select coalesce(is_admin, false)
    into v_is_admin
  from public.usuarios
  where id = auth.uid();

  if v_is_admin = true then
    new.is_active := coalesce(new.is_active, true);
    return new;
  end if;

  select count(*)
    into profile_count
  from public.client_profiles
  where user_id = new.user_id;

  if profile_count = 0 then
    new.is_active := coalesce(new.is_active, true);
    return new;
  end if;

  select id
    into available_subscription_id
  from public.profile_subscriptions
  where user_id = new.user_id
    and status = 'available'
    and profile_id is null
  order by created_at asc
  limit 1
  for update skip locked;

  if available_subscription_id is not null then
    update public.profile_subscriptions
    set
      profile_id = new.id,
      status = 'linked',
      updated_at = now()
    where id = available_subscription_id
      and user_id = new.user_id
      and status = 'available'
      and profile_id is null;

    get diagnostics affected_rows = row_count;

    if affected_rows <> 1 then
      raise exception 'PROFILE_LEGACY_SUBSCRIPTION_CONSUMED';
    end if;

    new.subscription_id := available_subscription_id;
    new.is_active := coalesce(new.is_active, true);
    return new;
  end if;

  select id
    into available_extra_subscription_id
  from public.profile_extra_subscriptions
  where purchased_by_user_id = new.user_id
    and target_profile_id is null
    and status = 'active'
  order by created_at asc
  limit 1
  for update skip locked;

  if available_extra_subscription_id is not null then
    update public.profile_extra_subscriptions
    set
      target_profile_id = new.id,
      updated_at = timezone('utc', now())
    where id = available_extra_subscription_id
      and purchased_by_user_id = new.user_id
      and target_profile_id is null
      and status = 'active';

    get diagnostics affected_rows = row_count;

    if affected_rows <> 1 then
      raise exception 'PROFILE_EXTRA_SLOT_CONSUMED';
    end if;

    new.subscription_id := null;
    new.is_active := coalesce(new.is_active, true);
    return new;
  end if;

  raise exception 'Nenhuma assinatura disponível. Adquira um novo perfil para continuar.';
end;
$$;

create or replace function private.ensure_default_profile_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  stripe_extra_subscription_ref text;
begin
  select pes.stripe_subscription_id
    into stripe_extra_subscription_ref
  from public.profile_extra_subscriptions pes
  where pes.target_profile_id = new.id
    and pes.status = 'active'
    and pes.stripe_subscription_id is not null
  order by pes.updated_at desc
  limit 1;

  if stripe_extra_subscription_ref is not null then
    insert into public.profile_entitlements (
      profile_id,
      plan_code,
      source,
      subscription_ref,
      effective_from,
      effective_until,
      ideas_enabled,
      calendar_enabled,
      kanban_enabled,
      references_enabled,
      metrics_enabled,
      social_analytics_enabled,
      approval_enabled,
      approval_link_creation_enabled,
      reports_enabled,
      max_additional_members
    )
    values (
      new.id,
      'pro',
      'stripe',
      stripe_extra_subscription_ref,
      coalesce(new.created_at, timezone('utc', now())),
      null,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      null
    )
    on conflict (profile_id) do update
    set
      plan_code = excluded.plan_code,
      source = excluded.source,
      subscription_ref = excluded.subscription_ref,
      effective_from = excluded.effective_from,
      effective_until = excluded.effective_until,
      ideas_enabled = excluded.ideas_enabled,
      calendar_enabled = excluded.calendar_enabled,
      kanban_enabled = excluded.kanban_enabled,
      references_enabled = excluded.references_enabled,
      metrics_enabled = excluded.metrics_enabled,
      social_analytics_enabled = excluded.social_analytics_enabled,
      approval_enabled = excluded.approval_enabled,
      approval_link_creation_enabled = excluded.approval_link_creation_enabled,
      reports_enabled = excluded.reports_enabled,
      max_additional_members = excluded.max_additional_members,
      updated_at = timezone('utc', now());

    return new;
  end if;

  insert into public.profile_entitlements (
    profile_id,
    plan_code,
    source,
    subscription_ref,
    effective_from,
    effective_until,
    ideas_enabled,
    calendar_enabled,
    kanban_enabled,
    references_enabled,
    metrics_enabled,
    social_analytics_enabled,
    approval_enabled,
    approval_link_creation_enabled,
    reports_enabled,
    max_additional_members
  )
  values (
    new.id,
    'free',
    'default_free',
    null,
    coalesce(new.created_at, timezone('utc', now())),
    null,
    true,
    true,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    2
  )
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

revoke all on function private.ensure_default_profile_entitlement() from public;

drop policy if exists "Users can view their own profiles" on public.client_profiles;
create policy "Users can view their own profiles"
  on public.client_profiles
  for select
  to authenticated
  using (public.current_user_can_access_profile(id));

drop policy if exists "Users can create their own profiles" on public.client_profiles;
create policy "Users can create their own profiles"
  on public.client_profiles
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and coalesce(is_active, true)
  );

drop policy if exists "Users can update their own profiles" on public.client_profiles;
drop policy if exists "Users can update names for manageable profiles" on public.client_profiles;
create policy "Users can update names for manageable profiles"
  on public.client_profiles
  for update
  to authenticated
  using (public.current_user_can_manage_workspace_members(id))
  with check (public.current_user_can_manage_workspace_members(id));

drop policy if exists "Users can view columns of their profiles" on public.editorial_columns;
create policy "Users can view columns of their profiles"
  on public.editorial_columns
  for select
  to authenticated
  using (
    profile_id in (
      select id
      from public.client_profiles
      where user_id = auth.uid()
        and coalesce(is_active, true)
    )
  );

drop policy if exists "editorial_columns_select_shared_workspace" on public.editorial_columns;
create policy "editorial_columns_select_shared_workspace"
  on public.editorial_columns
  for select
  to authenticated
  using (public.current_user_can_access_workspace(profile_id));

drop policy if exists "Users can insert columns for their profiles" on public.editorial_columns;
create policy "Users can insert columns for their profiles"
  on public.editorial_columns
  for insert
  to authenticated
  with check (
    profile_id in (
      select id
      from public.client_profiles
      where user_id = auth.uid()
        and coalesce(is_active, true)
    )
  );

drop policy if exists "editorial_columns_insert_shared_workspace" on public.editorial_columns;
create policy "editorial_columns_insert_shared_workspace"
  on public.editorial_columns
  for insert
  to authenticated
  with check (public.current_user_has_workspace_permission(profile_id, 'kanban'));

drop policy if exists "Users can update columns of their profiles" on public.editorial_columns;
create policy "Users can update columns of their profiles"
  on public.editorial_columns
  for update
  to authenticated
  using (
    profile_id in (
      select id
      from public.client_profiles
      where user_id = auth.uid()
        and coalesce(is_active, true)
    )
  )
  with check (
    profile_id in (
      select id
      from public.client_profiles
      where user_id = auth.uid()
        and coalesce(is_active, true)
    )
  );

drop policy if exists "editorial_columns_update_shared_workspace" on public.editorial_columns;
create policy "editorial_columns_update_shared_workspace"
  on public.editorial_columns
  for update
  to authenticated
  using (public.current_user_has_workspace_permission(profile_id, 'kanban'))
  with check (public.current_user_has_workspace_permission(profile_id, 'kanban'));

drop policy if exists "Users can delete columns of their profiles" on public.editorial_columns;
create policy "Users can delete columns of their profiles"
  on public.editorial_columns
  for delete
  to authenticated
  using (
    profile_id in (
      select id
      from public.client_profiles
      where user_id = auth.uid()
        and coalesce(is_active, true)
    )
  );

drop policy if exists "editorial_columns_delete_shared_workspace" on public.editorial_columns;
create policy "editorial_columns_delete_shared_workspace"
  on public.editorial_columns
  for delete
  to authenticated
  using (public.current_user_has_workspace_permission(profile_id, 'kanban'));

drop policy if exists "Users can view their own tasks" on public.editorial_calendar;
create policy "Users can view their own tasks"
  on public.editorial_calendar
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "select_own_tasks" on public.editorial_calendar;
create policy "select_own_tasks"
  on public.editorial_calendar
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "editorial_calendar_select_shared_workspace" on public.editorial_calendar;
create policy "editorial_calendar_select_shared_workspace"
  on public.editorial_calendar
  for select
  to authenticated
  using (
    profile_id is not null
    and public.current_user_can_access_workspace(profile_id)
  );

drop policy if exists "Users can create their own tasks" on public.editorial_calendar;
create policy "Users can create their own tasks"
  on public.editorial_calendar
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "insert_own_tasks" on public.editorial_calendar;
create policy "insert_own_tasks"
  on public.editorial_calendar
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "editorial_calendar_insert_shared_workspace" on public.editorial_calendar;
create policy "editorial_calendar_insert_shared_workspace"
  on public.editorial_calendar
  for insert
  to authenticated
  with check (
    profile_id is not null
    and user_id = auth.uid()
    and public.current_user_has_workspace_permission(profile_id, 'kanban')
  );

drop policy if exists "Users can update their own tasks" on public.editorial_calendar;
create policy "Users can update their own tasks"
  on public.editorial_calendar
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  )
  with check (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "update_own_tasks" on public.editorial_calendar;
create policy "update_own_tasks"
  on public.editorial_calendar
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  )
  with check (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "editorial_calendar_update_shared_workspace" on public.editorial_calendar;
create policy "editorial_calendar_update_shared_workspace"
  on public.editorial_calendar
  for update
  to authenticated
  using (
    profile_id is not null
    and public.current_user_has_workspace_permission(profile_id, 'kanban')
  )
  with check (
    profile_id is not null
    and public.current_user_has_workspace_permission(profile_id, 'kanban')
  );

drop policy if exists "Users can delete their own tasks" on public.editorial_calendar;
create policy "Users can delete their own tasks"
  on public.editorial_calendar
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "delete_own_tasks" on public.editorial_calendar;
create policy "delete_own_tasks"
  on public.editorial_calendar
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "editorial_calendar_delete_shared_workspace" on public.editorial_calendar;
create policy "editorial_calendar_delete_shared_workspace"
  on public.editorial_calendar
  for delete
  to authenticated
  using (
    profile_id is not null
    and public.current_user_has_workspace_permission(profile_id, 'kanban')
  );

drop policy if exists "Usuários podem ver suas próprias ideias" on public.ideas;
drop policy if exists "Users can view their own ideas" on public.ideas;
create policy "Usuários podem ver suas próprias ideias"
  on public.ideas
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Usuários podem criar suas próprias ideias" on public.ideas;
drop policy if exists "Users can create their own ideas" on public.ideas;
create policy "Usuários podem criar suas próprias ideias"
  on public.ideas
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Usuários podem atualizar suas próprias ideias" on public.ideas;
drop policy if exists "Users can update their own ideas" on public.ideas;
create policy "Usuários podem atualizar suas próprias ideias"
  on public.ideas
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  )
  with check (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Usuários podem excluir suas próprias ideias" on public.ideas;
drop policy if exists "Users can delete their own ideas" on public.ideas;
create policy "Usuários podem excluir suas próprias ideias"
  on public.ideas
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can view their own script drafts" on public.script_drafts;
create policy "Users can view their own script drafts"
  on public.script_drafts
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can create their own script drafts" on public.script_drafts;
create policy "Users can create their own script drafts"
  on public.script_drafts
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can update their own script drafts" on public.script_drafts;
create policy "Users can update their own script drafts"
  on public.script_drafts
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  )
  with check (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can delete their own script drafts" on public.script_drafts;
create policy "Users can delete their own script drafts"
  on public.script_drafts
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can view their own approval posts" on public.approval_posts;
create policy "Users can view their own approval posts"
  on public.approval_posts
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can create their own approval posts" on public.approval_posts;
create policy "Users can create their own approval posts"
  on public.approval_posts
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can update their own approval posts" on public.approval_posts;
create policy "Users can update their own approval posts"
  on public.approval_posts
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  )
  with check (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can delete their own approval posts" on public.approval_posts;
create policy "Users can delete their own approval posts"
  on public.approval_posts
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Anyone can view approval post with valid token" on public.approval_posts;
create policy "Anyone can view approval post with valid token"
  on public.approval_posts
  for select
  to anon, authenticated
  using (
    public_token = (current_setting('request.headers', true)::json->>'x-approval-token')
    and profile_id is not null
    and exists (
      select 1
      from public.client_profiles cp
      where cp.id = approval_posts.profile_id
        and coalesce(cp.is_active, true)
    )
  );

drop policy if exists "Anyone can update approval post with valid token" on public.approval_posts;
create policy "Anyone can update approval post with valid token"
  on public.approval_posts
  for update
  to anon, authenticated
  using (
    public_token = (current_setting('request.headers', true)::json->>'x-approval-token')
    and profile_id is not null
    and exists (
      select 1
      from public.client_profiles cp
      where cp.id = approval_posts.profile_id
        and coalesce(cp.is_active, true)
    )
  )
  with check (
    public_token = (current_setting('request.headers', true)::json->>'x-approval-token')
    and profile_id is not null
    and exists (
      select 1
      from public.client_profiles cp
      where cp.id = approval_posts.profile_id
        and coalesce(cp.is_active, true)
    )
  );

drop policy if exists "Public access with valid token" on public.approval_posts;
create policy "Public access with valid token"
  on public.approval_posts
  for select
  to anon
  using (
    public_token = (current_setting('request.headers', true)::json->>'x-approval-token')
    and status != 'expired'
    and profile_id is not null
    and exists (
      select 1
      from public.client_profiles cp
      where cp.id = approval_posts.profile_id
        and coalesce(cp.is_active, true)
    )
  );

drop policy if exists "Users can view feedback on their posts" on public.approval_feedback;
create policy "Users can view feedback on their posts"
  on public.approval_feedback
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.approval_posts ap
      where ap.id = approval_feedback.post_id
        and ap.user_id = auth.uid()
        and ap.profile_id is not null
        and public.current_user_can_access_profile(ap.profile_id)
    )
  );

drop policy if exists "Anyone can view feedback with valid token" on public.approval_feedback;
create policy "Anyone can view feedback with valid token"
  on public.approval_feedback
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.approval_posts ap
      join public.client_profiles cp on cp.id = ap.profile_id
      where ap.id = approval_feedback.post_id
        and ap.public_token = (current_setting('request.headers', true)::json->>'x-approval-token')
        and coalesce(cp.is_active, true)
    )
  );

drop policy if exists "Anyone can create feedback" on public.approval_feedback;
drop policy if exists "Anyone can create feedback with valid token" on public.approval_feedback;
create policy "Anyone can create feedback with valid token"
  on public.approval_feedback
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.approval_posts ap
      join public.client_profiles cp on cp.id = ap.profile_id
      where ap.id = approval_feedback.post_id
        and ap.public_token = (current_setting('request.headers', true)::json->>'x-approval-token')
        and coalesce(cp.is_active, true)
    )
  );

drop policy if exists "Users can read instagram connections for accessible profiles" on public.contas_instagram;
create policy "Users can read instagram connections for accessible profiles"
  on public.contas_instagram
  for select
  to authenticated
  using (
    profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can view their own instagram accounts" on public.contas_instagram;
create policy "Users can view their own instagram accounts"
  on public.contas_instagram
  for select
  to authenticated
  using (
    auth.uid() = customer_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can insert their own instagram accounts" on public.contas_instagram;
create policy "Users can insert their own instagram accounts"
  on public.contas_instagram
  for insert
  to authenticated
  with check (
    auth.uid() = customer_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can update their own instagram accounts" on public.contas_instagram;
create policy "Users can update their own instagram accounts"
  on public.contas_instagram
  for update
  to authenticated
  using (
    auth.uid() = customer_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  )
  with check (
    auth.uid() = customer_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can delete their own instagram accounts" on public.contas_instagram;
create policy "Users can delete their own instagram accounts"
  on public.contas_instagram
  for delete
  to authenticated
  using (
    auth.uid() = customer_id
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can read instagram metrics for accessible profiles" on public.instagram_metrics;
create policy "Users can read instagram metrics for accessible profiles"
  on public.instagram_metrics
  for select
  to authenticated
  using (
    profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can view their own instagram metrics" on public.instagram_metrics;
create policy "Users can view their own instagram metrics"
  on public.instagram_metrics
  for select
  to authenticated
  using (
    customer_id = auth.uid()
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can insert their own instagram metrics" on public.instagram_metrics;
create policy "Users can insert their own instagram metrics"
  on public.instagram_metrics
  for insert
  to authenticated
  with check (
    customer_id = auth.uid()
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can update their own instagram metrics" on public.instagram_metrics;
create policy "Users can update their own instagram metrics"
  on public.instagram_metrics
  for update
  to authenticated
  using (
    customer_id = auth.uid()
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  )
  with check (
    customer_id = auth.uid()
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can delete their own instagram metrics" on public.instagram_metrics;
create policy "Users can delete their own instagram metrics"
  on public.instagram_metrics
  for delete
  to authenticated
  using (
    customer_id = auth.uid()
    and profile_id is not null
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "workspace_members_select_visible_rows" on public.workspace_members;
create policy "workspace_members_select_visible_rows"
  on public.workspace_members
  for select
  to authenticated
  using (private.current_user_can_access_profile(profile_id));

drop policy if exists "workspace_members_insert_managers_only" on public.workspace_members;
create policy "workspace_members_insert_managers_only"
  on public.workspace_members
  for insert
  to authenticated
  with check (
    private.current_user_can_manage_profile_members(profile_id)
    and invited_by = auth.uid()
  );

drop policy if exists "workspace_members_update_managers_or_self_accept" on public.workspace_members;
create policy "workspace_members_update_managers_or_self_accept"
  on public.workspace_members
  for update
  to authenticated
  using (
    private.current_user_can_manage_profile_members(profile_id)
    or (
      user_id = auth.uid()
      and exists (
        select 1
        from public.client_profiles cp
        where cp.id = workspace_members.profile_id
          and coalesce(cp.is_active, true)
      )
    )
  )
  with check (
    private.current_user_can_manage_profile_members(profile_id)
    or (
      user_id = auth.uid()
      and exists (
        select 1
        from public.client_profiles cp
        where cp.id = workspace_members.profile_id
          and coalesce(cp.is_active, true)
      )
    )
  );

drop policy if exists "workspace_members_delete_managers_only" on public.workspace_members;
create policy "workspace_members_delete_managers_only"
  on public.workspace_members
  for delete
  to authenticated
  using (private.current_user_can_manage_profile_members(profile_id));

create or replace function public.create_default_editorial_columns(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.client_profiles
    where id = p_profile_id
      and user_id = auth.uid()
      and coalesce(is_active, true)
  ) then
    raise exception 'Acesso negado: perfil não pertence ao usuário autenticado';
  end if;

  if exists (select 1 from public.editorial_columns where profile_id = p_profile_id) then
    return;
  end if;

  insert into public.editorial_columns (profile_id, name, color, position) values
    (p_profile_id, 'Rascunho', '#9CA3AF', 0),
    (p_profile_id, 'Em Produção', '#38B6FF', 1),
    (p_profile_id, 'Em Revisão', '#FBBF24', 2),
    (p_profile_id, 'Agendado', '#A855F7', 3),
    (p_profile_id, 'Publicado', '#22C55E', 4),
    (p_profile_id, 'Concluído', '#047857', 5);
end;
$$;

create or replace function public.reorder_editorial_columns(p_column_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_count integer;
begin
  if p_column_ids is null or array_length(p_column_ids, 1) is null then
    return;
  end if;

  select count(distinct ec.id)
    into v_count
  from public.editorial_columns ec
  where ec.id = any(p_column_ids);

  if v_count <> array_length(p_column_ids, 1) then
    raise exception 'Um ou mais IDs de coluna não existem';
  end if;

  if (
    select count(distinct ec.profile_id)
    from public.editorial_columns ec
    where ec.id = any(p_column_ids)
  ) > 1 then
    raise exception 'Colunas pertencem a perfis diferentes';
  end if;

  select ec.profile_id
    into v_profile_id
  from public.editorial_columns ec
  where ec.id = p_column_ids[1];

  if not exists (
    select 1
    from public.client_profiles
    where id = v_profile_id
      and user_id = auth.uid()
      and coalesce(is_active, true)
  ) then
    raise exception 'Acesso negado: perfil não pertence ao usuário autenticado';
  end if;

  update public.editorial_columns
  set position = data.new_position
  from (
    select
      unnest(p_column_ids) as id,
      generate_series(0, array_length(p_column_ids, 1) - 1) as new_position
  ) as data
  where editorial_columns.id = data.id;
end;
$$;
