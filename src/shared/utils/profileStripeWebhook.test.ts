import assert from 'node:assert/strict';
import test from 'node:test';

import type { ProfileEntitlementRecord } from '../../../shared/profile-entitlements.ts';
import { buildFreeEntitlements, buildProEntitlements } from '../../../shared/profile-entitlements.ts';
import type { ProfileStripeSubscriptionRecord } from '../../../shared/profile-stripe-subscriptions.ts';
import { processProfileProWebhookEvent, runCreateProfileProCheckout } from '../../../supabase/functions/_shared/stripe/profile-pro.ts';

function buildReservationRecord(input: Partial<ProfileStripeSubscriptionRecord> & {
  id: string;
  profileId: string;
  purchasedByUserId: string;
  stripePriceId: string;
}): ProfileStripeSubscriptionRecord {
  return {
    id: input.id,
    profileId: input.profileId,
    purchasedByUserId: input.purchasedByUserId,
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
  };
}

function createWebhookHarness(input?: {
  profiles?: string[];
  entitlements?: ProfileEntitlementRecord[];
  subscriptions?: ProfileStripeSubscriptionRecord[];
}) {
  const profiles = new Set(input?.profiles ?? []);
  const entitlements = new Map(
    (input?.entitlements ?? []).map((record) => [record.profile_id, record] as const)
  );
  const subscriptions = new Map(
    (input?.subscriptions ?? []).map((record) => [record.id, record] as const)
  );

  const writes = {
    subscriptionSaves: [] as ProfileStripeSubscriptionRecord[],
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
    entitlements,
    subscriptions,
    writes,
    async process(params: {
      eventId: string;
      eventCreated: number;
      eventType: 'checkout.session.completed' | 'invoice.paid' | 'customer.subscription.updated' | 'customer.subscription.deleted';
      paymentStatus?: string | null;
      snapshot: {
        billingReservationId?: string | null;
        checkoutSessionId: string | null;
        subscriptionId: string;
        profileId: string;
        purchaserUserId: string;
        customerId: string | null;
        priceId: string;
        status: 'checkout_pending' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
        currentPeriodEnd: string | null;
        cancelAtPeriodEnd: boolean;
      };
    }) {
      return processProfileProWebhookEvent({
        ...params,
        snapshot: {
          billingReservationId: params.snapshot.billingReservationId ?? null,
          ...params.snapshot,
        },
        loadProfileById: async (profileId) => (profiles.has(profileId) ? { id: profileId } : null),
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
        loadActiveConflictByProfileId: async (profileId, currentRecordId) => {
          for (const subscription of subscriptions.values()) {
            if (
              subscription.profileId === profileId &&
              subscription.id !== currentRecordId &&
              (
                subscription.status === 'checkout_pending' ||
                subscription.status === 'incomplete' ||
                subscription.status === 'trialing' ||
                subscription.status === 'active' ||
                subscription.status === 'past_due' ||
                subscription.status === 'paused'
              )
            ) {
              return {
                id: subscription.id,
                profileId: subscription.profileId,
                stripeSubscriptionId: subscription.stripeSubscriptionId ?? '',
                status: subscription.status,
              };
            }
          }

          return null;
        },
        saveSubscriptionRecord: async (record) => {
          subscriptions.set(record.id, record);
          writes.subscriptionSaves.push(record);
          return record;
        },
        upsertProfileEntitlement: async (record) => {
          entitlements.set(record.profile_id, record);
          writes.entitlementUpserts.push(record);
        },
      });
    },
  };
}

function buildCheckoutStub(overrides?: Partial<{
  createReservation: number;
  createSession: number;
  attachReservation: number;
  releaseReservation: number;
  expireReservation: number;
}>) {
  const calls = {
    createReservation: 0,
    createSession: 0,
    attachReservation: 0,
    releaseReservation: 0,
    expireReservation: 0,
    ...(overrides ?? {}),
  };

  return calls;
}

test('member without billing authority is blocked even if authenticated', async () => {
  const calls = buildCheckoutStub();

  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'member-1',
          email: 'member@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'free',
          currentStripeSubscriptionStatus: null,
          currentStripeRecordId: null,
          currentStripeCheckoutSessionId: null,
          currentStripeCheckoutExpiresAt: null,
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        retrieveCheckoutSession: async () => ({ status: 'expired' }),
        expireCheckoutSession: async () => undefined,
        createCheckoutReservation: async () => {
          calls.createReservation += 1;
          return { id: 'reservation-1' };
        },
        attachCheckoutSessionToReservation: async () => {
          calls.attachReservation += 1;
        },
        releaseCheckoutReservation: async () => {
          calls.releaseReservation += 1;
        },
        createCheckoutSession: async () => {
          calls.createSession += 1;
          return {
            id: 'cs_1',
            url: 'https://checkout.stripe.com/session/cs_1',
          };
        },
      }),
    /Somente o owner do perfil pode iniciar a cobranca/
  );

  assert.equal(calls.createReservation, 0);
  assert.equal(calls.createSession, 0);
});

test('owner of a materialized FREE profile reserves first and then gets a valid checkout result', async () => {
  const sequence: string[] = [];
  let capturedParams: Record<string, unknown> | null = null;

  const result = await runCreateProfileProCheckout({
    actor: {
      userId: 'owner-1',
      email: 'owner@example.com',
      isAdmin: false,
    },
    profile: {
      id: 'profile-1',
      userId: 'owner-1',
      currentEntitlementPlanCode: 'free',
      currentStripeSubscriptionStatus: null,
      currentStripeRecordId: null,
      currentStripeCheckoutSessionId: null,
      currentStripeCheckoutExpiresAt: null,
    },
    priceId: 'price_profile_pro',
    appBaseUrl: 'https://www.posthub.com.br',
    retrieveCheckoutSession: async () => ({ status: 'expired' }),
    expireCheckoutSession: async () => undefined,
    createCheckoutReservation: async () => {
      sequence.push('reserve');
      return { id: 'reservation-1' };
    },
    attachCheckoutSessionToReservation: async () => {
      sequence.push('attach');
    },
    releaseCheckoutReservation: async () => {
      sequence.push('release');
    },
    createCheckoutSession: async (params) => {
      sequence.push('stripe');
      capturedParams = params;
      return {
        id: 'cs_1',
        url: 'https://checkout.stripe.com/session/cs_1',
        expires_at: 1780000000,
        customer: 'cus_1',
      };
    },
  });

  assert.equal(result.sessionId, 'cs_1');
  assert.equal(result.checkoutUrl, 'https://checkout.stripe.com/session/cs_1');
  assert.deepEqual(sequence, ['reserve', 'stripe', 'attach']);
  assert.equal(
    ((capturedParams?.line_items as Array<{ price: string }>) ?? [])[0]?.price,
    'price_profile_pro'
  );
  assert.equal(
    (capturedParams?.metadata as { profile_id?: string }).profile_id,
    'profile-1'
  );
  assert.equal(
    (capturedParams?.metadata as { billing_reservation_id?: string }).billing_reservation_id,
    'reservation-1'
  );
  assert.equal(
    ((capturedParams?.subscription_data as { metadata?: { billing_reservation_id?: string } })?.metadata
      ?.billing_reservation_id),
    'reservation-1'
  );
});

test('profile missing entitlement cannot initiate the new checkout', async () => {
  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: null,
          currentStripeSubscriptionStatus: null,
          currentStripeRecordId: null,
          currentStripeCheckoutSessionId: null,
          currentStripeCheckoutExpiresAt: null,
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        retrieveCheckoutSession: async () => ({ status: 'expired' }),
        expireCheckoutSession: async () => undefined,
        createCheckoutReservation: async () => ({ id: 'reservation-1' }),
        attachCheckoutSessionToReservation: async () => undefined,
        releaseCheckoutReservation: async () => undefined,
        createCheckoutSession: async () => ({
          id: 'cs_1',
          url: 'https://checkout.stripe.com/session/cs_1',
        }),
      }),
    /Somente perfis com entitlement FREE materializado/
  );
});

test('legacy_pro profile cannot initiate the new checkout', async () => {
  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'legacy_pro',
          currentStripeSubscriptionStatus: null,
          currentStripeRecordId: null,
          currentStripeCheckoutSessionId: null,
          currentStripeCheckoutExpiresAt: null,
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        retrieveCheckoutSession: async () => ({ status: 'expired' }),
        expireCheckoutSession: async () => undefined,
        createCheckoutReservation: async () => ({ id: 'reservation-1' }),
        attachCheckoutSessionToReservation: async () => undefined,
        releaseCheckoutReservation: async () => undefined,
        createCheckoutSession: async () => ({
          id: 'cs_1',
          url: 'https://checkout.stripe.com/session/cs_1',
        }),
      }),
    /Somente perfis com entitlement FREE materializado/
  );
});

test('ADMIN owner does not initiate a paid PRO checkout', async () => {
  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: true,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'free',
          currentStripeSubscriptionStatus: null,
          currentStripeRecordId: null,
          currentStripeCheckoutSessionId: null,
          currentStripeCheckoutExpiresAt: null,
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        retrieveCheckoutSession: async () => ({ status: 'expired' }),
        expireCheckoutSession: async () => undefined,
        createCheckoutReservation: async () => ({ id: 'reservation-1' }),
        attachCheckoutSessionToReservation: async () => undefined,
        releaseCheckoutReservation: async () => undefined,
        createCheckoutSession: async () => ({
          id: 'cs_1',
          url: 'https://checkout.stripe.com/session/cs_1',
        }),
      }),
    /nao precisam iniciar uma assinatura PRO paga/i
  );
});

test('valid checkout_pending blocks a new checkout before any Stripe call', async () => {
  let createSessionCalls = 0;

  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'free',
          currentStripeSubscriptionStatus: 'checkout_pending',
          currentStripeRecordId: 'reservation-1',
          currentStripeCheckoutSessionId: 'cs_1',
          currentStripeCheckoutExpiresAt: '2026-08-25T18:00:00.000Z',
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        now: new Date('2026-08-25T17:00:00.000Z'),
        retrieveCheckoutSession: async () => ({ status: 'open' }),
        expireCheckoutSession: async () => undefined,
        createCheckoutReservation: async () => ({ id: 'reservation-2' }),
        attachCheckoutSessionToReservation: async () => undefined,
        releaseCheckoutReservation: async () => undefined,
        createCheckoutSession: async () => {
          createSessionCalls += 1;
          return {
            id: 'cs_1',
            url: 'https://checkout.stripe.com/session/cs_1',
          };
        },
      }),
    /checkout PRO em andamento/i
  );

  assert.equal(createSessionCalls, 0);
});

test('expired checkout_pending allows a new retry after expiring the stale reservation', async () => {
  const sequence: string[] = [];

  await runCreateProfileProCheckout({
    actor: {
      userId: 'owner-1',
      email: 'owner@example.com',
      isAdmin: false,
    },
    profile: {
      id: 'profile-1',
      userId: 'owner-1',
      currentEntitlementPlanCode: 'free',
      currentStripeSubscriptionStatus: 'checkout_pending',
      currentStripeRecordId: 'reservation-old',
      currentStripeCheckoutSessionId: 'cs_old',
      currentStripeCheckoutExpiresAt: '2026-08-25T16:00:00.000Z',
    },
    priceId: 'price_profile_pro',
    appBaseUrl: 'https://www.posthub.com.br',
    now: new Date('2026-08-25T17:00:00.000Z'),
    retrieveCheckoutSession: async () => ({ status: 'expired' }),
    expireCheckoutSession: async () => undefined,
    expireCurrentCheckoutReservation: async (reservationId) => {
      sequence.push(`expire:${reservationId}`);
    },
    createCheckoutReservation: async () => {
      sequence.push('reserve:new');
      return { id: 'reservation-new' };
    },
    attachCheckoutSessionToReservation: async () => {
      sequence.push('attach');
    },
    releaseCheckoutReservation: async () => {
      sequence.push('release');
    },
    createCheckoutSession: async () => {
      sequence.push('stripe');
      return {
        id: 'cs_1',
        url: 'https://checkout.stripe.com/session/cs_1',
        expires_at: 1780000000,
      };
    },
  });

  assert.deepEqual(sequence, ['expire:reservation-old', 'reserve:new', 'stripe', 'attach']);
});

test('expired local checkout_pending only allows retry after Stripe confirms the session is expired', async () => {
  let createSessionCalls = 0;
  const sequence: string[] = [];

  await runCreateProfileProCheckout({
    actor: {
      userId: 'owner-1',
      email: 'owner@example.com',
      isAdmin: false,
    },
    profile: {
      id: 'profile-1',
      userId: 'owner-1',
      currentEntitlementPlanCode: 'free',
      currentStripeSubscriptionStatus: 'checkout_pending',
      currentStripeRecordId: 'reservation-old',
      currentStripeCheckoutSessionId: 'cs_old',
      currentStripeCheckoutExpiresAt: '2026-08-25T16:00:00.000Z',
    },
    priceId: 'price_profile_pro',
    appBaseUrl: 'https://www.posthub.com.br',
    now: new Date('2026-08-25T17:00:00.000Z'),
    retrieveCheckoutSession: async () => ({ status: 'expired' }),
    expireCheckoutSession: async () => undefined,
    expireCurrentCheckoutReservation: async (reservationId) => {
      sequence.push(`expire:${reservationId}`);
    },
    createCheckoutReservation: async () => {
      sequence.push('reserve:new');
      return { id: 'reservation-new' };
    },
    attachCheckoutSessionToReservation: async () => {
      sequence.push('attach');
    },
    releaseCheckoutReservation: async () => undefined,
    createCheckoutSession: async () => {
      createSessionCalls += 1;
      sequence.push('stripe');
      return {
        id: 'cs_1',
        url: 'https://checkout.stripe.com/session/cs_1',
        expires_at: 1780000000,
      };
    },
  });

  assert.equal(createSessionCalls, 1);
  assert.deepEqual(sequence, ['expire:reservation-old', 'reserve:new', 'stripe', 'attach']);
});

test('expired local checkout_pending with Stripe complete status does not create a second checkout', async () => {
  let createSessionCalls = 0;
  let expireReservationCalls = 0;

  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'free',
          currentStripeSubscriptionStatus: 'checkout_pending',
          currentStripeRecordId: 'reservation-old',
          currentStripeCheckoutSessionId: 'cs_old',
          currentStripeCheckoutExpiresAt: '2026-08-25T16:00:00.000Z',
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        now: new Date('2026-08-25T17:00:00.000Z'),
        retrieveCheckoutSession: async () => ({ status: 'complete' }),
        expireCheckoutSession: async () => undefined,
        expireCurrentCheckoutReservation: async () => {
          expireReservationCalls += 1;
        },
        createCheckoutReservation: async () => ({ id: 'reservation-new' }),
        attachCheckoutSessionToReservation: async () => undefined,
        releaseCheckoutReservation: async () => undefined,
        createCheckoutSession: async () => {
          createSessionCalls += 1;
          return {
            id: 'cs_1',
            url: 'https://checkout.stripe.com/session/cs_1',
          };
        },
      }),
    /concluido aguardando conciliacao/i
  );

  assert.equal(expireReservationCalls, 0);
  assert.equal(createSessionCalls, 0);
});

test('expired local checkout_pending with Stripe open status does not create a second checkout', async () => {
  let createSessionCalls = 0;
  let expireReservationCalls = 0;

  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'free',
          currentStripeSubscriptionStatus: 'checkout_pending',
          currentStripeRecordId: 'reservation-old',
          currentStripeCheckoutSessionId: 'cs_old',
          currentStripeCheckoutExpiresAt: '2026-08-25T16:00:00.000Z',
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        now: new Date('2026-08-25T17:00:00.000Z'),
        retrieveCheckoutSession: async () => ({ status: 'open' }),
        expireCheckoutSession: async () => undefined,
        expireCurrentCheckoutReservation: async () => {
          expireReservationCalls += 1;
        },
        createCheckoutReservation: async () => ({ id: 'reservation-new' }),
        attachCheckoutSessionToReservation: async () => undefined,
        releaseCheckoutReservation: async () => undefined,
        createCheckoutSession: async () => {
          createSessionCalls += 1;
          return {
            id: 'cs_1',
            url: 'https://checkout.stripe.com/session/cs_1',
          };
        },
      }),
    /checkout PRO em andamento/i
  );

  assert.equal(expireReservationCalls, 0);
  assert.equal(createSessionCalls, 0);
});

test('expired local checkout_pending with Stripe retrieve failure does not create a second checkout', async () => {
  let createSessionCalls = 0;
  let expireReservationCalls = 0;

  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'free',
          currentStripeSubscriptionStatus: 'checkout_pending',
          currentStripeRecordId: 'reservation-old',
          currentStripeCheckoutSessionId: 'cs_old',
          currentStripeCheckoutExpiresAt: '2026-08-25T16:00:00.000Z',
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        now: new Date('2026-08-25T17:00:00.000Z'),
        retrieveCheckoutSession: async () => {
          throw new Error('stripe retrieve failed');
        },
        expireCheckoutSession: async () => undefined,
        expireCurrentCheckoutReservation: async () => {
          expireReservationCalls += 1;
        },
        createCheckoutReservation: async () => ({ id: 'reservation-new' }),
        attachCheckoutSessionToReservation: async () => undefined,
        releaseCheckoutReservation: async () => undefined,
        createCheckoutSession: async () => {
          createSessionCalls += 1;
          return {
            id: 'cs_1',
            url: 'https://checkout.stripe.com/session/cs_1',
          };
        },
      }),
    /Nao foi possivel confirmar o estado do checkout PRO anterior/i
  );

  assert.equal(expireReservationCalls, 0);
  assert.equal(createSessionCalls, 0);
});

test('expired local checkout_pending without Stripe session id does not auto-expire or create a second checkout', async () => {
  let createSessionCalls = 0;
  let retrieveSessionCalls = 0;
  let expireReservationCalls = 0;

  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'free',
          currentStripeSubscriptionStatus: 'checkout_pending',
          currentStripeRecordId: 'reservation-old',
          currentStripeCheckoutSessionId: null,
          currentStripeCheckoutExpiresAt: '2026-08-25T16:00:00.000Z',
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        now: new Date('2026-08-25T17:00:00.000Z'),
        retrieveCheckoutSession: async () => {
          retrieveSessionCalls += 1;
          return { status: 'expired' };
        },
        expireCheckoutSession: async () => undefined,
        expireCurrentCheckoutReservation: async () => {
          expireReservationCalls += 1;
        },
        createCheckoutReservation: async () => ({ id: 'reservation-new' }),
        attachCheckoutSessionToReservation: async () => undefined,
        releaseCheckoutReservation: async () => undefined,
        createCheckoutSession: async () => {
          createSessionCalls += 1;
          return {
            id: 'cs_1',
            url: 'https://checkout.stripe.com/session/cs_1',
          };
        },
      }),
    /ainda nao pode ser liberado com seguranca/i
  );

  assert.equal(retrieveSessionCalls, 0);
  assert.equal(expireReservationCalls, 0);
  assert.equal(createSessionCalls, 0);
});

test('reservation conflict prevents a second Stripe checkout from being created', async () => {
  let createSessionCalls = 0;

  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'free',
          currentStripeSubscriptionStatus: null,
          currentStripeRecordId: null,
          currentStripeCheckoutSessionId: null,
          currentStripeCheckoutExpiresAt: null,
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        retrieveCheckoutSession: async () => ({ status: 'expired' }),
        expireCheckoutSession: async () => undefined,
        createCheckoutReservation: async () => {
          const error = new Error('conflict') as Error & { status?: number; code?: string };
          error.status = 409;
          error.code = 'PROFILE_PRO_CHECKOUT_CONFLICT';
          throw error;
        },
        attachCheckoutSessionToReservation: async () => undefined,
        releaseCheckoutReservation: async () => undefined,
        createCheckoutSession: async () => {
          createSessionCalls += 1;
          return {
            id: 'cs_1',
            url: 'https://checkout.stripe.com/session/cs_1',
          };
        },
      }),
    /conflict/i
  );

  assert.equal(createSessionCalls, 0);
});

test('Stripe checkout creation failure does not leave a reservation stuck', async () => {
  const sequence: string[] = [];

  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'free',
          currentStripeSubscriptionStatus: null,
          currentStripeRecordId: null,
          currentStripeCheckoutSessionId: null,
          currentStripeCheckoutExpiresAt: null,
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        retrieveCheckoutSession: async () => ({ status: 'expired' }),
        expireCheckoutSession: async () => undefined,
        createCheckoutReservation: async () => {
          sequence.push('reserve');
          return { id: 'reservation-1' };
        },
        attachCheckoutSessionToReservation: async () => {
          sequence.push('attach');
        },
        releaseCheckoutReservation: async (reservationId) => {
          sequence.push(`release:${reservationId}`);
        },
        createCheckoutSession: async () => {
          sequence.push('stripe');
          throw new Error('Stripe unavailable');
        },
      }),
    /Stripe unavailable/
  );

  assert.deepEqual(sequence, ['reserve', 'stripe', 'release:reservation-1']);
});

test('Stripe session created and DB attach passes through the normal reservation flow', async () => {
  const sequence: string[] = [];

  await runCreateProfileProCheckout({
    actor: {
      userId: 'owner-1',
      email: 'owner@example.com',
      isAdmin: false,
    },
    profile: {
      id: 'profile-1',
      userId: 'owner-1',
      currentEntitlementPlanCode: 'free',
      currentStripeSubscriptionStatus: null,
      currentStripeRecordId: null,
      currentStripeCheckoutSessionId: null,
      currentStripeCheckoutExpiresAt: null,
    },
    priceId: 'price_profile_pro',
    appBaseUrl: 'https://www.posthub.com.br',
    retrieveCheckoutSession: async () => ({ status: 'expired' }),
    expireCheckoutSession: async () => {
      sequence.push('expire-session');
    },
    createCheckoutReservation: async () => {
      sequence.push('reserve');
      return { id: 'reservation-1' };
    },
    attachCheckoutSessionToReservation: async () => {
      sequence.push('attach');
    },
    releaseCheckoutReservation: async () => {
      sequence.push('release');
    },
    createCheckoutSession: async () => {
      sequence.push('stripe');
      return {
        id: 'cs_1',
        url: 'https://checkout.stripe.com/session/cs_1',
        expires_at: 1780000000,
      };
    },
  });

  assert.deepEqual(sequence, ['reserve', 'stripe', 'attach']);
});

test('DB attach failure after Stripe session creation expires the checkout session', async () => {
  const sequence: string[] = [];

  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'free',
          currentStripeSubscriptionStatus: null,
          currentStripeRecordId: null,
          currentStripeCheckoutSessionId: null,
          currentStripeCheckoutExpiresAt: null,
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        retrieveCheckoutSession: async () => ({ status: 'expired' }),
        expireCheckoutSession: async (sessionId) => {
          sequence.push(`expire-session:${sessionId}`);
        },
        expireCurrentCheckoutReservation: async (reservationId) => {
          sequence.push(`expire-reservation:${reservationId}`);
        },
        createCheckoutReservation: async () => {
          sequence.push('reserve');
          return { id: 'reservation-1' };
        },
        attachCheckoutSessionToReservation: async () => {
          sequence.push('attach');
          throw new Error('attach failed');
        },
        releaseCheckoutReservation: async () => {
          sequence.push('release');
        },
        createCheckoutSession: async () => {
          sequence.push('stripe');
          return {
            id: 'cs_1',
            url: 'https://checkout.stripe.com/session/cs_1',
            expires_at: 1780000000,
          };
        },
      }),
    /attach failed/
  );

  assert.deepEqual(sequence, [
    'reserve',
    'stripe',
    'attach',
    'expire-session:cs_1',
    'expire-reservation:reservation-1',
  ]);
});

test('DB attach failure with successful Stripe expiration does not leave checkout_pending active', async () => {
  let expiredReservationId: string | null = null;

  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'free',
          currentStripeSubscriptionStatus: null,
          currentStripeRecordId: null,
          currentStripeCheckoutSessionId: null,
          currentStripeCheckoutExpiresAt: null,
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        retrieveCheckoutSession: async () => ({ status: 'expired' }),
        expireCheckoutSession: async () => undefined,
        expireCurrentCheckoutReservation: async (reservationId) => {
          expiredReservationId = reservationId;
        },
        createCheckoutReservation: async () => ({ id: 'reservation-1' }),
        attachCheckoutSessionToReservation: async () => {
          throw new Error('attach failed');
        },
        releaseCheckoutReservation: async () => undefined,
        createCheckoutSession: async () => ({
          id: 'cs_1',
          url: 'https://checkout.stripe.com/session/cs_1',
          expires_at: 1780000000,
        }),
      }),
    /attach failed/
  );

  assert.equal(expiredReservationId, 'reservation-1');
});

test('DB attach failure with Stripe expire failure surfaces the error and keeps the reservation recoverable', async () => {
  let releasedReservationId: string | null = null;

  await assert.rejects(
    () =>
      runCreateProfileProCheckout({
        actor: {
          userId: 'owner-1',
          email: 'owner@example.com',
          isAdmin: false,
        },
        profile: {
          id: 'profile-1',
          userId: 'owner-1',
          currentEntitlementPlanCode: 'free',
          currentStripeSubscriptionStatus: null,
          currentStripeRecordId: null,
          currentStripeCheckoutSessionId: null,
          currentStripeCheckoutExpiresAt: null,
        },
        priceId: 'price_profile_pro',
        appBaseUrl: 'https://www.posthub.com.br',
        retrieveCheckoutSession: async () => ({ status: 'expired' }),
        expireCheckoutSession: async () => {
          throw new Error('expire failed');
        },
        expireCurrentCheckoutReservation: async () => {
          throw new Error('should not clear reservation when Stripe expiration fails');
        },
        createCheckoutReservation: async () => ({ id: 'reservation-1' }),
        attachCheckoutSessionToReservation: async () => {
          throw new Error('attach failed');
        },
        releaseCheckoutReservation: async (reservationId) => {
          releasedReservationId = reservationId;
        },
        createCheckoutSession: async () => ({
          id: 'cs_1',
          url: 'https://checkout.stripe.com/session/cs_1',
          expires_at: 1780000000,
        }),
      }),
    /expiracao compensatoria do checkout tambem falhou/i
  );

  assert.equal(releasedReservationId, null);
});

test('checkout.session.completed binds the subscription to the existing reservation row', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    entitlements: [buildFreeEntitlements({ profileId: 'profile-a', source: 'default_free' })],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeCheckoutSessionId: 'cs_a',
        checkoutExpiresAt: '2026-08-26T00:00:00.000Z',
        stripePriceId: 'price_profile_pro',
        status: 'checkout_pending',
      }),
    ],
  });

  const result = await harness.process({
    eventId: 'evt_checkout_completed',
    eventCreated: 100,
    eventType: 'checkout.session.completed',
    paymentStatus: 'paid',
    snapshot: {
      billingReservationId: 'reservation-a',
      checkoutSessionId: 'cs_a',
      subscriptionId: 'sub_a',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'active',
      currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  });

  assert.equal(result.handled, true);
  assert.equal(result.action, 'provision_pro');
  assert.equal(harness.subscriptions.get('reservation-a')?.stripeSubscriptionId, 'sub_a');
  assert.equal(harness.entitlements.get('profile-a')?.plan_code, 'pro');
});

test('checkout.session.completed recovers the same reservation row by billing_reservation_id when session mapping is missing', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    entitlements: [buildFreeEntitlements({ profileId: 'profile-a', source: 'default_free' })],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripePriceId: 'price_profile_pro',
        status: 'checkout_pending',
      }),
    ],
  });

  const result = await harness.process({
    eventId: 'evt_checkout_completed_recover',
    eventCreated: 101,
    eventType: 'checkout.session.completed',
    paymentStatus: 'paid',
    snapshot: {
      billingReservationId: 'reservation-a',
      checkoutSessionId: 'cs_a',
      subscriptionId: 'sub_a',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'active',
      currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  });

  assert.equal(result.handled, true);
  assert.equal(result.action, 'provision_pro');
  assert.equal(harness.subscriptions.get('reservation-a')?.stripeCheckoutSessionId, 'cs_a');
  assert.equal(harness.subscriptions.get('reservation-a')?.stripeSubscriptionId, 'sub_a');
});

test('checkout.session.completed fallback fails closed on profile mismatch', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a', 'profile-b'],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripePriceId: 'price_profile_pro',
        status: 'checkout_pending',
      }),
    ],
  });

  await assert.rejects(
    () =>
      harness.process({
        eventId: 'evt_profile_mismatch',
        eventCreated: 102,
        eventType: 'checkout.session.completed',
        paymentStatus: 'paid',
        snapshot: {
          billingReservationId: 'reservation-a',
          checkoutSessionId: 'cs_a',
          subscriptionId: 'sub_a',
          profileId: 'profile-b',
          purchaserUserId: 'owner-1',
          customerId: 'cus_1',
          priceId: 'price_profile_pro',
          status: 'active',
          currentPeriodEnd: '2026-09-25T00:00:00.000Z',
          cancelAtPeriodEnd: false,
        },
      }),
    /mapping mismatch/i
  );
});

test('invoice.paid provisions PRO only for the purchased profile when the subscription is active', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a', 'profile-b'],
    entitlements: [
      buildFreeEntitlements({ profileId: 'profile-a', source: 'default_free' }),
      buildFreeEntitlements({ profileId: 'profile-b', source: 'legacy_snapshot' }),
    ],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeCheckoutSessionId: 'cs_a',
        stripeSubscriptionId: 'sub_a',
        stripePriceId: 'price_profile_pro',
        status: 'incomplete',
        currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      }),
    ],
  });

  await harness.process({
    eventId: 'evt_paid',
    eventCreated: 100,
    eventType: 'invoice.paid',
    paymentStatus: 'paid',
    snapshot: {
      checkoutSessionId: null,
      subscriptionId: 'sub_a',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'active',
      currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  });

  assert.equal(harness.entitlements.get('profile-a')?.plan_code, 'pro');
  assert.equal(harness.entitlements.get('profile-b')?.plan_code, 'free');
});

test('invoice.paid does not grant PRO when the real subscription status is unpaid', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    entitlements: [buildFreeEntitlements({ profileId: 'profile-a', source: 'default_free' })],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_a',
        stripePriceId: 'price_profile_pro',
        status: 'incomplete',
      }),
    ],
  });

  const result = await harness.process({
    eventId: 'evt_paid',
    eventCreated: 100,
    eventType: 'invoice.paid',
    paymentStatus: 'paid',
    snapshot: {
      checkoutSessionId: null,
      subscriptionId: 'sub_a',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'unpaid',
      currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  });

  assert.equal(result.action, 'sync_only');
  assert.equal(harness.entitlements.get('profile-a')?.plan_code, 'free');
});

test('invoice.paid does not grant PRO when the real subscription status is past_due', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    entitlements: [buildFreeEntitlements({ profileId: 'profile-a', source: 'default_free' })],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_a',
        stripePriceId: 'price_profile_pro',
        status: 'incomplete',
      }),
    ],
  });

  const result = await harness.process({
    eventId: 'evt_paid',
    eventCreated: 100,
    eventType: 'invoice.paid',
    paymentStatus: 'paid',
    snapshot: {
      checkoutSessionId: null,
      subscriptionId: 'sub_a',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'past_due',
      currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  });

  assert.equal(result.action, 'sync_only');
  assert.equal(harness.entitlements.get('profile-a')?.plan_code, 'free');
});

test('duplicate Stripe event is idempotent', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_a',
        stripePriceId: 'price_profile_pro',
        status: 'active',
        lastStripeEventId: 'evt_same',
        lastStripeEventCreated: 100,
      }),
    ],
  });

  const second = await harness.process({
    eventId: 'evt_same',
    eventCreated: 100,
    eventType: 'invoice.paid',
    paymentStatus: 'paid',
    snapshot: {
      checkoutSessionId: null,
      subscriptionId: 'sub_a',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'active',
      currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  });

  assert.equal(second.handled, false);
  assert.equal(second.reason, 'duplicate');
});

test('older event cannot overwrite a newer canceled state', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    entitlements: [buildFreeEntitlements({ profileId: 'profile-a', source: 'default_free' })],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_a',
        stripePriceId: 'price_profile_pro',
        status: 'canceled',
        lastStripeEventId: 'evt_deleted',
        lastStripeEventCreated: 200,
      }),
    ],
  });

  const older = await harness.process({
    eventId: 'evt_old_update',
    eventCreated: 150,
    eventType: 'customer.subscription.updated',
    snapshot: {
      checkoutSessionId: null,
      subscriptionId: 'sub_a',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'active',
      currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  });

  assert.equal(older.handled, false);
  assert.equal(older.reason, 'ignore_older_event');
  assert.equal(harness.entitlements.get('profile-a')?.plan_code, 'free');
});

test('cancel_at_period_end keeps PRO while the subscription is still valid', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    entitlements: [
      buildProEntitlements({
        profileId: 'profile-a',
        source: 'stripe',
        subscriptionRef: 'sub_a',
      }),
    ],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_a',
        stripePriceId: 'price_profile_pro',
        status: 'active',
        currentPeriodEnd: '2026-09-25T00:00:00.000Z',
        lastStripeEventId: 'evt_paid',
        lastStripeEventCreated: 100,
      }),
    ],
  });

  await harness.process({
    eventId: 'evt_cancel_later',
    eventCreated: 200,
    eventType: 'customer.subscription.updated',
    snapshot: {
      checkoutSessionId: null,
      subscriptionId: 'sub_a',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'active',
      currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      cancelAtPeriodEnd: true,
    },
  });

  assert.equal(harness.entitlements.get('profile-a')?.plan_code, 'pro');
});

test('unpaid downgrades the current Stripe-backed entitlement to FREE', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    entitlements: [
      buildProEntitlements({
        profileId: 'profile-a',
        source: 'stripe',
        subscriptionRef: 'sub_a',
      }),
    ],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_a',
        stripePriceId: 'price_profile_pro',
        status: 'active',
        currentPeriodEnd: '2026-09-25T00:00:00.000Z',
        lastStripeEventId: 'evt_paid',
        lastStripeEventCreated: 100,
      }),
    ],
  });

  await harness.process({
    eventId: 'evt_unpaid',
    eventCreated: 200,
    eventType: 'customer.subscription.updated',
    snapshot: {
      checkoutSessionId: null,
      subscriptionId: 'sub_a',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'unpaid',
      currentPeriodEnd: '2026-08-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  });

  assert.equal(harness.entitlements.get('profile-a')?.plan_code, 'free');
  assert.equal(harness.entitlements.get('profile-a')?.references_enabled, false);
});

test('unpaid historical row does not block a new active subscription for the same profile', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    entitlements: [buildFreeEntitlements({ profileId: 'profile-a', source: 'default_free' })],
    subscriptions: [
      buildReservationRecord({
        id: 'old-row',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_old',
        stripePriceId: 'price_profile_pro',
        status: 'unpaid',
      }),
      buildReservationRecord({
        id: 'new-row',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_new',
        stripePriceId: 'price_profile_pro',
        status: 'incomplete',
      }),
    ],
  });

  await harness.process({
    eventId: 'evt_new_paid',
    eventCreated: 300,
    eventType: 'invoice.paid',
    paymentStatus: 'paid',
    snapshot: {
      checkoutSessionId: null,
      subscriptionId: 'sub_new',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'active',
      currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  });

  assert.equal(harness.entitlements.get('profile-a')?.subscription_ref, 'sub_new');
});

test('canceled historical row does not block a new active subscription for the same profile', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    entitlements: [buildFreeEntitlements({ profileId: 'profile-a', source: 'default_free' })],
    subscriptions: [
      buildReservationRecord({
        id: 'old-row',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_old',
        stripePriceId: 'price_profile_pro',
        status: 'canceled',
      }),
      buildReservationRecord({
        id: 'new-row',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_new',
        stripePriceId: 'price_profile_pro',
        status: 'incomplete',
      }),
    ],
  });

  await harness.process({
    eventId: 'evt_new_paid',
    eventCreated: 300,
    eventType: 'invoice.paid',
    paymentStatus: 'paid',
    snapshot: {
      checkoutSessionId: null,
      subscriptionId: 'sub_new',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'active',
      currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  });

  assert.equal(harness.entitlements.get('profile-a')?.subscription_ref, 'sub_new');
});

test('past_due remains a grace/current status and does not downgrade immediately', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    entitlements: [
      buildProEntitlements({
        profileId: 'profile-a',
        source: 'stripe',
        subscriptionRef: 'sub_a',
      }),
    ],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_a',
        stripePriceId: 'price_profile_pro',
        status: 'active',
        currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      }),
    ],
  });

  const result = await harness.process({
    eventId: 'evt_past_due',
    eventCreated: 200,
    eventType: 'customer.subscription.updated',
    snapshot: {
      checkoutSessionId: null,
      subscriptionId: 'sub_a',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'past_due',
      currentPeriodEnd: '2026-09-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  });

  assert.equal(result.action, 'sync_only');
  assert.equal(harness.entitlements.get('profile-a')?.plan_code, 'pro');
});

test('delayed deletion from subscription A does not downgrade active subscription B', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    entitlements: [
      buildProEntitlements({
        profileId: 'profile-a',
        source: 'stripe',
        subscriptionRef: 'sub_b',
      }),
    ],
    subscriptions: [
      buildReservationRecord({
        id: 'row-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_a',
        stripePriceId: 'price_profile_pro',
        status: 'canceled',
        lastStripeEventId: 'evt_a_deleted',
        lastStripeEventCreated: 200,
      }),
      buildReservationRecord({
        id: 'row-b',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeSubscriptionId: 'sub_b',
        stripePriceId: 'price_profile_pro',
        status: 'active',
        currentPeriodEnd: '2026-09-25T00:00:00.000Z',
        lastStripeEventId: 'evt_b_paid',
        lastStripeEventCreated: 250,
      }),
    ],
  });

  const result = await harness.process({
    eventId: 'evt_a_deleted_late',
    eventCreated: 300,
    eventType: 'customer.subscription.deleted',
    snapshot: {
      checkoutSessionId: null,
      subscriptionId: 'sub_a',
      profileId: 'profile-a',
      purchaserUserId: 'owner-1',
      customerId: 'cus_1',
      priceId: 'price_profile_pro',
      status: 'canceled',
      currentPeriodEnd: '2026-08-25T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
  });

  assert.equal(result.action, 'sync_only');
  assert.equal(harness.entitlements.get('profile-a')?.plan_code, 'pro');
  assert.equal(harness.entitlements.get('profile-a')?.subscription_ref, 'sub_b');
  assert.equal(harness.writes.entitlementUpserts.length, 0);
});

test('metadata and reservation mapping mismatch fails closed', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a', 'profile-b'],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripeCheckoutSessionId: 'cs_a',
        stripePriceId: 'price_profile_pro',
        status: 'checkout_pending',
      }),
    ],
  });

  await assert.rejects(
    () =>
      harness.process({
        eventId: 'evt_conflict',
        eventCreated: 200,
        eventType: 'checkout.session.completed',
        paymentStatus: 'paid',
        snapshot: {
          billingReservationId: 'reservation-a',
          checkoutSessionId: 'cs_a',
          subscriptionId: 'sub_a',
          profileId: 'profile-b',
          purchaserUserId: 'owner-1',
          customerId: 'cus_1',
          priceId: 'price_profile_pro',
          status: 'active',
          currentPeriodEnd: '2026-09-25T00:00:00.000Z',
          cancelAtPeriodEnd: false,
        },
      }),
    /mapping mismatch/i
  );
});

test('checkout.session.completed fallback fails closed on purchaser mismatch', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    subscriptions: [
      buildReservationRecord({
        id: 'reservation-a',
        profileId: 'profile-a',
        purchasedByUserId: 'owner-1',
        stripePriceId: 'price_profile_pro',
        status: 'checkout_pending',
      }),
    ],
  });

  await assert.rejects(
    () =>
      harness.process({
        eventId: 'evt_purchaser_mismatch',
        eventCreated: 201,
        eventType: 'checkout.session.completed',
        paymentStatus: 'paid',
        snapshot: {
          billingReservationId: 'reservation-a',
          checkoutSessionId: 'cs_a',
          subscriptionId: 'sub_a',
          profileId: 'profile-a',
          purchaserUserId: 'owner-2',
          customerId: 'cus_1',
          priceId: 'price_profile_pro',
          status: 'active',
          currentPeriodEnd: '2026-09-25T00:00:00.000Z',
          cancelAtPeriodEnd: false,
        },
      }),
    /mapping mismatch/i
  );
});

test('checkout.session.completed fallback fails closed when billing_reservation_id does not exist', async () => {
  const harness = createWebhookHarness({
    profiles: ['profile-a'],
    entitlements: [buildFreeEntitlements({ profileId: 'profile-a', source: 'default_free' })],
  });

  await assert.rejects(
    () =>
      harness.process({
        eventId: 'evt_missing_reservation',
        eventCreated: 202,
        eventType: 'checkout.session.completed',
        paymentStatus: 'paid',
        snapshot: {
          billingReservationId: 'reservation-missing',
          checkoutSessionId: 'cs_a',
          subscriptionId: 'sub_a',
          profileId: 'profile-a',
          purchaserUserId: 'owner-1',
          customerId: 'cus_1',
          priceId: 'price_profile_pro',
          status: 'active',
          currentPeriodEnd: '2026-09-25T00:00:00.000Z',
          cancelAtPeriodEnd: false,
        },
      }),
    /reservation not found/i
  );
});
