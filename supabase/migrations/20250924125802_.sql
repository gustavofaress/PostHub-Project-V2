-- Verificar se existe política de UPDATE para usuários próprios
-- Se não existir, criar uma nova política
DO $$
BEGIN
  -- Verificar se a política já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'usuarios' 
    AND policyname = 'Users can update their own data'
  ) THEN
    -- Criar política para permitir que usuários atualizem seus próprios dados
    CREATE POLICY "Users can update their own data"
    ON public.usuarios
    FOR UPDATE
    USING (auth.uid() = id);
  END IF;
END $$;;
