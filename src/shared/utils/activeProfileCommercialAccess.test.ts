import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFreeEntitlements,
  buildProEntitlements,
  resolveProfileEntitlements,
} from './profileEntitlements.ts';
import {
  canAccessFeatureWithWorkspacePermission,
  canUseActiveProfileFeature,
  resolveActiveProfileCommercialAccess,
  resolveActiveProfileFeatureAccess,
} from './activeProfileCommercialAccess.ts';

const FIXED_ISO = '2026-08-18T20:20:25.000Z';

const freeResolved = resolveProfileEntitlements(
  buildFreeEntitlements({
    profileId: 'profile-free',
    effectiveFrom: FIXED_ISO,
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
  })
);

const legacyProResolved = resolveProfileEntitlements({
  ...buildProEntitlements({
    profileId: 'profile-legacy-pro',
    effectiveFrom: FIXED_ISO,
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
  }),
  plan_code: 'legacy_pro',
  source: 'legacy_snapshot',
});

test('FREE resolved denies premium features and keeps calendar plus kanban enabled', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'resolved',
    entitlements: freeResolved,
    currentPlan: 'pro',
    isAdmin: false,
  });

  assert.equal(access.status, 'resolved');
  assert.equal(canUseActiveProfileFeature(access, 'ideas'), true);
  assert.equal(canUseActiveProfileFeature(access, 'references'), false);
  assert.equal(canUseActiveProfileFeature(access, 'metrics'), false);
  assert.equal(canUseActiveProfileFeature(access, 'approval'), false);
  assert.equal(canUseActiveProfileFeature(access, 'reports'), false);
  assert.equal(canUseActiveProfileFeature(access, 'calendar'), true);
  assert.equal(canUseActiveProfileFeature(access, 'kanban'), true);
});

test('legacy runtime free still respects a FREE resolved profile entitlement', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'resolved',
    entitlements: freeResolved,
    currentPlan: 'free',
    isAdmin: false,
  });

  assert.equal(access.status, 'resolved');
  assert.equal(canUseActiveProfileFeature(access, 'references'), false);
  assert.equal(canUseActiveProfileFeature(access, 'metrics'), false);
  assert.equal(canUseActiveProfileFeature(access, 'approval'), false);
  assert.equal(canUseActiveProfileFeature(access, 'calendar'), true);
  assert.equal(canUseActiveProfileFeature(access, 'kanban'), true);
});

test('legacy trial runtime start_7 still respects a FREE resolved profile entitlement', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'resolved',
    entitlements: freeResolved,
    currentPlan: 'start_7',
    isAdmin: false,
  });

  assert.equal(access.status, 'resolved');
  assert.equal(canUseActiveProfileFeature(access, 'references'), false);
  assert.equal(canUseActiveProfileFeature(access, 'metrics'), false);
  assert.equal(canUseActiveProfileFeature(access, 'approval'), false);
  assert.equal(canUseActiveProfileFeature(access, 'calendar'), true);
  assert.equal(canUseActiveProfileFeature(access, 'kanban'), true);
});

test('legacy runtime free still follows a resolved LEGACY PRO profile capability row', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'resolved',
    entitlements: legacyProResolved,
    currentPlan: 'free',
    isAdmin: false,
  });

  assert.equal(access.status, 'resolved');
  assert.equal(canUseActiveProfileFeature(access, 'ideas'), true);
  assert.equal(canUseActiveProfileFeature(access, 'references'), true);
  assert.equal(canUseActiveProfileFeature(access, 'metrics'), true);
  assert.equal(canUseActiveProfileFeature(access, 'approval'), true);
  assert.equal(canUseActiveProfileFeature(access, 'reports'), true);
});

test('LEGACY PRO resolved keeps premium features enabled from materialized entitlements', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'resolved',
    entitlements: legacyProResolved,
    currentPlan: 'start',
    isAdmin: false,
  });

  assert.equal(access.status, 'resolved');
  assert.equal(canUseActiveProfileFeature(access, 'references'), true);
  assert.equal(canUseActiveProfileFeature(access, 'metrics'), true);
  assert.equal(canUseActiveProfileFeature(access, 'approval'), true);
  assert.equal(canUseActiveProfileFeature(access, 'approvalLinkCreation'), true);
});

test('member-only legacy runtime pro does not override a FREE resolved profile', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'resolved',
    entitlements: freeResolved,
    currentPlan: 'pro',
    isAdmin: false,
  });

  assert.equal(resolveActiveProfileFeatureAccess(access, 'metrics').enabled, false);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'approval').enabled, false);
});

test('member-only legacy runtime pro still follows the resolved PRO profile capabilities', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'resolved',
    entitlements: legacyProResolved,
    currentPlan: 'pro',
    isAdmin: false,
  });

  assert.equal(resolveActiveProfileFeatureAccess(access, 'metrics').enabled, true);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'approval').enabled, true);
});

test('ADMIN with valid profile access and missing entitlement enters admin bypass', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'missing',
    entitlements: null,
    currentPlan: 'start',
    isAdmin: true,
  });

  assert.equal(access.status, 'admin_bypass');
  assert.equal(resolveActiveProfileFeatureAccess(access, 'references').enabled, true);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'metrics').enabled, true);
});

test('ADMIN plus FREE resolved enters admin bypass and still preserves the profile row metadata', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'resolved',
    entitlements: freeResolved,
    currentPlan: 'pro',
    isAdmin: true,
  });

  assert.equal(access.status, 'admin_bypass');
  assert.equal(access.planCode, 'free');
  assert.equal(access.entitlements?.plan_code, 'free');
  assert.equal(resolveActiveProfileFeatureAccess(access, 'references').enabled, true);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'metrics').enabled, true);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'approval').enabled, true);
});

test('ADMIN plus PRO resolved keeps premium enabled via admin bypass', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'resolved',
    entitlements: legacyProResolved,
    currentPlan: 'start',
    isAdmin: true,
  });

  assert.equal(access.status, 'admin_bypass');
  assert.equal(access.planCode, 'legacy_pro');
  assert.equal(resolveActiveProfileFeatureAccess(access, 'references').enabled, true);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'metrics').enabled, true);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'approval').enabled, true);
});

test('missing entitlement for non-admin enters legacy compatibility mode', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'missing',
    entitlements: null,
    currentPlan: 'pro',
    isAdmin: false,
  });

  assert.equal(access.status, 'legacy_fallback');
  assert.equal(resolveActiveProfileFeatureAccess(access, 'references').enabled, true);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'metrics').enabled, true);
});

test('query error does not fall back to legacy compatibility mode', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'error',
    entitlements: null,
    currentPlan: 'pro',
    isAdmin: false,
  });

  assert.equal(access.status, 'error');
  assert.equal(resolveActiveProfileFeatureAccess(access, 'references').enabled, false);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'metrics').enabled, false);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'calendar').enabled, true);
});

test('query error does not release premium for ADMIN before the state resolves', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'error',
    entitlements: null,
    currentPlan: 'pro',
    isAdmin: true,
  });

  assert.equal(access.status, 'error');
  assert.equal(resolveActiveProfileFeatureAccess(access, 'references').enabled, false);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'metrics').enabled, false);
});

test('loading never releases premium access prematurely', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'loading',
    entitlements: null,
    currentPlan: 'pro',
    isAdmin: false,
  });

  assert.equal(access.status, 'loading');
  assert.equal(resolveActiveProfileFeatureAccess(access, 'references').enabled, false);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'metrics').enabled, false);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'calendar').enabled, true);
});

test('loading never releases premium for ADMIN prematurely', () => {
  const access = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'loading',
    entitlements: null,
    currentPlan: 'start',
    isAdmin: true,
  });

  assert.equal(access.status, 'loading');
  assert.equal(resolveActiveProfileFeatureAccess(access, 'references').enabled, false);
  assert.equal(resolveActiveProfileFeatureAccess(access, 'approval').enabled, false);
});

test('profile switching keeps access scoped to the active profile', () => {
  const freeAccess = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'resolved',
    entitlements: freeResolved,
    currentPlan: 'pro',
    isAdmin: false,
  });
  const proAccess = resolveActiveProfileCommercialAccess({
    hasActiveProfile: true,
    entitlementStatus: 'resolved',
    entitlements: legacyProResolved,
    currentPlan: 'pro',
    isAdmin: false,
  });

  assert.equal(resolveActiveProfileFeatureAccess(freeAccess, 'metrics').enabled, false);
  assert.equal(resolveActiveProfileFeatureAccess(proAccess, 'metrics').enabled, true);
  assert.equal(resolveActiveProfileFeatureAccess(freeAccess, 'approval').enabled, false);
  assert.equal(resolveActiveProfileFeatureAccess(proAccess, 'approval').enabled, true);
});

test('commercial allow plus permission deny results in deny', () => {
  assert.equal(
    canAccessFeatureWithWorkspacePermission({
      commercialAllowed: true,
      permissionAllowed: false,
    }),
    false
  );
});

test('commercial deny plus permission allow results in deny', () => {
  assert.equal(
    canAccessFeatureWithWorkspacePermission({
      commercialAllowed: false,
      permissionAllowed: true,
    }),
    false
  );
});

test('commercial allow plus permission allow results in allow', () => {
  assert.equal(
    canAccessFeatureWithWorkspacePermission({
      commercialAllowed: true,
      permissionAllowed: true,
    }),
    true
  );
});
