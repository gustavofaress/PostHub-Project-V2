-- ================================================
-- 1. Criar tabela editorial_columns
-- ================================================
CREATE TABLE IF NOT EXISTS editorial_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- 2. RLS
-- ================================================
ALTER TABLE editorial_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view columns of their profiles" ON editorial_columns;
CREATE POLICY "Users can view columns of their profiles"
  ON editorial_columns FOR SELECT USING (
    profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert columns for their profiles" ON editorial_columns;
CREATE POLICY "Users can insert columns for their profiles"
  ON editorial_columns FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update columns of their profiles" ON editorial_columns;
CREATE POLICY "Users can update columns of their profiles"
  ON editorial_columns FOR UPDATE USING (
    profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete columns of their profiles" ON editorial_columns;
CREATE POLICY "Users can delete columns of their profiles"
  ON editorial_columns FOR DELETE USING (
    profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
  );

-- ================================================
-- 3. Indexes
-- ================================================
CREATE INDEX IF NOT EXISTS idx_editorial_columns_profile_position
  ON editorial_columns(profile_id, position);

-- ================================================
-- 4. Updated_at trigger
-- ================================================
DROP TRIGGER IF EXISTS update_editorial_columns_updated_at ON editorial_columns;
CREATE TRIGGER update_editorial_columns_updated_at
  BEFORE UPDATE ON editorial_columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 5. Adicionar kanban_column_id ao editorial_calendar
-- ================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'editorial_calendar'
      AND column_name = 'kanban_column_id'
  ) THEN
    ALTER TABLE editorial_calendar
      ADD COLUMN kanban_column_id uuid REFERENCES editorial_columns(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_editorial_calendar_column_id
  ON editorial_calendar(kanban_column_id);

-- ================================================
-- 6. Remover CHECK constraint do campo status
-- ================================================
ALTER TABLE editorial_calendar DROP CONSTRAINT IF EXISTS editorial_calendar_status_check;

-- ================================================
-- 7. Função create_default_editorial_columns
-- ================================================
CREATE OR REPLACE FUNCTION create_default_editorial_columns(p_profile_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM client_profiles WHERE id = p_profile_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado: perfil não pertence ao usuário autenticado';
  END IF;

  IF EXISTS (SELECT 1 FROM editorial_columns WHERE profile_id = p_profile_id) THEN
    RETURN;
  END IF;

  INSERT INTO editorial_columns (profile_id, name, color, position) VALUES
    (p_profile_id, 'Rascunho', '#9CA3AF', 0),
    (p_profile_id, 'Em Produção', '#38B6FF', 1),
    (p_profile_id, 'Em Revisão', '#FBBF24', 2),
    (p_profile_id, 'Agendado', '#A855F7', 3),
    (p_profile_id, 'Publicado', '#22C55E', 4),
    (p_profile_id, 'Concluído', '#047857', 5);
END;
$$;

-- ================================================
-- 8. Função reorder_editorial_columns
-- ================================================
CREATE OR REPLACE FUNCTION reorder_editorial_columns(p_column_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id uuid;
  v_count integer;
BEGIN
  IF p_column_ids IS NULL OR array_length(p_column_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(DISTINCT ec.id)
  INTO v_count
  FROM editorial_columns ec
  WHERE ec.id = ANY(p_column_ids);

  IF v_count <> array_length(p_column_ids, 1) THEN
    RAISE EXCEPTION 'Um ou mais IDs de coluna não existem';
  END IF;

  IF (SELECT COUNT(DISTINCT ec.profile_id) FROM editorial_columns ec WHERE ec.id = ANY(p_column_ids)) > 1 THEN
    RAISE EXCEPTION 'Colunas pertencem a perfis diferentes';
  END IF;

  SELECT ec.profile_id INTO v_profile_id
  FROM editorial_columns ec
  WHERE ec.id = p_column_ids[1];

  IF NOT EXISTS (
    SELECT 1 FROM client_profiles WHERE id = v_profile_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado: perfil não pertence ao usuário autenticado';
  END IF;

  UPDATE editorial_columns
  SET position = data.new_position
  FROM (
    SELECT
      unnest(p_column_ids) AS id,
      generate_series(0, array_length(p_column_ids, 1) - 1) AS new_position
  ) AS data
  WHERE editorial_columns.id = data.id;
END;
$$;;
