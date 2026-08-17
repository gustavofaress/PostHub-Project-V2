-- 1. Add calendar_token column to client_profiles
ALTER TABLE public.client_profiles 
ADD COLUMN IF NOT EXISTS calendar_token text UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '');

-- 2. Create SECURITY DEFINER function to validate calendar token
CREATE OR REPLACE FUNCTION public.get_profile_by_calendar_token(_token text)
RETURNS TABLE(profile_id uuid, user_id uuid, profile_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, user_id, profile_name
  FROM public.client_profiles
  WHERE calendar_token = _token AND is_active = true
$$;

-- 3. RLS — Allow anon to read editorial_calendar via calendar token
CREATE POLICY "Public calendar access with valid token"
ON public.editorial_calendar FOR SELECT TO anon
USING (
  profile_id IN (
    SELECT cp.id FROM public.client_profiles cp
    WHERE cp.calendar_token = COALESCE(
      (current_setting('request.headers'::text, true)::json->>'x-calendar-token'), ''
    ) AND cp.is_active = true
  )
);

-- 4. RLS — Allow anon to read approval_posts via calendar token
CREATE POLICY "Public calendar access approval posts"
ON public.approval_posts FOR SELECT TO anon
USING (
  profile_id IN (
    SELECT cp.id FROM public.client_profiles cp
    WHERE cp.calendar_token = COALESCE(
      (current_setting('request.headers'::text, true)::json->>'x-calendar-token'), ''
    ) AND cp.is_active = true
  )
);;
