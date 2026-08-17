-- Atualizar a função para permitir service_role com customer_id preenchido
CREATE OR REPLACE FUNCTION public.set_contas_instagram_customer_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se customer_id já estiver preenchido e a role for service_role, permitir
  IF NEW.customer_id IS NOT NULL AND current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  -- Se customer_id já estiver preenchido e o usuário estiver autenticado, validar
  IF NEW.customer_id IS NOT NULL AND auth.uid() IS NOT NULL THEN
    -- Verificar se o customer_id corresponde ao usuário logado
    IF NEW.customer_id = auth.uid() THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Você não pode criar contas Instagram para outros usuários.';
    END IF;
  END IF;
  
  -- Verificar se o usuário está autenticado (para casos sem customer_id)
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
$function$;;
