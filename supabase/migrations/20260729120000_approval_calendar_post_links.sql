alter table if exists public.approval_posts
  add column if not exists calendar_post_id uuid references public.editorial_calendar(id) on delete set null;

create index if not exists approval_posts_calendar_post_idx
  on public.approval_posts (profile_id, calendar_post_id, updated_at desc);
