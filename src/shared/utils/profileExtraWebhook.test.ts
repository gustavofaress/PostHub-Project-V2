import assert from 'node:assert/strict';
import test from 'node:test';

import type { ProfileEntitlementRecord } from '../../../shared/profile-entitlements.ts';
import { buildFreeEntitlements, buildProEntitlements } from '../../../shared/profile-entitlements.ts';
import type {
  ProfileExtraSubscriptionRecord,
  ProfileExtraSubscriptionSnapshot,
  ProfileExtraWebhookEventType,
} from '../../../shared/profile-extra-subscriptions.ts';
import {
  buildProfileExtraMetadata,
  buildProfileExtraSubscriptionSnapshotFromSubscriptionPayload,
  getSubscriptionIdFromInvoicePayload,
  resolveProfileExtraWebhookAction,
} from '../../../shared/profile-extra-subscriptions.ts';
import { processProfileExtraWebhookEvent } from '../../../supabase/functions/_shared/stripe/profile-extra.ts';

const buildExtraReservationRecord = (
  input: Partial<ProfileExtraSubscriptionRecord> & {
    id: string;
    purchasedByUserId: string;
    stripePriceId: string;
  }
): ProfileExtraSubscriptionRecord => ({
  id: input.id,
  purchasedByUserId: input.purchasedByUserId,
  sourceProfileId: input.sourceProfileId ?? 'source-profile-1',
  targetProfileId: input.targetProfileId ?? null,
  stripeCustomerId: input.stripeCustomerId ?? null,
  stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
  checkoutExpiresAt: input.checkoutExpiresAt ?? null,
  stripeSubscriptionId: input.stripeSubscriptionId ?? null,
  stripePriceId: input.stripePriceId,
  status: input.status ?? 'checkout_pending',
  currentPeriodEnd: input.currentPeriodEnd ?? null,
  cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
  lastStripeEventId: input.lastStripeEventId ?? null,
  lastStripeEventCreated: input.lastStripeEventCreated ?? null,
});

const buildSnapshot = (
  overrides?: Partial<ProfileExtraSubscriptionSnapshot>
): ProfileExtraSubscriptionSnapshot => ({
  billingReservationId: 'reservation-1',
  checkoutSessionId: 'cs_1',
  subscriptionId: 'sub_1',
  sourceProfileId: 'source-profile-1',
  purchaserUserId: 'owner-1',
  customerId: 'cus_1',
  priceId: 'price_profile_extra',
  status: 'active',
  currentPeriodEnd: '2026-09-26T12:00:00.000Z',
  cancelAtPeriodEnd: false,
  ...(overrides ?? {}),
});

function createWebhookHarness(input?: {
  sourceProfiles?: string[];
  entitlements?: ProfileEntitlementRecord[];
  subscriptions?: ProfileExtraSubscriptionRecord[];
}) {
  const sourceProfiles = new Set(input?.sourceProfiles ?? ['source-profile-1']);
  const entitlements = new Map(
    (input?.entitlements ?? []).map((record) => [record.profile_id, record] as const)
  );
  const subscriptions = new Map(
    (input?.subscriptions ?? []).map((record) => [record.id, record] as const)
  );
  const writes = {
    subscriptionSaves: [] as ProfileExtraSubscriptionRecord[],
    profileActiveUpdates: [] as Array<{ profileId: string; isActive: boolean }>,
    entitlementUpserts: [] as ProfileEntitlementRecord[],
  };

  const findByStripeSubscriptionId = (stripeSubscriptionId: string) => {
    for (const record of subscriptions.values()) {
      if (record.stripeSubscriptionId === stripeSubscriptionId) {
        return record;
      }
    }

    return null;
  };

  const findByCheckoutSessionId = (stripeCheckoutSessionId: string) => {
    for (const record of subscriptions.values()) {
      if (record.stripeCheckoutSessionId === stripeCheckoutSessionId) {
        return record;
      }
    }

    return null;
  };

  return {
    subscriptions,
    entitlements,
    writes,
    async process(params: {
      eventId: string;
      eventCreated: number;
      eventType: ProfileExtraWebhookEventType;
      paymentStatus?: string | null;
      snapshot: ProfileExtraSubscriptionSnapshot;
    }) {
      return processProfileExtraWebhookEvent({
        ...params,
        loadSourceProfileById: async (profileId) =>
          sourceProfiles.has(profileId) ? { id: profileId } : null,
        loadSubscriptionByStripeId: async (stripeSubscriptionId) =>
          findByStripeSubscriptionId(stripeSubscriptionId),
        loadSubscriptionByCheckoutSessionId: async (stripeCheckoutSessionId) =>
          findByCheckoutSessionId(stripeCheckoutSessionId),
        loadSubscriptionByReservationId: async (reservationId) =>
          subscriptions.get(reservationId) ?? null,
        loadCurrentEntitlementByProfileId: async (profileId) => {
          const record = entitlements.get(profileId);
          return record
            ? {
                plan_code: record.plan_code,
                source: record.source,
                subscription_ref: record.subscription_ref,
              }
            : null;
        },
        saveSubscriptionRecord: async (record) => {
          subscriptions.set(record.id, record);
          writes.subscriptionSaves.push(record);
          return record;
        },
        updateTargetProfileActive: async (profileId, isActive) => {
          writes.profileActiveUpdates.push({ profileId, isActive });
        },
        upsertProfileEntitlement: async (record) => {
          entitlements.set(record.profile_id, record);
          writes.entitlementUpserts.push(record);
        },
        now: new Date('2026-08-26T12:00:00.000Z'),
      });
    },
  };
}

test('invoice.paid Clover payload resolves subscription from parent subscription_details', () => {
  assert.equal(
    getSubscriptionIdFromInvoicePayload({
      parent: {
        type: 'subscription_details',
        subscription_details: {
          subscription: 'sub_extra',
        },
      },
    }),
    'sub_extra'
  );
});

test('subscription snapshot uses exact profile extra item current_period_end', () => {
  const snapshot = buildProfileExtraSubscriptionSnapshotFromSubscriptionPayload({
    subscription: {
      id: 'sub_1',
      customer: 'cus_1',
      status: 'active',
      cancel_at_period_end: false,
      metadata: buildProfileExtraMetadata({
        billingReservationId: 'reservation-1',
        sourceProfileId: 'source-profile-1',
        purchaserUserId: 'owner-1',
      }),
      items: {
        data: [
          {
            price: { id: 'price_profile_pro' },
            current_period_end: 1700000000,
          },
          {
            price: { id: 'price_profile_extra' },
            current_period_end: 1800000000,
          },
        ],
      },
    },
    expectedPriceId: 'price_profile_extra',
  });

  assert.equal(snapshot?.priceId, 'price_profile_extra');
  assert.equal(snapshot?.currentPeriodEnd, '2027-01-15T08:00:00.000Z');
});

test('profile extra snapshot fails closed when expected item is missing', () => {
  assert.equal(
    buildProfileExtraSubscriptionSnapshotFromSubscriptionPayload({
      expectedPriceId: 'price_profile_extra',
      subscription: {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'active',
        metadata: buildProfileExtraMetadata({
          billingReservationId: 'reservation-1',
          sourceProfileId: 'source-profile-1',
          purchaserUserId: 'owner-1',
        }),
        items: {
          data: [{ price: { id: 'price_profile_pro' }, current_period_end: 1800000000 }],
        },
      },
    }),
    null
  );
});

test('webhook binds checkout.session.completed to the same reservation', async () => {
  const harness = createWebhookHarness({
    subscriptions: [
      buildExtraReservationRecord({
        id: 'reservation-1',
        purchasedByUserId: 'owner-1',
        stripePriceId: 'price_profile_extra',
        stripeCheckoutSessionId: 'cs_1',
      }),
    ],
  });

  const result = await harness.process({
    eventId: 'evt_1',
    eventCreated: 1800000000,
    eventType: 'checkout.session.completed',
    paymentStatus: 'paid',
    snapshot: buildSnapshot(),
  });

  assert.equal(result.handled, true);
  assert.equal(result.action, 'activate_slot');
  assert.equal(harness.writes.subscriptionSaves.length, 1);
  assert.equal(harness.writes.subscriptionSaves[0].id, 'reservation-1');
  assert.equal(harness.writes.subscriptionSaves[0].stripeSubscriptionId, 'sub_1');
  assert.equal(harness.writes.profileActiveUpdates.length, 0);
  assert.equal(harness.writes.entitlementUpserts.length, 0);
});

test('billing_flow is mandatory for profile extra metadata', () => {
  assert.equal(
    buildProfileExtraSubscriptionSnapshotFromSubscriptionPayload({
      expectedPriceId: 'price_profile_extra',
      subscription: {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'active',
        metadata: {
          billing_flow: 'profile_pro_v1',
          billing_reservation_id: 'reservation-1',
          source_profile_id: 'source-profile-1',
          purchaser_user_id: 'owner-1',
        },
        items: {
          data: [{ price: { id: 'price_profile_extra' }, current_period_end: 1800000000 }],
        },
      },
    }),
    null
  );
});

test('duplicate and older profile extra Stripe events are idempotent safe no-ops', async () => {
  const duplicateHarness = createWebhookHarness({
    subscriptions: [
      buildExtraReservationRecord({
        id: 'reservation-1',
        purchasedByUserId: 'owner-1',
        stripePriceId: 'price_profile_extra',
        stripeSubscriptionId: 'sub_1',
        status: 'active',
        lastStripeEventId: 'evt_1',
        lastStripeEventCreated: 1800000000,
      }),
    ],
  });

  const duplicateResult = await duplicateHarness.process({
    eventId: 'evt_1',
    eventCreated: 1800000000,
    eventType: 'customer.subscription.updated',
    snapshot: buildSnapshot({ checkoutSessionId: null }),
  });

  assert.equal(duplicateResult.handled, false);
  assert.equal(duplicateResult.reason, 'duplicate');
  assert.equal(duplicateHarness.writes.subscriptionSaves.length, 0);

  const olderHarness = createWebhookHarness({
    subscriptions: [
      buildExtraReservationRecord({
        id: 'reservation-1',
        purchasedByUserId: 'owner-1',
        stripePriceId: 'price_profile_extra',
        stripeSubscriptionId: 'sub_1',
        status: 'canceled',
        lastStripeEventId: 'evt_new',
        lastStripeEventCreated: 1800000100,
      }),
    ],
  });

  const olderResult = await olderHarness.process({
    eventId: 'evt_old',
    eventCreated: 1800000000,
    eventType: 'customer.subscription.updated',
    snapshot: buildSnapshot({ checkoutSessionId: null, status: 'active' }),
  });

  assert.equal(olderResult.handled, false);
  assert.equal(olderResult.reason, 'ignore_older_event');
  assert.equal(olderHarness.writes.subscriptionSaves.length, 0);
});

test('webhook recovers checkout.session.completed by billing_reservation_id without creating a new row', async () => {
  const harness = createWebhookHarness({
    subscriptions: [
      buildExtraReservationRecord({
        id: 'reservation-1',
        purchasedByUserId: 'owner-1',
        stripePriceId: 'price_profile_extra',
        stripeCheckoutSessionId: null,
      }),
    ],
  });

  const result = await harness.process({
    eventId: 'evt_1',
    eventCreated: 1800000000,
    eventType: 'checkout.session.completed',
    paymentStatus: 'paid',
    snapshot: buildSnapshot(),
  });

  assert.equal(result.handled, true);
  assert.equal(harness.writes.subscriptionSaves.length, 1);
  assert.equal(harness.writes.subscriptionSaves[0].id, 'reservation-1');
  assert.equal(harness.writes.subscriptionSaves[0].stripeCheckoutSessionId, 'cs_1');
});

test('billing_reservation_id fallback fails closed on profile, purchaser, or missing reservation mismatch', async () => {
  for (const snapshot of [
    buildSnapshot({ sourceProfileId: 'different-profile' }),
    buildSnapshot({ purchaserUserId: 'different-owner' }),
    buildSnapshot({ billingReservationId: 'missing-reservation' }),
  ]) {
    const harness = createWebhookHarness({
      subscriptions: [
        buildExtraReservationRecord({
          id: 'reservation-1',
          purchasedByUserId: 'owner-1',
          sourceProfileId: 'source-profile-1',
          stripePriceId: 'price_profile_extra',
          stripeCheckoutSessionId: null,
        }),
      ],
    });

    await assert.rejects(
      () =>
        harness.process({
          eventId: 'evt_1',
          eventCreated: 1800000000,
          eventType: 'checkout.session.completed',
          paymentStatus: 'paid',
          snapshot,
        }),
      /mismatch|not found|Source profile not found/
    );
  }
});

test('active event for linked target reactivates profile and writes PRO entitlement', async () => {
  const harness = createWebhookHarness({
    subscriptions: [
      buildExtraReservationRecord({
        id: 'reservation-1',
        purchasedByUserId: 'owner-1',
        targetProfileId: 'target-profile-1',
        stripePriceId: 'price_profile_extra',
        stripeSubscriptionId: 'sub_1',
        status: 'active',
      }),
    ],
  });

  const result = await harness.process({
    eventId: 'evt_2',
    eventCreated: 1800000010,
    eventType: 'customer.subscription.updated',
    snapshot: buildSnapshot({ checkoutSessionId: null }),
  });

  assert.equal(result.action, 'activate_slot');
  assert.deepEqual(harness.writes.profileActiveUpdates, [
    { profileId: 'target-profile-1', isActive: true },
  ]);
  assert.equal(harness.writes.entitlementUpserts[0].profile_id, 'target-profile-1');
  assert.equal(harness.writes.entitlementUpserts[0].plan_code, 'pro');
  assert.equal(harness.writes.entitlementUpserts[0].source, 'stripe');
  assert.equal(harness.writes.entitlementUpserts[0].subscription_ref, 'sub_1');
});

test('unpaid and deleted suspend linked profile only when current entitlement belongs to that subscription', async () => {
  const harness = createWebhookHarness({
    entitlements: [
      buildProEntitlements({
        profileId: 'target-profile-1',
        source: 'stripe',
        subscriptionRef: 'sub_1',
      }),
    ],
    subscriptions: [
      buildExtraReservationRecord({
        id: 'reservation-1',
        purchasedByUserId: 'owner-1',
        targetProfileId: 'target-profile-1',
        stripePriceId: 'price_profile_extra',
        stripeSubscriptionId: 'sub_1',
        status: 'active',
      }),
    ],
  });

  const result = await harness.process({
    eventId: 'evt_3',
    eventCreated: 1800000020,
    eventType: 'customer.subscription.updated',
    snapshot: buildSnapshot({
      checkoutSessionId: null,
      status: 'unpaid',
      currentPeriodEnd: '2026-09-26T12:00:00.000Z',
    }),
  });

  assert.equal(result.action, 'suspend_target');
  assert.deepEqual(harness.writes.profileActiveUpdates, [
    { profileId: 'target-profile-1', isActive: false },
  ]);
  assert.equal(harness.writes.entitlementUpserts[0].plan_code, 'free');
  assert.equal(harness.writes.entitlementUpserts[0].source, 'default_free');
  assert.equal(harness.writes.entitlementUpserts[0].subscription_ref, null);
});

test('delayed deletion from subscription A does not downgrade active subscription B entitlement', async () => {
  const harness = createWebhookHarness({
    entitlements: [
      buildProEntitlements({
        profileId: 'target-profile-1',
        source: 'stripe',
        subscriptionRef: 'sub_B',
      }),
    ],
    subscriptions: [
      buildExtraReservationRecord({
        id: 'reservation-A',
        purchasedByUserId: 'owner-1',
        targetProfileId: 'target-profile-1',
        stripePriceId: 'price_profile_extra',
        stripeSubscriptionId: 'sub_A',
        status: 'active',
      }),
    ],
  });

  const result = await harness.process({
    eventId: 'evt_old_A',
    eventCreated: 1800000030,
    eventType: 'customer.subscription.deleted',
    snapshot: buildSnapshot({
      billingReservationId: 'reservation-A',
      checkoutSessionId: null,
      subscriptionId: 'sub_A',
      status: 'canceled',
    }),
  });

  assert.equal(result.action, 'sync_only');
  assert.deepEqual(harness.writes.profileActiveUpdates, []);
  assert.deepEqual(harness.writes.entitlementUpserts, []);
});

test('invoice.paid active activates slot, but past_due invoice does not activate by paid invoice alone', () => {
  assert.equal(
    resolveProfileExtraWebhookAction({
      eventType: 'invoice.paid',
      paymentStatus: 'paid',
      snapshot: buildSnapshot({ status: 'active' }),
    }),
    'activate_slot'
  );

  assert.equal(
    resolveProfileExtraWebhookAction({
      eventType: 'invoice.paid',
      paymentStatus: 'paid',
      snapshot: buildSnapshot({ status: 'past_due' }),
    }),
    'sync_only'
  );
});

test('past_due and paused keep linked profile in grace while period has not ended', () => {
  for (const status of ['past_due', 'paused'] as const) {
    assert.equal(
      resolveProfileExtraWebhookAction({
        eventType: 'customer.subscription.updated',
        snapshot: buildSnapshot({
          status,
          currentPeriodEnd: '2026-09-26T12:00:00.000Z',
        }),
        now: new Date('2026-08-26T12:00:00.000Z'),
      }),
      'sync_only'
    );
  }
});

test('only active unlinked profile extra subscriptions expose a reusable slot', () => {
  for (const status of ['checkout_pending', 'incomplete', 'past_due', 'paused', 'unpaid', 'canceled', 'incomplete_expired']) {
    assert.notEqual(
      resolveProfileExtraWebhookAction({
        eventType: 'customer.subscription.updated',
        snapshot: buildSnapshot({
          status: status as ProfileExtraSubscriptionSnapshot['status'],
          currentPeriodEnd: '2026-09-26T12:00:00.000Z',
        }),
        now: new Date('2026-08-26T12:00:00.000Z'),
      }),
      'activate_slot'
    );
  }
});

test('helper builders keep PRO and FREE entitlement snapshots exact for profile extra lifecycle', () => {
  const pro = buildProEntitlements({
    profileId: 'target-profile-1',
    source: 'stripe',
    subscriptionRef: 'sub_1',
  });
  const free = buildFreeEntitlements({
    profileId: 'target-profile-1',
    source: 'default_free',
    subscriptionRef: null,
  });

  assert.equal(pro.max_additional_members, null);
  assert.equal(pro.approval_link_creation_enabled, true);
  assert.equal(free.max_additional_members, 2);
  assert.equal(free.approval_link_creation_enabled, false);
});
