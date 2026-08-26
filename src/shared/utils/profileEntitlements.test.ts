import test from 'node:test';
import assert from 'node:assert/strict';
import type { ProfileEntitlementRecord } from '../../types/profile-entitlements.ts';
import {
  buildFreeEntitlements,
  buildProEntitlements,
  computeSeatState,
  doesWorkspaceMemberTransitionConsumeSeat,
  hasProfileFeature,
  isCountedWorkspaceMemberStatus,
  resolveProfileEntitlements,
  resolveProfileFeature,
} from './profileEntitlements.ts';

const FIXED_ISO = '2026-08-18T18:52:03.000Z';

test('buildFreeEntitlements materializes the expected FREE capabilities', () => {
  const free = buildFreeEntitlements({
    profileId: 'profile-free',
    effectiveFrom: FIXED_ISO,
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
  });

  assert.equal(free.plan_code, 'free');
  assert.equal(free.source, 'default_free');
  assert.equal(free.ideas_enabled, true);
  assert.equal(free.calendar_enabled, true);
  assert.equal(free.kanban_enabled, true);
  assert.equal(free.references_enabled, false);
  assert.equal(free.metrics_enabled, false);
  assert.equal(free.social_analytics_enabled, false);
  assert.equal(free.approval_enabled, false);
  assert.equal(free.approval_link_creation_enabled, false);
  assert.equal(free.reports_enabled, false);
  assert.equal(free.max_additional_members, 2);
});

test('buildProEntitlements materializes the expected PRO capabilities', () => {
  const pro = buildProEntitlements({
    profileId: 'profile-pro',
    effectiveFrom: FIXED_ISO,
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
  });

  assert.equal(pro.plan_code, 'pro');
  assert.equal(pro.source, 'stripe');
  assert.equal(pro.ideas_enabled, true);
  assert.equal(pro.calendar_enabled, true);
  assert.equal(pro.kanban_enabled, true);
  assert.equal(pro.references_enabled, true);
  assert.equal(pro.metrics_enabled, true);
  assert.equal(pro.social_analytics_enabled, true);
  assert.equal(pro.approval_enabled, true);
  assert.equal(pro.approval_link_creation_enabled, true);
  assert.equal(pro.reports_enabled, true);
  assert.equal(pro.max_additional_members, null);
});

test('legacy records respect their materialized booleans instead of recalculating from plan code', () => {
  const legacyGrowth: ProfileEntitlementRecord = {
    profile_id: 'profile-legacy-growth',
    plan_code: 'legacy_growth',
    source: 'legacy_snapshot',
    subscription_ref: 'legacy-subscription-ref',
    effective_from: FIXED_ISO,
    effective_until: null,
    ideas_enabled: true,
    calendar_enabled: true,
    kanban_enabled: true,
    references_enabled: true,
    metrics_enabled: false,
    social_analytics_enabled: false,
    approval_enabled: true,
    approval_link_creation_enabled: false,
    reports_enabled: true,
    max_additional_members: 2,
    created_at: FIXED_ISO,
    updated_at: FIXED_ISO,
  };

  const resolved = resolveProfileEntitlements(legacyGrowth);

  assert.equal(resolved.plan_code, 'legacy_growth');
  assert.equal(hasProfileFeature(resolved, 'ideas'), true);
  assert.equal(hasProfileFeature(resolved, 'references'), true);
  assert.equal(hasProfileFeature(resolved, 'metrics'), false);
  assert.equal(hasProfileFeature(resolved, 'approval'), true);
  assert.equal(hasProfileFeature(resolved, 'approvalLinkCreation'), false);
  assert.equal(hasProfileFeature(resolved, 'reports'), true);
});

test('resolveProfileFeature keeps missing distinct from FREE', () => {
  const missing = resolveProfileFeature(null, 'references');
  const free = resolveProfileFeature(
    buildFreeEntitlements({
      profileId: 'profile-free-missing-check',
      effectiveFrom: FIXED_ISO,
      createdAt: FIXED_ISO,
      updatedAt: FIXED_ISO,
    }),
    'references'
  );

  assert.deepEqual(missing, {
    status: 'missing',
    enabled: false,
  });
  assert.deepEqual(free, {
    status: 'resolved',
    enabled: false,
  });
});

test('computeSeatState handles bounded FREE seat counts', () => {
  assert.deepEqual(computeSeatState({ additionalMemberCount: 0, maxAdditionalMembers: 2 }), {
    additionalMemberCount: 0,
    maxAdditionalMembers: 2,
    remainingAdditionalMembers: 2,
    state: 'within_limit',
    isUnlimited: false,
    isWithinLimit: true,
    isAtLimit: false,
    isOverLimit: false,
    canInvite: true,
    canReactivate: true,
  });

  assert.deepEqual(computeSeatState({ additionalMemberCount: 1, maxAdditionalMembers: 2 }), {
    additionalMemberCount: 1,
    maxAdditionalMembers: 2,
    remainingAdditionalMembers: 1,
    state: 'within_limit',
    isUnlimited: false,
    isWithinLimit: true,
    isAtLimit: false,
    isOverLimit: false,
    canInvite: true,
    canReactivate: true,
  });

  assert.deepEqual(computeSeatState({ additionalMemberCount: 2, maxAdditionalMembers: 2 }), {
    additionalMemberCount: 2,
    maxAdditionalMembers: 2,
    remainingAdditionalMembers: 0,
    state: 'at_limit',
    isUnlimited: false,
    isWithinLimit: true,
    isAtLimit: true,
    isOverLimit: false,
    canInvite: false,
    canReactivate: false,
  });

  assert.deepEqual(computeSeatState({ additionalMemberCount: 10, maxAdditionalMembers: 2 }), {
    additionalMemberCount: 10,
    maxAdditionalMembers: 2,
    remainingAdditionalMembers: 0,
    state: 'over_limit',
    isUnlimited: false,
    isWithinLimit: false,
    isAtLimit: false,
    isOverLimit: true,
    canInvite: false,
    canReactivate: false,
  });
});

test('computeSeatState handles unlimited PRO seats', () => {
  assert.deepEqual(computeSeatState({ additionalMemberCount: 10, maxAdditionalMembers: null }), {
    additionalMemberCount: 10,
    maxAdditionalMembers: null,
    remainingAdditionalMembers: null,
    state: 'unlimited',
    isUnlimited: true,
    isWithinLimit: true,
    isAtLimit: false,
    isOverLimit: false,
    canInvite: true,
    canReactivate: true,
  });
});

test('workspace member slot counting only includes invited and active statuses', () => {
  assert.equal(isCountedWorkspaceMemberStatus('invited'), true);
  assert.equal(isCountedWorkspaceMemberStatus('active'), true);
  assert.equal(isCountedWorkspaceMemberStatus('disabled'), false);
  assert.equal(isCountedWorkspaceMemberStatus(null), false);
});

test('workspace member transitions only consume a new slot when occupancy increases', () => {
  assert.equal(
    doesWorkspaceMemberTransitionConsumeSeat({
      previousProfileId: null,
      nextProfileId: 'profile-free',
      previousStatus: null,
      nextStatus: 'active',
    }),
    true
  );
  assert.equal(
    doesWorkspaceMemberTransitionConsumeSeat({
      previousProfileId: null,
      nextProfileId: 'profile-free',
      previousStatus: null,
      nextStatus: 'invited',
    }),
    true
  );
  assert.equal(
    doesWorkspaceMemberTransitionConsumeSeat({
      previousProfileId: 'profile-free',
      nextProfileId: 'profile-free',
      previousStatus: 'disabled',
      nextStatus: 'active',
    }),
    true
  );
  assert.equal(
    doesWorkspaceMemberTransitionConsumeSeat({
      previousProfileId: 'profile-free',
      nextProfileId: 'profile-free',
      previousStatus: 'disabled',
      nextStatus: 'invited',
    }),
    true
  );
  assert.equal(
    doesWorkspaceMemberTransitionConsumeSeat({
      previousProfileId: 'profile-free',
      nextProfileId: 'profile-free',
      previousStatus: 'invited',
      nextStatus: 'active',
    }),
    false
  );
  assert.equal(
    doesWorkspaceMemberTransitionConsumeSeat({
      previousProfileId: 'profile-free',
      nextProfileId: 'profile-free',
      previousStatus: 'active',
      nextStatus: 'active',
    }),
    false
  );
  assert.equal(
    doesWorkspaceMemberTransitionConsumeSeat({
      previousProfileId: 'profile-free',
      nextProfileId: 'profile-free',
      previousStatus: 'active',
      nextStatus: 'disabled',
    }),
    false
  );
  assert.equal(
    doesWorkspaceMemberTransitionConsumeSeat({
      previousProfileId: 'profile-free',
      nextProfileId: 'profile-free',
      previousStatus: 'active',
      nextStatus: null,
    }),
    false
  );
  assert.equal(
    doesWorkspaceMemberTransitionConsumeSeat({
      previousProfileId: 'profile-free',
      nextProfileId: 'profile-other',
      previousStatus: 'active',
      nextStatus: 'active',
    }),
    true
  );
});
