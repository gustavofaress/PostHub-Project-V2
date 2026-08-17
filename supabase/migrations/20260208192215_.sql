-- Fix user_id foreign key: avoid referencing auth.users
ALTER TABLE public.approval_posts
  DROP CONSTRAINT IF EXISTS approval_posts_user_id_fkey;

ALTER TABLE public.approval_posts
  ADD CONSTRAINT approval_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

-- Tighten public access policy: require token in request header
DROP POLICY IF EXISTS "Public access with valid token" ON public.approval_posts;

CREATE POLICY "Public access with valid token"
ON public.approval_posts
FOR SELECT
TO anon
USING (
  public_token = (current_setting('request.headers', true)::json->>'x-approval-token')
  AND status != 'expired'
);

-- Tighten anonymous feedback insert: require matching token for the post
DROP POLICY IF EXISTS "Anyone can create feedback" ON public.approval_feedback;

CREATE POLICY "Anyone can create feedback"
ON public.approval_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.approval_posts ap
    WHERE ap.id = post_id
      AND ap.status = 'pending'
      AND (
        (auth.uid() IS NOT NULL AND ap.user_id = auth.uid())
        OR (
          auth.uid() IS NULL
          AND ap.public_token = (current_setting('request.headers', true)::json->>'x-approval-token')
        )
      )
  )
);
;
