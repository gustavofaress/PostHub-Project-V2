import type { ApprovalStatus } from '../approval/approval.types';

export interface ReportIdeaRow {
  id: string;
  title: string;
  updated_at: string;
}

export interface ReportCalendarRow {
  id: string;
  title: string;
  status: string | null;
  updated_at: string;
  scheduled_date?: string | null;
}

export interface ReportLatestApprovalEntry {
  calendarPostId: string;
  status: ApprovalStatus;
  updatedAt: string;
}

export interface ReportActivityItem {
  id: string;
  type: string;
  title: string;
  time: string;
  status: 'success' | 'info' | 'warning';
  createdAt: string;
}

export type ReportCalendarStatusBucket =
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

const normalizeStatus = (status: string | null | undefined) =>
  status?.trim().toLowerCase() || '';

export const getReportCalendarStatusBucket = (
  status: string | null | undefined
): ReportCalendarStatusBucket => {
  const normalizedStatus = normalizeStatus(status);

  if (IN_PRODUCTION_STATUSES.has(normalizedStatus)) return 'in_production';
  if (REVIEW_STATUSES.has(normalizedStatus)) return 'review';
  if (PUBLISHED_STATUSES.has(normalizedStatus)) return 'published';
  return 'unknown';
};

export const isReportPendingApprovalStatus = (
  status: ApprovalStatus | null | undefined
) => status === 'pending' || status === 'changes_requested';

export const buildReportContentStatus = (calendar: ReadonlyArray<ReportCalendarRow>) => ({
  inProduction: calendar.filter(
    (item) => getReportCalendarStatusBucket(item.status) === 'in_production'
  ).length,
  pendingReview: calendar.filter(
    (item) => getReportCalendarStatusBucket(item.status) === 'review'
  ).length,
  published: calendar.filter(
    (item) => getReportCalendarStatusBucket(item.status) === 'published'
  ).length,
});

export const countReportPendingItems = (
  calendar: ReadonlyArray<ReportCalendarRow>,
  latestApprovals: ReadonlyArray<ReportLatestApprovalEntry>
) => {
  const pendingItemIds = new Set<string>();

  calendar.forEach((item) => {
    if (getReportCalendarStatusBucket(item.status) === 'review') {
      pendingItemIds.add(item.id);
    }
  });

  latestApprovals.forEach((approval) => {
    if (isReportPendingApprovalStatus(approval.status)) {
      pendingItemIds.add(approval.calendarPostId);
    }
  });

  return pendingItemIds.size;
};

export const buildReportActivityFeed = (input: {
  ideas: ReadonlyArray<ReportIdeaRow>;
  calendar: ReadonlyArray<ReportCalendarRow>;
  latestApprovals: ReadonlyArray<ReportLatestApprovalEntry>;
  formatTimestamp: (timestamp: string) => string;
}): ReportActivityItem[] => {
  const { ideas, calendar, latestApprovals, formatTimestamp } = input;
  const calendarById = new Map(calendar.map((item) => [item.id, item]));
  const activities: ReportActivityItem[] = [];

  ideas.slice(0, 5).forEach((item) => {
    activities.push({
      id: `idea-${item.id}`,
      type: 'Ideia',
      title: `Nova ideia: "${item.title}"`,
      time: formatTimestamp(item.updated_at),
      status: 'info',
      createdAt: item.updated_at,
    });
  });

  calendar.slice(0, 5).forEach((item) => {
    const bucket = getReportCalendarStatusBucket(item.status);

    activities.push({
      id: `calendar-${item.id}`,
      type: 'Post',
      title:
        bucket === 'published'
          ? `${item.title} foi publicado`
          : `${item.title} atualizado`,
      time: formatTimestamp(item.updated_at),
      status: bucket === 'published' ? 'success' : bucket === 'review' ? 'warning' : 'info',
      createdAt: item.updated_at,
    });
  });

  [...latestApprovals]
    .sort(
      (first, second) =>
        new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
    )
    .slice(0, 5)
    .forEach((approval) => {
      const linkedPost = calendarById.get(approval.calendarPostId);
      const title = linkedPost?.title || 'Post sem título';

      let activityTitle = `Aprovação atualizada: "${title}"`;
      let activityStatus: ReportActivityItem['status'] = 'success';

      if (approval.status === 'pending') {
        activityTitle = `Aprovação pendente: "${title}"`;
        activityStatus = 'warning';
      } else if (approval.status === 'changes_requested') {
        activityTitle = `Alterações solicitadas: "${title}"`;
        activityStatus = 'warning';
      } else if (approval.status === 'rejected') {
        activityTitle = `Aprovação rejeitada: "${title}"`;
        activityStatus = 'warning';
      }

      activities.push({
        id: `approval-${approval.calendarPostId}`,
        type: 'Revisão',
        title: activityTitle,
        time: formatTimestamp(approval.updatedAt),
        status: activityStatus,
        createdAt: approval.updatedAt,
      });
    });

  return activities
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    )
    .slice(0, 10);
};
