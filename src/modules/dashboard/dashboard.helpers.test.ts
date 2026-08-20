import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDashboardContentStatus,
  buildDashboardDesktopActivityFeed,
  countDashboardPendingItems,
  getDashboardApprovalActivityStatus,
  isDashboardPendingApprovalStatus,
} from './dashboard.helpers.ts';

test('dashboard pending statuses keep only pending and changes requested as actionable', () => {
  assert.equal(isDashboardPendingApprovalStatus('pending'), true);
  assert.equal(isDashboardPendingApprovalStatus('changes_requested'), true);
  assert.equal(isDashboardPendingApprovalStatus('approved'), false);
  assert.equal(isDashboardPendingApprovalStatus('rejected'), false);
});

test('dashboard pending KPI deduplicates calendar review and latest approval by calendar post id', () => {
  const pendingCount = countDashboardPendingItems(
    [
      {
        id: 'calendar-1',
        title: 'Post em revisão',
        status: 'em_revisao',
        updated_at: '2026-08-18T09:00:00.000Z',
        scheduled_date: '2026-08-19T09:00:00.000Z',
      },
      {
        id: 'calendar-2',
        title: 'Post em produção',
        status: 'agendado',
        updated_at: '2026-08-18T08:00:00.000Z',
        scheduled_date: '2026-08-20T09:00:00.000Z',
      },
    ],
    [
      {
        calendarPostId: 'calendar-1',
        status: 'pending',
        updatedAt: '2026-08-18T10:00:00.000Z',
      },
      {
        calendarPostId: 'calendar-2',
        status: 'changes_requested',
        updatedAt: '2026-08-18T11:00:00.000Z',
      },
      {
        calendarPostId: 'calendar-3',
        status: 'approved',
        updatedAt: '2026-08-18T12:00:00.000Z',
      },
    ]
  );

  assert.equal(pendingCount, 2);
});

test('dashboard content status groups production, review, and published buckets correctly', () => {
  assert.deepEqual(
    buildDashboardContentStatus([
      {
        id: '1',
        title: 'Rascunho',
        status: 'Draft',
        updated_at: '2026-08-18T08:00:00.000Z',
      },
      {
        id: '2',
        title: 'Revisão',
        status: 'em_revisao',
        updated_at: '2026-08-18T09:00:00.000Z',
      },
      {
        id: '3',
        title: 'Publicado',
        status: 'concluido',
        updated_at: '2026-08-18T10:00:00.000Z',
      },
    ]),
    {
      inProduction: 1,
      pendingReview: 1,
      published: 1,
    }
  );
});

test('dashboard approval activity uses warning for pending states and error for rejected', () => {
  assert.equal(getDashboardApprovalActivityStatus('pending'), 'warning');
  assert.equal(getDashboardApprovalActivityStatus('changes_requested'), 'warning');
  assert.equal(getDashboardApprovalActivityStatus('approved'), 'success');
  assert.equal(getDashboardApprovalActivityStatus('rejected'), 'error');
});

test('dashboard recent activity uses latest approvals only and keeps approval visuals out of success for pending', () => {
  const activity = buildDashboardDesktopActivityFeed({
    ideas: [
      {
        id: 'idea-1',
        title: 'Ideia forte',
        updated_at: '2026-08-18T08:00:00.000Z',
      },
    ],
    calendar: [
      {
        id: 'post-1',
        title: 'Post em revisão',
        status: 'Review',
        updated_at: '2026-08-18T09:00:00.000Z',
        scheduled_date: '2026-08-19T09:00:00.000Z',
      },
    ],
    latestApprovals: [
      {
        calendarPostId: 'post-1',
        status: 'pending',
        updatedAt: '2026-08-18T10:00:00.000Z',
      },
      {
        calendarPostId: 'post-2',
        status: 'approved',
        updatedAt: '2026-08-18T11:00:00.000Z',
      },
    ],
    formatTimestamp: (timestamp) => timestamp,
  });

  const approvalStatuses = activity.filter((item) => item.type === 'revisão').map((item) => item.status);
  assert.deepEqual(approvalStatuses, ['success', 'warning']);
  assert.equal(activity.some((item) => item.status === 'success' && item.title.includes('pendente')), false);
});
