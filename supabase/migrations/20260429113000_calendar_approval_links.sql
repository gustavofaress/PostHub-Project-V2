create extension if not exists pgcrypto;

alter table if exists public.editorial_calendar
  add column if not exists platform text,
  add column if not exists caption text,
  add column if not exists content_type text,
  add column if not exists thumbnail_url text,
  add column if not exists media_urls jsonb not null default '[]'::jsonb;

do $$
begin
  alter table public.editorial_calendar
    add constraint editorial_calendar_content_type_check
    check (
      content_type is null
      or content_type in ('static', 'carousel', 'vertical_video', 'horizontal_video')
    );
exception
  when duplicate_object then null;
end
$$;

create or replace function public.current_calendar_approval_token()
returns text
language sql
stable
as $$
  select nullif(
    (
      coalesce(
        nullif(current_setting('request.headers', true), ''),
        '{}'
      )::json ->> 'x-approval-token'
    ),
    ''
  );
$$;

create table if not exists public.calendar_approval_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  public_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  start_date date not null,
  end_date date not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  profile_name_snapshot text,
  profile_avatar_url_snapshot text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_date >= start_date)
);

create index if not exists calendar_approval_links_profile_idx
  on public.calendar_approval_links (profile_id, created_at desc);

create index if not exists calendar_approval_links_public_token_idx
  on public.calendar_approval_links (public_token);

create or replace function public.current_calendar_approval_link_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cal.id
  from public.calendar_approval_links cal
  where cal.public_token = public.current_calendar_approval_token()
    and cal.status = 'active'
    and cal.expires_at > timezone('utc', now())
  limit 1;
$$;

create table if not exists public.calendar_post_approvals (
  id uuid primary key default gen_random_uuid(),
  approval_link_id uuid not null references public.calendar_approval_links(id) on delete cascade,
  calendar_post_id uuid not null references public.editorial_calendar(id) on delete cascade,
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested', 'rejected')),
  reviewer_name text,
  reviewer_email text,
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (approval_link_id, calendar_post_id)
);

create index if not exists calendar_post_approvals_link_idx
  on public.calendar_post_approvals (approval_link_id, updated_at desc);

create index if not exists calendar_post_approvals_profile_post_idx
  on public.calendar_post_approvals (profile_id, calendar_post_id, updated_at desc);

create table if not exists public.calendar_approval_feedback (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references public.calendar_post_approvals(id) on delete cascade,
  approval_link_id uuid not null references public.calendar_approval_links(id) on delete cascade,
  calendar_post_id uuid not null references public.editorial_calendar(id) on delete cascade,
  profile_id uuid not null references public.client_profiles(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_type text not null default 'external' check (author_type in ('internal', 'external')),
  reviewer_name text not null default '',
  reviewer_email text,
  comment text not null,
  status text check (status in ('approved', 'changes_requested', 'rejected')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists calendar_approval_feedback_link_post_idx
  on public.calendar_approval_feedback (approval_link_id, calendar_post_id, created_at);

create index if not exists calendar_approval_feedback_approval_idx
  on public.calendar_approval_feedback (approval_id, created_at);

alter table public.calendar_approval_links enable row level security;
alter table public.calendar_post_approvals enable row level security;
alter table public.calendar_approval_feedback enable row level security;

drop policy if exists "Users can read calendar approval links for accessible profiles" on public.calendar_approval_links;
create policy "Users can read calendar approval links for accessible profiles"
  on public.calendar_approval_links
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

drop policy if exists "Users can manage calendar approval links for manageable profiles" on public.calendar_approval_links;
create policy "Users can manage calendar approval links for manageable profiles"
  on public.calendar_approval_links
  for all
  to authenticated
  using (public.current_user_can_manage_workspace_members(profile_id))
  with check (
    public.current_user_can_manage_workspace_members(profile_id)
    and user_id = auth.uid()
  );

drop policy if exists "Public can read active calendar approval links by token" on public.calendar_approval_links;
create policy "Public can read active calendar approval links by token"
  on public.calendar_approval_links
  for select
  to anon, authenticated
  using (id = public.current_calendar_approval_link_id());

drop policy if exists "Users can read calendar post approvals for accessible profiles" on public.calendar_post_approvals;
create policy "Users can read calendar post approvals for accessible profiles"
  on public.calendar_post_approvals
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

drop policy if exists "Users can manage calendar post approvals for manageable profiles" on public.calendar_post_approvals;
create policy "Users can manage calendar post approvals for manageable profiles"
  on public.calendar_post_approvals
  for all
  to authenticated
  using (public.current_user_can_manage_workspace_members(profile_id))
  with check (public.current_user_can_manage_workspace_members(profile_id));

drop policy if exists "Public can read calendar post approvals by token" on public.calendar_post_approvals;
create policy "Public can read calendar post approvals by token"
  on public.calendar_post_approvals
  for select
  to anon, authenticated
  using (approval_link_id = public.current_calendar_approval_link_id());

drop policy if exists "Public can update calendar post approvals by token" on public.calendar_post_approvals;
create policy "Public can update calendar post approvals by token"
  on public.calendar_post_approvals
  for update
  to anon, authenticated
  using (approval_link_id = public.current_calendar_approval_link_id())
  with check (approval_link_id = public.current_calendar_approval_link_id());

drop policy if exists "Users can read calendar approval feedback for accessible profiles" on public.calendar_approval_feedback;
create policy "Users can read calendar approval feedback for accessible profiles"
  on public.calendar_approval_feedback
  for select
  to authenticated
  using (public.current_user_can_access_profile(profile_id));

drop policy if exists "Users can create calendar approval feedback for accessible profiles" on public.calendar_approval_feedback;
create policy "Users can create calendar approval feedback for accessible profiles"
  on public.calendar_approval_feedback
  for insert
  to authenticated
  with check (
    public.current_user_can_access_profile(profile_id)
    and (
      author_user_id is null
      or author_user_id = auth.uid()
    )
  );

drop policy if exists "Public can read calendar approval feedback by token" on public.calendar_approval_feedback;
create policy "Public can read calendar approval feedback by token"
  on public.calendar_approval_feedback
  for select
  to anon, authenticated
  using (approval_link_id = public.current_calendar_approval_link_id());

drop policy if exists "Public can create calendar approval feedback by token" on public.calendar_approval_feedback;
create policy "Public can create calendar approval feedback by token"
  on public.calendar_approval_feedback
  for insert
  to anon, authenticated
  with check (
    approval_link_id = public.current_calendar_approval_link_id()
    and exists (
      select 1
      from public.calendar_post_approvals approvals
      where approvals.id = approval_id
        and approvals.approval_link_id = approval_link_id
        and approvals.calendar_post_id = calendar_post_id
        and approvals.profile_id = profile_id
    )
  );

drop policy if exists "Public can read editorial calendar items by approval token" on public.editorial_calendar;
create policy "Public can read editorial calendar items by approval token"
  on public.editorial_calendar
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.calendar_approval_links cal
      where cal.id = public.current_calendar_approval_link_id()
        and cal.profile_id = editorial_calendar.profile_id
        and (editorial_calendar.scheduled_date at time zone 'utc')::date
          between cal.start_date and cal.end_date
    )
  );

revoke all on function public.current_calendar_approval_token() from public;
grant execute on function public.current_calendar_approval_token() to anon, authenticated, service_role;

revoke all on function public.current_calendar_approval_link_id() from public;
grant execute on function public.current_calendar_approval_link_id() to anon, authenticated, service_role;

revoke all on public.calendar_approval_links from anon, authenticated;
grant select on public.calendar_approval_links to anon;
grant select, insert, update, delete on public.calendar_approval_links to authenticated;
grant all privileges on public.calendar_approval_links to service_role;

revoke all on public.calendar_post_approvals from anon, authenticated;
grant select, update on public.calendar_post_approvals to anon;
grant select, insert, update, delete on public.calendar_post_approvals to authenticated;
grant all privileges on public.calendar_post_approvals to service_role;

revoke all on public.calendar_approval_feedback from anon, authenticated;
grant select, insert on public.calendar_approval_feedback to anon;
grant select, insert on public.calendar_approval_feedback to authenticated;
grant all privileges on public.calendar_approval_feedback to service_role;

grant select on public.editorial_calendar to anon, authenticated;
