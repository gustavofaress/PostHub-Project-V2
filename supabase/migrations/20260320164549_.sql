
CREATE OR REPLACE FUNCTION public.get_public_calendar_tasks(
  _token text, 
  _start_date timestamptz, 
  _end_date timestamptz
)
RETURNS TABLE(
  id uuid, title text, description text, 
  scheduled_date timestamptz, status text, 
  tags text[], media_url text, 
  linked_approval_post_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ec.id, ec.title, ec.description, 
         ec.scheduled_date, ec.status, 
         ec.tags, ec.media_url, 
         ec.linked_approval_post_id
  FROM editorial_calendar ec
  WHERE ec.profile_id IN (
    SELECT cp.id FROM client_profiles cp 
    WHERE cp.calendar_token = _token AND cp.is_active = true
  )
  AND ec.scheduled_date >= _start_date
  AND ec.scheduled_date <= _end_date
  ORDER BY ec.scheduled_date
$$;

CREATE OR REPLACE FUNCTION public.get_public_approval_posts(_token text)
RETURNS TABLE(
  id uuid, title text, caption text, status text, 
  format text, platforms text[], media_urls jsonb, 
  created_at timestamptz, public_token text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ap.id, ap.title, ap.caption, ap.status, 
         ap.format, ap.platforms, ap.media_urls, 
         ap.created_at, ap.public_token
  FROM approval_posts ap
  WHERE ap.profile_id IN (
    SELECT cp.id FROM client_profiles cp 
    WHERE cp.calendar_token = _token AND cp.is_active = true
  )
  ORDER BY ap.created_at DESC
$$;
;
