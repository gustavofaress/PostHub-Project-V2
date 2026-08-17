-- 1. Create SECURITY DEFINER function to validate approval token
CREATE OR REPLACE FUNCTION public.is_valid_approval_token(_post_id uuid, _token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.approval_posts
    WHERE id = _post_id
      AND public_token = _token
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- 2. Drop existing INSERT policy
DROP POLICY IF EXISTS "Anyone can create feedback with valid token" ON approval_feedback;

-- 3. Recreate INSERT policy using the SECURITY DEFINER function
CREATE POLICY "Anyone can create feedback with valid token"
ON approval_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public.is_valid_approval_token(
    approval_feedback.post_id,
    COALESCE(
      current_setting('request.headers', true)::json ->> 'x-approval-token',
      ''
    )
  )
  OR
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM approval_posts ap
    WHERE ap.id = approval_feedback.post_id
      AND ap.user_id = auth.uid()
  ))
);

-- 4. Create trigger function to update post status after feedback insert
CREATE OR REPLACE FUNCTION public.update_post_status_on_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.approval_posts
  SET status = NEW.status, updated_at = now()
  WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$;

-- 5. Create the trigger
DROP TRIGGER IF EXISTS trigger_update_post_status_on_feedback ON approval_feedback;
CREATE TRIGGER trigger_update_post_status_on_feedback
AFTER INSERT ON approval_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_post_status_on_feedback();;
