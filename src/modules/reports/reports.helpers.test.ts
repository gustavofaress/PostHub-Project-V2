import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReportActivityFeed,
  buildReportContentStatus,
  countReportPendingItems,
  getReportCalendarStatusBucket,
  isReportPendingApprovalStatus,
} from './reports.helpers.ts';

test('calendar status normalization keeps legacy and new values in the correct buckets', () => {
  assert.equal(getReportCalendarStatusBucket('Draft'), 'in_production');
  assert.equal(getReportCalendarStatusBucket('Planned'), 'in_production');
  assert.equal(getReportCalendarStatusBucket('rascunho'), 'in_production');
  assert.equal(getReportCalendarStatusBucket('em_producao'), 'in_production');
  assert.equal(getReportCalendarStatusBucket('agendado'), 'in_production');
  assert.equal(getReportCalendarStatusBucket('Review'), 'review');
  assert.equal(getReportCalendarStatusBucket('em_revisao'), 'review');
  assert.equal(getReportCalendarStatusBucket('Published'), 'published');
  assert.equal(getReportCalendarStatusBucket('publicado'), 'published');
  assert.equal(getReportCalendarStatusBucket('concluido'), 'published');
});

test('pending approval statuses keep only pending and changes requested as actionable', () => {
  assert.equal(isReportPendingApprovalStatus('pending'), true);
  assert.equal(isReportPendingApprovalStatus('changes_requested'), true);
  assert.equal(isReportPendingApprovalStatus('approved'), false);
  assert.equal(isReportPendingApprovalStatus('rejected'), false);
});

test('pending KPI deduplicates calendar review and latest approval by calendar post id', () => {
  const pendingCount = countReportPendingItems(
    [
      {
        id: 'calendar-1',
        title: 'Post em revisão',
        status: 'Review',
        updated_at: '2026-08-18T09:00:00.000Z',
        scheduled_date: '2026-08-19T09:00:00.000Z',
      },
      {
        id: 'calendar-2',
        title: 'Post publicado',
        status: 'Published',
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

test('report content status groups production, review, and published buckets correctly', () => {
  assert.deepEqual(
    buildReportContentStatus([
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

test('recent activity excludes scripts and includes only ideas, calendar, and latest approvals', () => {
  const activity = buildReportActivityFeed({
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
        status: 'changes_requested',
        updatedAt: '2026-08-18T10:00:00.000Z',
      },
    ],
    formatTimestamp: (timestamp) => timestamp,
  });

  assert.equal(activity.some((item) => item.type === 'Roteiro'), false);
  assert.deepEqual(
    activity.map((item) => item.type),
    ['Revisão', 'Post', 'Ideia']
  );
});
