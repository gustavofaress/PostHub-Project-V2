import type { ApprovalStatus } from '../approval/approval.types';
import { getEditorialStatusBucket } from '../../shared/utils/editorialStatus';

export interface DashboardIdeaRow {
  id: string;
  title: string;
  updated_at: string;
}

export interface DashboardCalendarRow {
  id: string;
  title: string;
  status: string | null;
  updated_at: string;
  scheduled_date?: string | null;
}

export interface DashboardLatestApprovalEntry {
  calendarPostId: string;
  status: ApprovalStatus;
  updatedAt: string;
}

export interface DashboardActivityItem {
  id: string;
  type: string;
  title: string;
  time: string;
  status: 'success' | 'info' | 'warning' | 'error';
  createdAt: string;
}

export const isDashboardPendingApprovalStatus = (
  status: ApprovalStatus | null | undefined
) => status === 'pending' || status === 'changes_requested';

export const countDashboardPendingItems = (
  calendar: ReadonlyArray<DashboardCalendarRow>,
  latestApprovals: ReadonlyArray<DashboardLatestApprovalEntry>
) => {
  const pendingItemIds = new Set<string>();

  calendar.forEach((item) => {
    if (getEditorialStatusBucket(item.status) === 'review') {
      pendingItemIds.add(item.id);
    }
  });

  latestApprovals.forEach((approval) => {
    if (isDashboardPendingApprovalStatus(approval.status)) {
      pendingItemIds.add(approval.calendarPostId);
    }
  });

  return pendingItemIds.size;
};

export const buildDashboardContentStatus = (
  calendar: ReadonlyArray<DashboardCalendarRow>
) => ({
  inProduction: calendar.filter(
    (item) => getEditorialStatusBucket(item.status) === 'in_production'
  ).length,
  pendingReview: calendar.filter(
    (item) => getEditorialStatusBucket(item.status) === 'review'
  ).length,
  published: calendar.filter(
    (item) => getEditorialStatusBucket(item.status) === 'published'
  ).length,
});

export const getDashboardApprovalActivityStatus = (
  status: ApprovalStatus
): DashboardActivityItem['status'] => {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    case 'pending':
    case 'changes_requested':
      return 'warning';
    default:
      return 'info';
  }
};

export const buildDashboardDesktopActivityFeed = (input: {
  ideas: ReadonlyArray<DashboardIdeaRow>;
  calendar: ReadonlyArray<DashboardCalendarRow>;
  latestApprovals: ReadonlyArray<DashboardLatestApprovalEntry>;
  formatTimestamp: (timestamp: string) => string;
}): DashboardActivityItem[] => {
  const { ideas, calendar, latestApprovals, formatTimestamp } = input;
  const calendarById = new Map(calendar.map((item) => [item.id, item]));
  const activities: DashboardActivityItem[] = [];

  ideas.slice(0, 3).forEach((item) => {
    activities.push({
      id: `idea-${item.id}`,
      type: 'ideia',
      title: `Nova ideia adicionada: "${item.title}"`,
      time: formatTimestamp(item.updated_at),
      status: 'info',
      createdAt: item.updated_at,
    });
  });

  calendar.slice(0, 4).forEach((item) => {
    const bucket = getEditorialStatusBucket(item.status);

    activities.push({
      id: `calendar-${item.id}`,
      type: 'post',
      title:
        bucket === 'published'
          ? `${item.title} foi publicado`
          : `${item.title} atualizado no calendário`,
      time: formatTimestamp(item.updated_at),
      status:
        bucket === 'published' ? 'success' : bucket === 'review' ? 'warning' : 'info',
      createdAt: item.updated_at,
    });
  });

  [...latestApprovals]
    .sort(
      (first, second) =>
        new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
    )
    .slice(0, 3)
    .forEach((approval) => {
      const linkedPost = calendarById.get(approval.calendarPostId);
      const title = linkedPost?.title || 'Post sem título';

      let activityTitle = `Aprovação atualizada: "${title}"`;

      if (approval.status === 'pending') {
        activityTitle = `Aprovação pendente: "${title}"`;
      } else if (approval.status === 'changes_requested') {
        activityTitle = `Alterações solicitadas para "${title}"`;
      } else if (approval.status === 'approved') {
        activityTitle = `Aprovação concluída: "${title}"`;
      } else if (approval.status === 'rejected') {
        activityTitle = `Aprovação rejeitada: "${title}"`;
      }

      activities.push({
        id: `approval-${approval.calendarPostId}`,
        type: 'revisão',
        title: activityTitle,
        time: formatTimestamp(approval.updatedAt),
        status: getDashboardApprovalActivityStatus(approval.status),
        createdAt: approval.updatedAt,
      });
    });

  return activities
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    )
    .slice(0, 6);
};
