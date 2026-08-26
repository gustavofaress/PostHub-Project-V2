import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProfileExtraCheckoutSessionParams,
  buildProfileExtraMetadata,
  parseProfileExtraMetadata,
  resolveProfileExtraCheckoutEligibility,
  resolveProfileExtraCheckoutState,
  resolveProfileExtraStatusSnapshot,
} from '../../../shared/profile-extra-subscriptions.ts';
import { runCreateProfileExtraCheckout } from '../../../supabase/functions/_shared/stripe/profile-extra.ts';

type CheckoutSourceProfile = NonNullable<
  Parameters<typeof runCreateProfileExtraCheckout>[0]['sourceProfile']
>;

const buildSourceProfile = (overrides?: Partial<CheckoutSourceProfile>): CheckoutSourceProfile => ({
  id: 'source-profile-1',
  userId: 'owner-1',
  currentEntitlementPlanCode: 'pro',
  currentExtraRecordId: null,
  currentExtraStatus: null,
  currentExtraTargetProfileId: null,
  currentExtraCheckoutSessionId: null,
  currentExtraCheckoutExpiresAt: null,
  ...(overrides ?? {}),
});

const buildCheckoutHarness = (overrides?: Partial<{
  createCheckoutReservation: Parameters<typeof runCreateProfileExtraCheckout>[0]['createCheckoutReservation'];
  createCheckoutSession: Parameters<typeof runCreateProfileExtraCheckout>[0]['createCheckoutSession'];
  attachCheckoutSessionToReservation: Parameters<typeof runCreateProfileExtraCheckout>[0]['attachCheckoutSessionToReservation'];
  retrieveCheckoutSession: Parameters<typeof runCreateProfileExtraCheckout>[0]['retrieveCheckoutSession'];
  expireCheckoutSession: Parameters<typeof runCreateProfileExtraCheckout>[0]['expireCheckoutSession'];
  expireCurrentCheckoutReservation: Parameters<typeof runCreateProfileExtraCheckout>[0]['expireCurrentCheckoutReservation'];
  releaseCheckoutReservation: Parameters<typeof runCreateProfileExtraCheckout>[0]['releaseCheckoutReservation'];
}>) => {
  const sequence: string[] = [];
  let capturedParams: Record<string, unknown> | null = null;

  return {
    sequence,
    get capturedParams() {
      return capturedParams;
    },
    params: {
      actor: {
        userId: 'owner-1',
        email: 'owner@example.com',
        isAdmin: false,
      },
      sourceProfile: buildSourceProfile(),
      priceId: 'price_profile_extra',
      appBaseUrl: 'https://www.posthub.com.br',
      now: new Date('2026-08-26T12:00:00.000Z'),
      createCheckoutReservation:
        overrides?.createCheckoutReservation ??
        (async () => {
          sequence.push('reserve');
          return { id: 'reservation-1' };
        }),
      createCheckoutSession:
        overrides?.createCheckoutSession ??
        (async (params) => {
          sequence.push('stripe');
          capturedParams = params;
          return {
            id: 'cs_1',
            url: 'https://checkout.stripe.com/c/pay/cs_1',
            expires_at: 1798200000,
            customer: 'cus_1',
          };
        }),
      attachCheckoutSessionToReservation:
        overrides?.attachCheckoutSessionToReservation ??
        (async () => {
          sequence.push('attach');
        }),
      retrieveCheckoutSession:
        overrides?.retrieveCheckoutSession ??
        (async () => {
          sequence.push('retrieve');
          return { status: 'expired' };
        }),
      expireCheckoutSession:
        overrides?.expireCheckoutSession ??
        (async () => {
          sequence.push('expire-stripe');
        }),
      expireCurrentCheckoutReservation:
        overrides?.expireCurrentCheckoutReservation ??
        (async () => {
          sequence.push('expire-reservation');
        }),
      releaseCheckoutReservation:
        overrides?.releaseCheckoutReservation ??
        (async () => {
          sequence.push('release-reservation');
        }),
    },
  };
};

test('PRO and legacy_pro owners can buy an additional profile slot', () => {
  for (const sourceEntitlementPlanCode of ['pro', 'legacy_pro']) {
    const result = resolveProfileExtraCheckoutEligibility({
      actorUserId: 'owner-1',
      actorIsAdmin: false,
      sourceProfileOwnerUserId: 'owner-1',
      sourceEntitlementPlanCode,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.reason, null);
  }
});

test('FREE, missing, and non-PRO legacy plans cannot start additional profile checkout', () => {
  for (const sourceEntitlementPlanCode of ['free', null, 'legacy_start', 'legacy_growth']) {
    const result = resolveProfileExtraCheckoutEligibility({
      actorUserId: 'owner-1',
      actorIsAdmin: false,
      sourceProfileOwnerUserId: 'owner-1',
      sourceEntitlementPlanCode,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'pro_entitlement_required');
  }
});

test('member and ADMIN cannot start paid additional profile checkout', () => {
  assert.deepEqual(
    resolveProfileExtraCheckoutEligibility({
      actorUserId: 'member-1',
      actorIsAdmin: false,
      sourceProfileOwnerUserId: 'owner-1',
      sourceEntitlementPlanCode: 'pro',
    }),
    { allowed: false, reason: 'billing_authority_required' }
  );

  assert.deepEqual(
    resolveProfileExtraCheckoutEligibility({
      actorUserId: 'owner-1',
      actorIsAdmin: true,
      sourceProfileOwnerUserId: 'owner-1',
      sourceEntitlementPlanCode: 'pro',
    }),
    { allowed: false, reason: 'admin_billing_not_required' }
  );
});

test('additional profile checkout metadata includes billing_reservation_id in session and subscription', () => {
  const params = buildProfileExtraCheckoutSessionParams({
    appBaseUrl: 'https://www.posthub.com.br',
    billingReservationId: 'reservation-1',
    priceId: 'price_profile_extra',
    sourceProfileId: 'source-profile-1',
    purchaserUserId: 'owner-1',
    customerEmail: 'owner@example.com',
  });
  const metadata = buildProfileExtraMetadata({
    billingReservationId: 'reservation-1',
    sourceProfileId: 'source-profile-1',
    purchaserUserId: 'owner-1',
  });

  assert.equal(params.mode, 'subscription');
  assert.deepEqual(params.line_items, [{ price: 'price_profile_extra', quantity: 1 }]);
  assert.deepEqual(params.metadata, metadata);
  assert.deepEqual((params.subscription_data as { metadata: unknown }).metadata, metadata);
  assert.deepEqual(parseProfileExtraMetadata(params.metadata), metadata);
});

test('additional profile checkout state treats active unlinked slot as available slot', () => {
  assert.equal(
    resolveProfileExtraCheckoutState({
      status: 'active',
      targetProfileId: null,
    }),
    'available_paid_slot'
  );
});

test('multiple active unlinked profile extra slots remain reusable without exposing billing details', () => {
  assert.deepEqual(
    resolveProfileExtraStatusSnapshot({
      subscriptions: [
        { status: 'active', targetProfileId: null },
        { status: 'active', targetProfileId: null },
      ],
    }),
    {
      hasAvailableSlot: true,
      checkoutPending: false,
      hasLinkedExtraProfiles: false,
    }
  );
});

test('active linked and active unlinked extra subscriptions can coexist as reusable capacity', () => {
  assert.deepEqual(
    resolveProfileExtraStatusSnapshot({
      subscriptions: [
        { status: 'active', targetProfileId: 'profile-a' },
        { status: 'active', targetProfileId: null },
      ],
    }),
    {
      hasAvailableSlot: true,
      checkoutPending: false,
      hasLinkedExtraProfiles: true,
    }
  );
});

test('past_due and paused unlinked subscriptions block checkout but are not reusable slots', () => {
  assert.deepEqual(
    resolveProfileExtraStatusSnapshot({
      subscriptions: [
        { status: 'past_due', targetProfileId: null },
        { status: 'paused', targetProfileId: null },
      ],
    }),
    {
      hasAvailableSlot: false,
      checkoutPending: true,
      hasLinkedExtraProfiles: false,
    }
  );
});

test('valid pending checkout blocks retry', () => {
  assert.equal(
    resolveProfileExtraCheckoutState({
      status: 'checkout_pending',
      checkoutExpiresAt: '2026-08-26T13:00:00.000Z',
      now: new Date('2026-08-26T12:00:00.000Z'),
    }),
    'checkout_pending_valid'
  );
});

test('new additional profile checkout reserves before Stripe and attaches after Stripe', async () => {
  const harness = buildCheckoutHarness();

  const result = await runCreateProfileExtraCheckout(harness.params);

  assert.equal(result.sessionId, 'cs_1');
  assert.equal(result.checkoutUrl, 'https://checkout.stripe.com/c/pay/cs_1');
  assert.deepEqual(harness.sequence, ['reserve', 'stripe', 'attach']);
  assert.deepEqual(
    (harness.capturedParams?.metadata as { billing_reservation_id?: string } | undefined)
      ?.billing_reservation_id,
    'reservation-1'
  );
});

test('concurrent reservation conflict does not create a Stripe Checkout', async () => {
  const harness = buildCheckoutHarness({
    createCheckoutReservation: async () => {
      harness.sequence.push('reserve');
      const error = new Error('duplicate') as Error & { status?: number; code?: string };
      error.status = 409;
      error.code = 'PROFILE_EXTRA_CHECKOUT_CONFLICT';
      throw error;
    },
  });

  await assert.rejects(() => runCreateProfileExtraCheckout(harness.params), /duplicate/);
  assert.deepEqual(harness.sequence, ['reserve']);
});

test('existing active unlinked slot blocks checkout before creating a new Stripe Session', async () => {
  const harness = buildCheckoutHarness();
  harness.params.sourceProfile = buildSourceProfile({
    currentExtraRecordId: 'slot-1',
    currentExtraStatus: 'active',
    currentExtraTargetProfileId: null,
  });

  await assert.rejects(() => runCreateProfileExtraCheckout(harness.params), /disponivel/);
  assert.deepEqual(harness.sequence, []);
});

test('expired pending checkout only releases retry after Stripe confirms session expired', async () => {
  const harness = buildCheckoutHarness();
  harness.params.sourceProfile = buildSourceProfile({
    currentExtraRecordId: 'reservation-old',
    currentExtraStatus: 'checkout_pending',
    currentExtraCheckoutSessionId: 'cs_old',
    currentExtraCheckoutExpiresAt: '2026-08-26T11:00:00.000Z',
  });

  await runCreateProfileExtraCheckout(harness.params);

  assert.deepEqual(harness.sequence, [
    'retrieve',
    'expire-reservation',
    'reserve',
    'stripe',
    'attach',
  ]);
});

test('expired pending checkout with complete Stripe session does not create a second checkout', async () => {
  const harness = buildCheckoutHarness({
    retrieveCheckoutSession: async () => {
      harness.sequence.push('retrieve');
      return { status: 'complete' };
    },
  });
  harness.params.sourceProfile = buildSourceProfile({
    currentExtraRecordId: 'reservation-old',
    currentExtraStatus: 'checkout_pending',
    currentExtraCheckoutSessionId: 'cs_old',
    currentExtraCheckoutExpiresAt: '2026-08-26T11:00:00.000Z',
  });

  await assert.rejects(() => runCreateProfileExtraCheckout(harness.params), /concluido/);
  assert.deepEqual(harness.sequence, ['retrieve']);
});

test('expired pending checkout with open Stripe session does not create a second checkout', async () => {
  const harness = buildCheckoutHarness({
    retrieveCheckoutSession: async () => {
      harness.sequence.push('retrieve');
      return { status: 'open' };
    },
  });
  harness.params.sourceProfile = buildSourceProfile({
    currentExtraRecordId: 'reservation-old',
    currentExtraStatus: 'checkout_pending',
    currentExtraCheckoutSessionId: 'cs_old',
    currentExtraCheckoutExpiresAt: '2026-08-26T11:00:00.000Z',
  });

  await assert.rejects(() => runCreateProfileExtraCheckout(harness.params), /em andamento/);
  assert.deepEqual(harness.sequence, ['retrieve']);
});

test('expired pending checkout blocks retry when Stripe retrieve fails', async () => {
  const harness = buildCheckoutHarness({
    retrieveCheckoutSession: async () => {
      harness.sequence.push('retrieve');
      throw new Error('Stripe unavailable');
    },
  });
  harness.params.sourceProfile = buildSourceProfile({
    currentExtraRecordId: 'reservation-old',
    currentExtraStatus: 'checkout_pending',
    currentExtraCheckoutSessionId: 'cs_old',
    currentExtraCheckoutExpiresAt: '2026-08-26T11:00:00.000Z',
  });

  await assert.rejects(() => runCreateProfileExtraCheckout(harness.params), /confirmar o estado/);
  assert.deepEqual(harness.sequence, ['retrieve']);
});

test('checkout_pending without Stripe session id is not automatically expired', async () => {
  const harness = buildCheckoutHarness();
  harness.params.sourceProfile = buildSourceProfile({
    currentExtraRecordId: 'reservation-old',
    currentExtraStatus: 'checkout_pending',
    currentExtraCheckoutSessionId: null,
    currentExtraCheckoutExpiresAt: '2026-08-26T11:00:00.000Z',
  });

  await assert.rejects(() => runCreateProfileExtraCheckout(harness.params), /nao pode ser liberado/);
  assert.deepEqual(harness.sequence, []);
});

test('Stripe Checkout creation failure releases only the local reservation', async () => {
  const harness = buildCheckoutHarness({
    createCheckoutSession: async () => {
      harness.sequence.push('stripe');
      throw new Error('Stripe create failed');
    },
  });

  await assert.rejects(() => runCreateProfileExtraCheckout(harness.params), /Stripe create failed/);
  assert.deepEqual(harness.sequence, ['reserve', 'stripe', 'release-reservation']);
});

test('DB attach failure expires Stripe checkout and clears pending reservation', async () => {
  const harness = buildCheckoutHarness({
    attachCheckoutSessionToReservation: async () => {
      harness.sequence.push('attach');
      throw new Error('DB attach failed');
    },
  });

  await assert.rejects(() => runCreateProfileExtraCheckout(harness.params), /DB attach failed/);
  assert.deepEqual(harness.sequence, [
    'reserve',
    'stripe',
    'attach',
    'expire-stripe',
    'expire-reservation',
  ]);
});

test('DB attach failure reports safely when Stripe expiration also fails and keeps reservation recoverable', async () => {
  const harness = buildCheckoutHarness({
    attachCheckoutSessionToReservation: async () => {
      harness.sequence.push('attach');
      throw new Error('DB attach failed');
    },
    expireCheckoutSession: async () => {
      harness.sequence.push('expire-stripe');
      throw new Error('Stripe expire failed');
    },
  });

  await assert.rejects(
    () => runCreateProfileExtraCheckout(harness.params),
    /expiracao compensatoria/
  );
  assert.deepEqual(harness.sequence, ['reserve', 'stripe', 'attach', 'expire-stripe']);
});
