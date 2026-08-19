import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLegacyUserAccessStatus } from './legacyUserAccess.ts';

test('current_plan free becomes a legitimate free access status', () => {
  assert.equal(
    resolveLegacyUserAccessStatus({
      currentPlan: 'free',
      isAdmin: false,
      trialExpiresAt: '2099-01-01T00:00:00.000Z',
    }),
    'free'
  );
});

test('FREE values normalize into the same free access status', () => {
  assert.equal(
    resolveLegacyUserAccessStatus({
      currentPlan: 'FREE',
      isAdmin: false,
      trialExpiresAt: null,
    }),
    'free'
  );
});

test('admin users keep the existing access-status bypass even with current_plan free', () => {
  assert.equal(
    resolveLegacyUserAccessStatus({
      currentPlan: 'free',
      isAdmin: true,
      trialExpiresAt: null,
    }),
    'pro'
  );
});
