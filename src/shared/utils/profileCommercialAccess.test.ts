import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveProfileCommercialFeatureAccess,
} from '../../../shared/profile-commercial-access.ts';
import { buildFreeEntitlements, buildProEntitlements } from '../../../shared/profile-entitlements.ts';

test('materialized entitlement wins over legacy plan fallback', () => {
  const access = resolveProfileCommercialFeatureAccess({
    feature: 'references',
    currentPlan: 'pro',
    entitlements: buildFreeEntitlements({ profileId: 'profile-free' }),
  });

  assert.equal(access.enabled, false);
  assert.equal(access.source, 'profile_entitlements');
});

test('materialized entitlement wins over admin bypass when both are present', () => {
  const access = resolveProfileCommercialFeatureAccess({
    feature: 'references',
    currentPlan: 'pro',
    isAdmin: true,
    entitlements: buildFreeEntitlements({ profileId: 'profile-free' }),
  });

  assert.equal(access.enabled, false);
  assert.equal(access.source, 'profile_entitlements');
});

test('admin keeps the commercial bypass when entitlement is missing', () => {
  const access = resolveProfileCommercialFeatureAccess({
    feature: 'approval',
    currentPlan: 'free',
    isAdmin: true,
  });

  assert.equal(access.enabled, true);
  assert.equal(access.source, 'admin_bypass');
});

test('missing entitlement keeps the legacy fallback semantics for references', () => {
  assert.equal(
    resolveProfileCommercialFeatureAccess({
      feature: 'references',
      currentPlan: 'growth',
    }).enabled,
    true
  );

  assert.equal(
    resolveProfileCommercialFeatureAccess({
      feature: 'references',
      currentPlan: 'free',
    }).enabled,
    false
  );
});

test('missing entitlement keeps the legacy always-open behavior for metrics and social analytics', () => {
  assert.equal(
    resolveProfileCommercialFeatureAccess({
      feature: 'metrics',
      currentPlan: 'free',
    }).enabled,
    true
  );

  assert.equal(
    resolveProfileCommercialFeatureAccess({
      feature: 'socialAnalytics',
      currentPlan: 'blocked',
    }).enabled,
    true
  );
});

test('missing entitlement keeps trial users commercially open in the legacy fallback', () => {
  const access = resolveProfileCommercialFeatureAccess({
    feature: 'approval',
    currentPlan: 'start_7',
  });

  assert.equal(access.enabled, true);
  assert.equal(access.source, 'legacy_runtime');
});

test('materialized PRO entitlement enables premium approval capabilities', () => {
  const access = resolveProfileCommercialFeatureAccess({
    feature: 'approvalLinkCreation',
    currentPlan: 'free',
    entitlements: buildProEntitlements({ profileId: 'profile-pro' }),
  });

  assert.equal(access.enabled, true);
  assert.equal(access.source, 'profile_entitlements');
});
