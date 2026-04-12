create table if not exists public.workspace_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text not null default '',
  type text not null check (
    type in (
      'task_assigned',
      'task_updated',
      'comment_mentioned',
      'task_commented'
    )
  ),
  target_module text not null check (
    target_module in (
      'calendar',
      'kanban',
      'ideas',
      'references',
      'approval'
    )
  ),
  entity_type text not null check (
    entity_type in (
      'editorial_calendar',
      'idea',
      'reference',
      'approval_post'
    )
  ),
  entity_id text not null,
  entity_title text not null default '',
  message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz
);

create index if not exists workspace_notifications_recipient_idx
  on public.workspace_notifications (recipient_user_id, is_read, created_at desc);

create index if not exists workspace_notifications_profile_idx
  on public.workspace_notifications (profile_id, recipient_user_id, created_at desc);

alter table public.workspace_notifications enable row level security;

drop policy if exists "Users can read their workspace notifications" on public.workspace_notifications;
create policy "Users can read their workspace notifications"
  on public.workspace_notifications
  for select
  to authenticated
  using (
    recipient_user_id = auth.uid()
    and public.current_user_can_access_profile(profile_id)
  );

drop policy if exists "Users can create workspace notifications for accessible profiles" on public.workspace_notifications;
create policy "Users can create workspace notifications for accessible profiles"
  on public.workspace_notifications
  for insert
  to authenticated
  with check (
    public.current_user_can_access_profile(profile_id)
    and (
      actor_user_id is null
      or actor_user_id = auth.uid()
    )
  );

drop policy if exists "Users can mark their workspace notifications as read" on public.workspace_notifications;
create policy "Users can mark their workspace notifications as read"
  on public.workspace_notifications
  for update
  to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

revoke all on public.workspace_notifications from anon, authenticated;
grant select, insert, update on public.workspace_notifications to authenticated;
grant all privileges on public.workspace_notifications to service_role;
