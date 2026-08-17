-- Remover políticas existentes se houver e recriar
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Public files are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Criar políticas de storage para o bucket posthub_files
-- Permitir que usuários autenticados façam upload de arquivos
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'posthub_files' AND 
  auth.uid() IS NOT NULL
);

-- Permitir que todos visualizem arquivos públicos
CREATE POLICY "Public files are viewable by everyone"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'posthub_files');

-- Permitir que usuários autenticados atualizem seus próprios arquivos
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'posthub_files' AND auth.uid() IS NOT NULL);

-- Permitir que usuários autenticados deletem seus próprios arquivos
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'posthub_files' AND auth.uid() IS NOT NULL);;
