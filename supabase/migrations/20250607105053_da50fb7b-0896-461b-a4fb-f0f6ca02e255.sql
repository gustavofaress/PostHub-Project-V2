
-- Recriar a função handle_new_user com melhor tratamento de tipos e logs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  nome_valor text;
  tipo_plano_valor text := 'teste';
  quantidade_testes_valor int := 3;
  trial_start TIMESTAMPTZ := NOW();
  trial_end TIMESTAMPTZ := NOW() + INTERVAL '7 days';
BEGIN
  -- Log para debug
  RAISE LOG 'Processando novo usuário: %', new.id;
  
  -- Extrair o nome dos metadados de forma segura
  IF new.raw_user_meta_data IS NOT NULL AND new.raw_user_meta_data ? 'nome' THEN
    nome_valor := new.raw_user_meta_data->>'nome';
  ELSE
    nome_valor := COALESCE(new.email, 'Usuário');
  END IF;

  -- Extrair tipo_plano se fornecido
  IF new.raw_user_meta_data IS NOT NULL AND new.raw_user_meta_data ? 'tipo_plano' THEN
    tipo_plano_valor := new.raw_user_meta_data->>'tipo_plano';
  END IF;

  -- Extrair quantidade_testes se fornecido
  IF new.raw_user_meta_data IS NOT NULL AND new.raw_user_meta_data ? 'quantidade_testes' THEN
    BEGIN
      quantidade_testes_valor := (new.raw_user_meta_data->>'quantidade_testes')::int;
    EXCEPTION WHEN OTHERS THEN
      quantidade_testes_valor := 3; -- fallback para valor padrão
    END;
  END IF;

  -- Inserir na tabela profiles
  INSERT INTO public.profiles (id, email, nome, tipo_plano, current_plan, trial_started_at, trial_expires_at)
  VALUES (new.id, new.email, nome_valor, tipo_plano_valor, 'start_7', trial_start, trial_end)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = EXCLUDED.nome,
    updated_at = NOW();

  -- Inserir na tabela usuarios com trial de 7 dias
  INSERT INTO public.usuarios (
    id, 
    email, 
    nome, 
    tipo_plano, 
    quantidade_testes, 
    data_criacao,
    current_plan,
    trial_started_at,
    trial_expires_at
  )
  VALUES (
    new.id, 
    new.email, 
    nome_valor, 
    tipo_plano_valor, 
    quantidade_testes_valor, 
    NOW(),
    'start_7',
    trial_start,
    trial_end
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = EXCLUDED.nome,
    ultimo_acesso = NOW();

  RAISE LOG 'Usuário criado com sucesso: % - %', new.id, new.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar usuário %: %', new.id, SQLERRM;
    RETURN NEW; -- Não bloquear a criação do usuário mesmo com erro
END;
$$;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
;
