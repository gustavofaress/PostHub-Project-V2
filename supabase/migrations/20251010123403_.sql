-- Atualizar trigger para não validar autenticação quando customer_id já vem preenchido
CREATE OR REPLACE FUNCTION public.set_contas_instagram_customer_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se customer_id já estiver preenchido, apenas validar se existe e usar
  IF NEW.customer_id IS NOT NULL THEN
    -- Verificar se o customer_id existe na tabela usuarios
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = NEW.customer_id) THEN
      RAISE EXCEPTION 'Customer ID % não existe na tabela usuarios', NEW.customer_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Se customer_id não foi fornecido, tentar usar auth.uid()
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO NEW.customer_id 
    FROM public.usuarios 
    WHERE id = auth.uid() 
    LIMIT 1;
    
    IF NEW.customer_id IS NULL THEN
      RAISE EXCEPTION 'Usuário % não encontrado na tabela usuarios', auth.uid();
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Se chegou aqui, não tem customer_id nem auth.uid()
  RAISE EXCEPTION 'É necessário fornecer um customer_id ou estar autenticado';
END;
$function$;;
