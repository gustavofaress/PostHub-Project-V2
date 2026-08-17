-- Remove a política atual de INSERT
DROP POLICY IF EXISTS "Anyone can create feedback" ON approval_feedback;

-- Cria nova política que aceita token válido independente de auth.uid()
CREATE POLICY "Anyone can create feedback with valid token"
ON approval_feedback
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM approval_posts ap
    WHERE ap.id = approval_feedback.post_id
      AND ap.status = 'pending'
      AND (
        -- Opção 1: Token válido no header (funciona para qualquer um)
        ap.public_token = (
          current_setting('request.headers', true)::json ->> 'x-approval-token'
        )
        OR
        -- Opção 2: Usuário autenticado é dono do post
        (auth.uid() IS NOT NULL AND ap.user_id = auth.uid())
      )
  )
);;
