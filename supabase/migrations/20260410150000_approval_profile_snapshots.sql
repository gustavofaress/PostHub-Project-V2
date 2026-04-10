alter table if exists public.approval_posts
  add column if not exists profile_name_snapshot text,
  add column if not exists profile_avatar_url_snapshot text;
