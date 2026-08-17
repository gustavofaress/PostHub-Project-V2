-- Dropar a política atual com role incorreto
DROP POLICY IF EXISTS "Anyone can create feedback with valid token" ON approval_feedback;

-- Recriar com os roles corretos para Supabase API
CREATE POLICY "Anyone can create feedback with valid token"
ON approval_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM approval_posts ap
    WHERE ap.id = approval_feedback.post_id
      AND ap.status = 'pending'
      AND (
        ap.public_token = (
          current_setting('request.headers', true)::json ->> 'x-approval-token'
        )
        OR
        (auth.uid() IS NOT NULL AND ap.user_id = auth.uid())
      )
  )
);;
