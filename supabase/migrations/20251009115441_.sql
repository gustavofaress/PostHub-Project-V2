-- Criar função para preencher automaticamente customer_id na tabela contas_instagram
CREATE OR REPLACE FUNCTION public.set_contas_instagram_customer_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado. É necessário estar logado para criar uma conta Instagram.';
  END IF;
  
  -- Buscar o usuário na tabela usuarios
  SELECT id INTO NEW.customer_id 
  FROM public.usuarios 
  WHERE id = auth.uid() 
  LIMIT 1;
  
  -- Se não encontrar o usuário, lançar erro
  IF NEW.customer_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado na tabela usuarios. O ID % não existe.', auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa a função antes de inserir em contas_instagram
CREATE TRIGGER trigger_set_contas_instagram_customer_id
  BEFORE INSERT ON public.contas_instagram
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contas_instagram_customer_id();;
