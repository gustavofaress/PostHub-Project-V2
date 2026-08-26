import type {
  CalendarApprovalLink,
  CalendarPostApproval,
  LatestCalendarApprovalStatus,
} from './calendarApproval.types';

export const buildLatestCalendarApprovalStatuses = (
  approvals: ReadonlyArray<
    Pick<CalendarPostApproval, 'approvalLinkId' | 'calendarPostId' | 'status' | 'updatedAt'>
  >,
  linkStatusById: ReadonlyMap<string, CalendarApprovalLink['status']>
): Record<string, LatestCalendarApprovalStatus> =>
  approvals.reduce<Record<string, LatestCalendarApprovalStatus>>((accumulator, approval) => {
    const current = accumulator[approval.calendarPostId];

    if (
      current &&
      new Date(current.updatedAt).getTime() >= new Date(approval.updatedAt).getTime()
    ) {
      return accumulator;
    }

    accumulator[approval.calendarPostId] = {
      calendarPostId: approval.calendarPostId,
      approvalLinkId: approval.approvalLinkId,
      linkStatus: linkStatusById.get(approval.approvalLinkId) || 'active',
      status: approval.status,
      updatedAt: approval.updatedAt,
    };

    return accumulator;
  }, {});
