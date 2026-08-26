import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveProfilePricingState,
  resolveProfileProCheckoutProfileId,
} from './profilePricing.ts';

const baseInput = {
  profileId: 'profile-active',
  profileName: 'Perfil Ativo',
  profileRole: 'owner',
  entitlementStatus: 'resolved' as const,
  planCode: 'free',
  entitlementSource: 'default_free',
  isAdmin: false,
};

test('active profile FREE owner sees FREE as current and can start PRO checkout', () => {
  const state = resolveProfilePricingState(baseInput);

  assert.equal(state.isFreeCurrent, true);
  assert.equal(state.freeBadgeLabel, 'Plano atual');
  assert.equal(state.proAction, 'upgrade_to_pro');
  assert.equal(state.canStartCheckout, true);
});

test('PRO checkout resolves only the active profile id', () => {
  const state = resolveProfilePricingState(baseInput);

  assert.equal(resolveProfileProCheckoutProfileId(state), 'profile-active');
});

test('checkout loading prevents a second checkout start', () => {
  const state = resolveProfilePricingState({
    ...baseInput,
    isCheckoutLoading: true,
  });

  assert.equal(state.canStartCheckout, false);
  assert.equal(resolveProfileProCheckoutProfileId(state), null);
});

test('workspace member cannot start billing for a shared profile', () => {
  const state = resolveProfilePricingState({
    ...baseInput,
    profileRole: 'editor',
  });

  assert.equal(state.proAction, 'owner_required');
  assert.equal(state.canStartCheckout, false);
});

test('ADMIN does not start paid PRO checkout', () => {
  const state = resolveProfilePricingState({
    ...baseInput,
    isAdmin: true,
  });

  assert.equal(state.proAction, 'admin_access');
  assert.equal(state.canStartCheckout, false);
});

test('Stripe PRO entitlement is treated as the current plan without new checkout', () => {
  const state = resolveProfilePricingState({
    ...baseInput,
    planCode: 'pro',
    entitlementSource: 'stripe',
  });

  assert.equal(state.isProCurrent, true);
  assert.equal(state.proAction, 'current_stripe_pro');
  assert.equal(state.canStartCheckout, false);
});

test('legacy PRO entitlement is treated as current access without new billing', () => {
  const state = resolveProfilePricingState({
    ...baseInput,
    planCode: 'legacy_pro',
    entitlementSource: 'legacy_snapshot',
  });

  assert.equal(state.isLegacyProCurrent, true);
  assert.equal(state.proAction, 'current_legacy_pro');
  assert.equal(state.canStartCheckout, false);
});

test('missing entitlement is not assumed to be FREE', () => {
  const state = resolveProfilePricingState({
    ...baseInput,
    entitlementStatus: 'missing',
    planCode: null,
    entitlementSource: null,
  });

  assert.equal(state.isFreeCurrent, false);
  assert.equal(state.proAction, 'entitlement_missing');
  assert.equal(state.canStartCheckout, false);
});

test('loading state never exposes an incorrect checkout CTA', () => {
  const state = resolveProfilePricingState({
    ...baseInput,
    entitlementStatus: 'loading',
    planCode: null,
    entitlementSource: null,
  });

  assert.equal(state.proAction, 'loading');
  assert.equal(state.canStartCheckout, false);
});

test('entitlement error shows a safe retryable state without checkout', () => {
  const state = resolveProfilePricingState({
    ...baseInput,
    entitlementStatus: 'error',
    planCode: null,
    entitlementSource: null,
  });

  assert.equal(state.proAction, 'entitlement_error');
  assert.equal(state.canStartCheckout, false);
});

test('switching active profile changes plan and CTA state', () => {
  const freeState = resolveProfilePricingState(baseInput);
  const legacyProState = resolveProfilePricingState({
    ...baseInput,
    profileId: 'profile-legacy',
    profileName: 'Perfil Legado',
    planCode: 'legacy_pro',
    entitlementSource: 'legacy_snapshot',
  });

  assert.equal(freeState.profileId, 'profile-active');
  assert.equal(freeState.canStartCheckout, true);
  assert.equal(legacyProState.profileId, 'profile-legacy');
  assert.equal(legacyProState.canStartCheckout, false);
  assert.equal(legacyProState.proAction, 'current_legacy_pro');
});

test('non-FREE materialized plans cannot start the new checkout flow', () => {
  const state = resolveProfilePricingState({
    ...baseInput,
    planCode: 'legacy_growth',
    entitlementSource: 'legacy_snapshot',
  });

  assert.equal(state.proAction, 'unsupported_legacy');
  assert.equal(state.canStartCheckout, false);
});
