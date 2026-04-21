import { supabase } from '../shared/utils/supabase';

export interface KanbanColumnRecord {
  id: string;
  profile_id: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EditorialColumnRow {
  id: string;
  profile_id: string;
  name: string;
  position?: number | null;
  order?: number | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_KANBAN_COLUMN_NAMES = [
  'Em Produção',
  'Em Revisão',
  'Agendado',
  'Publicado',
] as const;

export function mapEditorialColumnRow(row: EditorialColumnRow): KanbanColumnRecord {
  return {
    id: row.id,
    profile_id: row.profile_id,
    name: row.name,
    order: row.position ?? row.order ?? 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapKanbanColumnNameToStatus(columnName: string): string {
  const value = columnName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (value.includes('agend') || value.includes('plan')) return 'Planned';
  if (value.includes('produc') || value.includes('draft') || value.includes('prod')) return 'Draft';
  if (value.includes('revis') || value.includes('review') || value.includes('rev')) return 'Review';
  if (value.includes('public') || value.includes('publish')) return 'Published';

  return 'Planned';
}

export const kanbanColumnsService = {
  async ensureDefaultColumns(profileId: string): Promise<KanbanColumnRecord[]> {
    if (!supabase || !profileId) return [];

    const { data: existingColumns, error: existingColumnsError } = await supabase
      .from('editorial_columns')
      .select('*')
      .eq('profile_id', profileId)
      .order('position', { ascending: true });

    if (existingColumnsError) throw existingColumnsError;

    const mappedExistingColumns = ((existingColumns ?? []) as EditorialColumnRow[])
      .map(mapEditorialColumnRow)
      .sort((a, b) => a.order - b.order);

    if (mappedExistingColumns.length > 0) {
      return mappedExistingColumns;
    }

    const now = new Date().toISOString();
    const { data: createdColumns, error: createColumnsError } = await supabase
      .from('editorial_columns')
      .insert(
        DEFAULT_KANBAN_COLUMN_NAMES.map((name, index) => ({
          profile_id: profileId,
          name,
          position: index,
          created_at: now,
          updated_at: now,
        }))
      )
      .select('*');

    if (createColumnsError) throw createColumnsError;

    return ((createdColumns ?? []) as EditorialColumnRow[])
      .map(mapEditorialColumnRow)
      .sort((a, b) => a.order - b.order);
  },
};
