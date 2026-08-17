-- Remove todos os triggers que podem estar causando conflito
DROP TRIGGER IF EXISTS update_blog_posts_modified_at ON public.blog_posts;
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
DROP TRIGGER IF EXISTS set_blog_posts_updated_at ON public.blog_posts;

-- Criar ou substituir a função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_blog_posts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_blog_posts_updated_at();;
