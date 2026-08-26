import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLatestCalendarApprovalStatuses } from './calendarApproval.helpers.ts';

test('latest calendar approval status keeps only the newest round per calendar post', () => {
  const latest = buildLatestCalendarApprovalStatuses(
    [
      {
        approvalLinkId: 'link-older',
        calendarPostId: 'post-1',
        status: 'approved',
        updatedAt: '2026-08-18T10:00:00.000Z',
      },
      {
        approvalLinkId: 'link-newer',
        calendarPostId: 'post-1',
        status: 'changes_requested',
        updatedAt: '2026-08-18T12:00:00.000Z',
      },
      {
        approvalLinkId: 'link-pending',
        calendarPostId: 'post-2',
        status: 'pending',
        updatedAt: '2026-08-18T09:30:00.000Z',
      },
    ],
    new Map([
      ['link-older', 'expired'],
      ['link-newer', 'active'],
      ['link-pending', 'active'],
    ])
  );

  assert.deepEqual(latest['post-1'], {
    calendarPostId: 'post-1',
    approvalLinkId: 'link-newer',
    linkStatus: 'active',
    status: 'changes_requested',
    updatedAt: '2026-08-18T12:00:00.000Z',
  });

  assert.deepEqual(latest['post-2'], {
    calendarPostId: 'post-2',
    approvalLinkId: 'link-pending',
    linkStatus: 'active',
    status: 'pending',
    updatedAt: '2026-08-18T09:30:00.000Z',
  });
});
