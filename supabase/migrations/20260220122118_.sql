
-- 1. Criar função de trigger para auto-preencher profile_id
CREATE OR REPLACE FUNCTION public.set_instagram_metrics_profile_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.page_id IS NOT NULL AND NEW.customer_id IS NOT NULL THEN
    SELECT ci.profile_id INTO NEW.profile_id
    FROM contas_instagram ci
    WHERE ci.page_id = NEW.page_id
      AND ci.customer_id = NEW.customer_id
      AND ci.profile_id IS NOT NULL
    LIMIT 1;
  END IF;

  IF NEW.profile_id IS NULL AND NEW.customer_id IS NOT NULL THEN
    SELECT id INTO NEW.profile_id
    FROM client_profiles
    WHERE user_id = NEW.customer_id
      AND is_default = true
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Criar trigger BEFORE INSERT
CREATE TRIGGER trg_set_instagram_metrics_profile_id
  BEFORE INSERT ON instagram_metrics
  FOR EACH ROW
  EXECUTE FUNCTION set_instagram_metrics_profile_id();

-- 3. Corrigir métricas órfãs existentes
UPDATE instagram_metrics
SET profile_id = '326c5bfa-0975-4795-83c0-4177d192f26c'
WHERE profile_id IS NULL
  AND customer_id = '619b9808-b536-4846-b71e-83480d571065'
  AND page_id = '17841471397451006';
;
