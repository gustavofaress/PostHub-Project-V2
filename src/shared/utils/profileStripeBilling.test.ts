import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProfileProCheckoutSessionParams,
  buildProfileProMetadata,
  isProfileProPrice,
  parseProfileProMetadata,
  resolveProfileProCheckoutEligibility,
  resolveProfileStripeCheckoutState,
  resolveProfileStripeOrderingDecision,
  resolveProfileStripeWebhookAction,
} from '../../../shared/profile-stripe-subscriptions.ts';

test('checkout without authentication is blocked before session creation', () => {
  const result = resolveProfileProCheckoutEligibility({
    actorUserId: null,
    actorIsAdmin: false,
    profileOwnerUserId: 'owner-1',
    currentEntitlementPlanCode: 'free',
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'authentication_required');
});

test('cross-tenant profile is blocked for billing authority', () => {
  const result = resolveProfileProCheckoutEligibility({
    actorUserId: 'member-1',
    actorIsAdmin: false,
    profileOwnerUserId: 'owner-1',
    currentEntitlementPlanCode: 'free',
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'billing_authority_required');
});

test('owner of a materialized FREE profile can start a valid checkout flow', () => {
  const result = resolveProfileProCheckoutEligibility({
    actorUserId: 'owner-1',
    actorIsAdmin: false,
    profileOwnerUserId: 'owner-1',
    currentEntitlementPlanCode: 'free',
  });

  assert.equal(result.allowed, true);
  assert.equal(result.reason, null);
});

test('profile missing entitlement cannot start the new checkout flow', () => {
  const result = resolveProfileProCheckoutEligibility({
    actorUserId: 'owner-1',
    actorIsAdmin: false,
    profileOwnerUserId: 'owner-1',
    currentEntitlementPlanCode: null,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'free_entitlement_required');
});

test('legacy PRO entitlement cannot start the new checkout flow', () => {
  const result = resolveProfileProCheckoutEligibility({
    actorUserId: 'owner-1',
    actorIsAdmin: false,
    profileOwnerUserId: 'owner-1',
    currentEntitlementPlanCode: 'legacy_pro',
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'free_entitlement_required');
});

test('ADMIN owner does not start a paid PRO checkout flow', () => {
  const result = resolveProfileProCheckoutEligibility({
    actorUserId: 'owner-1',
    actorIsAdmin: true,
    profileOwnerUserId: 'owner-1',
    currentEntitlementPlanCode: 'free',
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'admin_billing_not_required');
});

test('valid checkout_pending blocks a new checkout attempt', () => {
  const result = resolveProfileStripeCheckoutState({
    status: 'checkout_pending',
    checkoutExpiresAt: '2026-08-25T18:00:00.000Z',
    now: new Date('2026-08-25T17:00:00.000Z'),
  });

  assert.equal(result, 'checkout_pending_valid');
});

test('expired checkout_pending allows a new retry after expiring the reservation', () => {
  const result = resolveProfileStripeCheckoutState({
    status: 'checkout_pending',
    checkoutExpiresAt: '2026-08-25T16:00:00.000Z',
    now: new Date('2026-08-25T17:00:00.000Z'),
  });

  assert.equal(result, 'checkout_pending_expired');
});

test('checkout params use only STRIPE_PRICE_PROFILE_PRO with quantity 1', () => {
  const params = buildProfileProCheckoutSessionParams({
    appBaseUrl: 'https://www.posthub.com.br',
    billingReservationId: 'reservation-1',
    priceId: 'price_profile_pro',
    profileId: 'profile-1',
    purchaserUserId: 'user-1',
    customerEmail: 'owner@example.com',
  });

  assert.equal(params.mode, 'subscription');
  assert.deepEqual(params.line_items, [{ price: 'price_profile_pro', quantity: 1 }]);
});

test('checkout params carry the exact profile metadata into the session and subscription', () => {
  const params = buildProfileProCheckoutSessionParams({
    appBaseUrl: 'https://www.posthub.com.br',
    billingReservationId: 'reservation-1',
    priceId: 'price_profile_pro',
    profileId: 'profile-1',
    purchaserUserId: 'user-1',
    customerEmail: 'owner@example.com',
  });

  const metadata = buildProfileProMetadata({
    billingReservationId: 'reservation-1',
    profileId: 'profile-1',
    purchaserUserId: 'user-1',
  });

  assert.deepEqual(params.metadata, metadata);
  assert.deepEqual(
    (params.subscription_data as { metadata: unknown }).metadata,
    metadata
  );
  assert.deepEqual(parseProfileProMetadata(params.metadata), metadata);
});

test('event without profile_pro_v1 billing flow is ignored by metadata parsing', () => {
  assert.equal(
    parseProfileProMetadata({
      billing_flow: 'legacy_checkout',
      billing_reservation_id: 'reservation-1',
      profile_id: 'profile-1',
      purchaser_user_id: 'user-1',
    }),
    null
  );
});

test('legacy price ids are ignored by the new profile PRO flow', () => {
  assert.equal(isProfileProPrice('price_legacy_pro', 'price_profile_pro'), false);
  assert.equal(isProfileProPrice('price_profile_pro', 'price_profile_pro'), true);
});

test('duplicate Stripe event is a safe no-op', () => {
  const decision = resolveProfileStripeOrderingDecision({
    existing: {
      status: 'active',
      lastStripeEventId: 'evt_1',
      lastStripeEventCreated: 100,
    },
    incomingEventId: 'evt_1',
    incomingEventCreated: 100,
    incomingStatus: 'active',
  });

  assert.equal(decision, 'duplicate');
});

test('older Stripe event cannot overwrite newer state', () => {
  const decision = resolveProfileStripeOrderingDecision({
    existing: {
      status: 'canceled',
      lastStripeEventId: 'evt_new',
      lastStripeEventCreated: 200,
    },
    incomingEventId: 'evt_old',
    incomingEventCreated: 150,
    incomingStatus: 'active',
  });

  assert.equal(decision, 'ignore_older_event');
});

test('cancel_at_period_end keeps PRO while the paid period is still valid', () => {
  const action = resolveProfileStripeWebhookAction({
    eventType: 'customer.subscription.updated',
    snapshot: {
      billingReservationId: null,
      checkoutSessionId: null,
      subscriptionId: 'sub_1',
      profileId: 'profile-1',
      purchaserUserId: 'user-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'active',
      currentPeriodEnd: '2026-12-31T00:00:00.000Z',
      cancelAtPeriodEnd: true,
    },
    now: new Date('2026-08-25T00:00:00.000Z'),
  });

  assert.equal(action, 'provision_pro');
});

test('subscription deleted triggers downgrade to FREE', () => {
  const action = resolveProfileStripeWebhookAction({
    eventType: 'customer.subscription.deleted',
    snapshot: {
      billingReservationId: null,
      checkoutSessionId: null,
      subscriptionId: 'sub_1',
      profileId: 'profile-1',
      purchaserUserId: 'user-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'canceled',
      currentPeriodEnd: '2026-08-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
    now: new Date('2026-08-26T00:00:00.000Z'),
  });

  assert.equal(action, 'downgrade_to_free');
});

test('invoice.paid does not provision PRO for an unpaid subscription', () => {
  const action = resolveProfileStripeWebhookAction({
    eventType: 'invoice.paid',
    paymentStatus: 'paid',
    snapshot: {
      billingReservationId: null,
      checkoutSessionId: null,
      subscriptionId: 'sub_1',
      profileId: 'profile-1',
      purchaserUserId: 'user-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'unpaid',
      currentPeriodEnd: '2026-08-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
    now: new Date('2026-08-26T00:00:00.000Z'),
  });

  assert.equal(action, 'sync_only');
});

test('invoice.paid does not provision PRO for a past_due subscription just because it is non-terminal', () => {
  const action = resolveProfileStripeWebhookAction({
    eventType: 'invoice.paid',
    paymentStatus: 'paid',
    snapshot: {
      billingReservationId: null,
      checkoutSessionId: null,
      subscriptionId: 'sub_1',
      profileId: 'profile-1',
      purchaserUserId: 'user-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'past_due',
      currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
    now: new Date('2026-08-26T00:00:00.000Z'),
  });

  assert.equal(action, 'sync_only');
});

test('customer.subscription.updated with unpaid status triggers downgrade to FREE', () => {
  const action = resolveProfileStripeWebhookAction({
    eventType: 'customer.subscription.updated',
    snapshot: {
      billingReservationId: null,
      checkoutSessionId: null,
      subscriptionId: 'sub_1',
      profileId: 'profile-1',
      purchaserUserId: 'user-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'unpaid',
      currentPeriodEnd: '2026-08-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
    now: new Date('2026-08-26T00:00:00.000Z'),
  });

  assert.equal(action, 'downgrade_to_free');
});
