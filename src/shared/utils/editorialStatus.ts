export type EditorialStatusBucket =
  | 'in_production'
  | 'review'
  | 'published'
  | 'unknown';

const IN_PRODUCTION_STATUSES = new Set([
  'draft',
  'planned',
  'rascunho',
  'em_producao',
  'agendado',
]);

const REVIEW_STATUSES = new Set(['review', 'em_revisao']);

const PUBLISHED_STATUSES = new Set(['published', 'publicado', 'concluido']);

const normalizeEditorialStatus = (status: string | null | undefined) =>
  status?.trim().toLowerCase() || '';

export const getEditorialStatusBucket = (
  status: string | null | undefined
): EditorialStatusBucket => {
  const normalizedStatus = normalizeEditorialStatus(status);

  if (IN_PRODUCTION_STATUSES.has(normalizedStatus)) return 'in_production';
  if (REVIEW_STATUSES.has(normalizedStatus)) return 'review';
  if (PUBLISHED_STATUSES.has(normalizedStatus)) return 'published';
  return 'unknown';
};
