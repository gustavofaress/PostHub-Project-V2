import type { ProfileEntitlementRecord } from '../../../../shared/profile-entitlements.ts';
import { buildFreeEntitlements, buildProEntitlements } from '../../../../shared/profile-entitlements.ts';
import {
  buildProfileProCheckoutSessionParams,
  resolveProfileProCheckoutEligibility,
  resolveProfileStripeCheckoutState,
  resolveProfileStripeOrderingDecision,
  resolveProfileStripeWebhookAction,
  shouldMaterializeFreeEntitlementOnStripeTermination,
  type ProfileProWebhookEventType,
  type ProfileStripeSubscriptionRecord,
  type ProfileStripeSubscriptionSnapshot,
} from '../../../../shared/profile-stripe-subscriptions.ts';

export interface CheckoutOwnedProfileRecord {
  id: string;
  userId: string | null;
  currentEntitlementPlanCode: string | null;
  currentStripeSubscriptionStatus: string | null;
  currentStripeRecordId: string | null;
  currentStripeCheckoutSessionId: string | null;
  currentStripeCheckoutExpiresAt: string | null;
}

export interface CheckoutActorContext {
  userId: string | null;
  email: string | null;
  isAdmin?: boolean | null;
}

export interface CreateProfileProCheckoutParams {
  actor: CheckoutActorContext;
  profile: CheckoutOwnedProfileRecord | null;
  priceId: string;
  appBaseUrl: string;
  customerId?: string | null;
  createCheckoutSession: (params: Record<string, unknown>) => Promise<{
    id: string;
    url: string | null;
    expires_at?: number | null;
    customer?: string | { id?: string | null } | null;
  }>;
  retrieveCheckoutSession: (checkoutSessionId: string) => Promise<{
    status?: string | null;
  }>;
  expireCheckoutSession: (checkoutSessionId: string) => Promise<void>;
  expireCurrentCheckoutReservation?: (reservationId: string) => Promise<void>;
  createCheckoutReservation: (input: {
    profileId: string;
    purchasedByUserId: string;
    stripePriceId: string;
  }) => Promise<{ id: string }>;
  attachCheckoutSessionToReservation: (input: {
    reservationId: string;
    stripeCheckoutSessionId: string;
    checkoutExpiresAt: string | null;
    stripeCustomerId: string | null;
  }) => Promise<void>;
  releaseCheckoutReservation: (reservationId: string) => Promise<void>;
  now?: Date;
}

export interface ProfileStripeSubscriptionConflict {
  id: string;
  profileId: string;
  stripeSubscriptionId: string;
  status: string;
}

export interface ProcessProfileProWebhookEventParams {
  eventId: string;
  eventCreated: number;
  eventType: ProfileProWebhookEventType;
  paymentStatus?: string | null;
  snapshot: ProfileStripeSubscriptionSnapshot;
  loadProfileById: (profileId: string) => Promise<{ id: string } | null>;
  loadSubscriptionByStripeId: (
    stripeSubscriptionId: string
  ) => Promise<ProfileStripeSubscriptionRecord | null>;
  loadSubscriptionByCheckoutSessionId: (
    stripeCheckoutSessionId: string
  ) => Promise<ProfileStripeSubscriptionRecord | null>;
  loadSubscriptionByReservationId: (
    reservationId: string
  ) => Promise<ProfileStripeSubscriptionRecord | null>;
  loadCurrentEntitlementByProfileId: (
    profileId: string
  ) => Promise<Pick<ProfileEntitlementRecord, 'plan_code' | 'source' | 'subscription_ref'> | null>;
  loadActiveConflictByProfileId: (
    profileId: string,
    currentRecordId: string | null
  ) => Promise<ProfileStripeSubscriptionConflict | null>;
  saveSubscriptionRecord: (
    record: ProfileStripeSubscriptionRecord
  ) => Promise<ProfileStripeSubscriptionRecord>;
  upsertProfileEntitlement: (record: ProfileEntitlementRecord) => Promise<void>;
  now?: Date;
}

const CURRENT_STRIPE_STATUSES = [
  'checkout_pending',
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'paused',
];

const buildProfileStripeSubscriptionRecord = (input: {
  existing: ProfileStripeSubscriptionRecord | null;
  snapshot: ProfileStripeSubscriptionSnapshot;
  eventId: string;
  eventCreated: number;
}): ProfileStripeSubscriptionRecord => ({
  id: input.existing?.id ?? input.snapshot.billingReservationId ?? '',
  profileId: input.snapshot.profileId,
  purchasedByUserId: input.snapshot.purchaserUserId,
  stripeCustomerId: input.snapshot.customerId,
  stripeCheckoutSessionId:
    input.snapshot.checkoutSessionId ?? input.existing?.stripeCheckoutSessionId ?? null,
  checkoutExpiresAt: input.existing?.checkoutExpiresAt ?? null,
  stripeSubscriptionId: input.snapshot.subscriptionId,
  stripePriceId: input.snapshot.priceId,
  status: input.snapshot.status,
  currentPeriodEnd: input.snapshot.currentPeriodEnd,
  cancelAtPeriodEnd: input.snapshot.cancelAtPeriodEnd,
  lastStripeEventId: input.eventId,
  lastStripeEventCreated: input.eventCreated,
});

export async function runCreateProfileProCheckout(
  input: CreateProfileProCheckoutParams
) {
  const now = input.now ?? new Date();
  const eligibility = resolveProfileProCheckoutEligibility({
    actorUserId: input.actor.userId,
    actorIsAdmin: input.actor.isAdmin,
    profileOwnerUserId: input.profile?.userId ?? null,
    currentEntitlementPlanCode: input.profile?.currentEntitlementPlanCode ?? null,
  });

  if (!eligibility.allowed) {
    if (eligibility.reason === 'authentication_required') {
      const error = new Error('Authenticated user not found.') as Error & { status?: number };
      error.status = 401;
      throw error;
    }

    if (eligibility.reason === 'profile_not_found') {
      const error = new Error('Perfil nao encontrado.') as Error & { status?: number };
      error.status = 404;
      throw error;
    }

    if (eligibility.reason === 'billing_authority_required') {
      const error = new Error(
        'Somente o owner do perfil pode iniciar a cobranca deste workspace.'
      ) as Error & { status?: number };
      error.status = 403;
      throw error;
    }

    if (eligibility.reason === 'admin_billing_not_required') {
      const error = new Error(
        'Perfis administrativos nao precisam iniciar uma assinatura PRO paga.'
      ) as Error & { status?: number };
      error.status = 409;
      throw error;
    }

    const error = new Error(
      'Somente perfis com entitlement FREE materializado podem iniciar este checkout PRO.'
    ) as Error & { status?: number };
    error.status = 409;
    throw error;
  }

  if (!input.profile || !input.profile.userId || !input.actor.userId) {
    const error = new Error('Perfil nao encontrado.') as Error & { status?: number };
    error.status = 404;
    throw error;
  }

  const checkoutState = resolveProfileStripeCheckoutState({
    status: input.profile.currentStripeSubscriptionStatus,
    checkoutExpiresAt: input.profile.currentStripeCheckoutExpiresAt,
    now,
  });

  let refreshedCheckoutState = checkoutState;

  if (checkoutState === 'checkout_pending_expired' && input.profile.currentStripeRecordId) {
    if (!input.profile.currentStripeCheckoutSessionId) {
      const error = new Error(
        'Ja existe um checkout PRO pendente para este perfil e ele ainda nao pode ser liberado com seguranca.'
      ) as Error & { status?: number; code?: string };
      error.status = 409;
      error.code = 'PROFILE_PRO_CHECKOUT_PENDING';
      throw error;
    }

    let currentCheckoutSessionStatus: string | null = null;

    try {
      const currentCheckoutSession = await input.retrieveCheckoutSession(
        input.profile.currentStripeCheckoutSessionId
      );
      currentCheckoutSessionStatus =
        typeof currentCheckoutSession.status === 'string'
          ? currentCheckoutSession.status
          : null;
    } catch {
      const error = new Error(
        'Nao foi possivel confirmar o estado do checkout PRO anterior. Tente novamente em instantes.'
      ) as Error & { status?: number; code?: string };
      error.status = 503;
      error.code = 'PROFILE_PRO_CHECKOUT_STATE_UNAVAILABLE';
      throw error;
    }

    if (currentCheckoutSessionStatus === 'expired') {
      if (!input.expireCurrentCheckoutReservation) {
        const error = new Error(
          'Nao foi possivel liberar a reservation expirada do checkout PRO.'
        ) as Error & { status?: number; code?: string };
        error.status = 503;
        error.code = 'PROFILE_PRO_CHECKOUT_STATE_UNAVAILABLE';
        throw error;
      }

      await input.expireCurrentCheckoutReservation(input.profile.currentStripeRecordId);
      refreshedCheckoutState = 'available';
    } else if (currentCheckoutSessionStatus === 'complete') {
      const error = new Error(
        'Ja existe um checkout PRO concluido aguardando conciliacao para este perfil.'
      ) as Error & { status?: number; code?: string };
      error.status = 409;
      error.code = 'PROFILE_PRO_CHECKOUT_COMPLETED_PENDING_WEBHOOK';
      throw error;
    } else {
      const error = new Error(
        'Ja existe um checkout PRO em andamento para este perfil.'
      ) as Error & { status?: number; code?: string };
      error.status = 409;
      error.code = 'PROFILE_PRO_CHECKOUT_PENDING';
      throw error;
    }
  }

  if (refreshedCheckoutState === 'checkout_pending_valid') {
    const error = new Error(
      'Ja existe um checkout PRO em andamento para este perfil.'
    ) as Error & { status?: number; code?: string };
    error.status = 409;
    error.code = 'PROFILE_PRO_CHECKOUT_PENDING';
    throw error;
  }

  if (refreshedCheckoutState === 'current_subscription') {
    const error = new Error(
      'Este perfil ja possui acesso pago ativo e nao pode iniciar um novo checkout PRO.'
    ) as Error & { status?: number; code?: string };
    error.status = 409;
    error.code = 'PROFILE_ALREADY_PAID';
    throw error;
  }

  let reservationId: string | null = null;
  let checkoutSessionId: string | null = null;

  const clearReservationAfterExpiredSession = async (currentReservationId: string) => {
    if (input.expireCurrentCheckoutReservation) {
      try {
        await input.expireCurrentCheckoutReservation(currentReservationId);
        return;
      } catch {
        // Fall back to deleting the pending reservation if status expiration fails.
      }
    }

    await input.releaseCheckoutReservation(currentReservationId);
  };

  const abortCheckoutSessionAndReservation = async (
    currentReservationId: string,
    currentCheckoutSessionId: string,
    cause: unknown
  ) => {
    try {
      await input.expireCheckoutSession(currentCheckoutSessionId);
    } catch (expireError) {
      const error = new Error(
        'Nao foi possivel vincular a sessao Stripe a reservation local, e a expiracao compensatoria do checkout tambem falhou.'
      ) as Error & { cause?: unknown; attachError?: unknown; expireError?: unknown };
      error.cause = cause;
      error.attachError = cause;
      error.expireError = expireError;
      throw error;
    }

    await clearReservationAfterExpiredSession(currentReservationId);
  };

  try {
    const reservation = await input.createCheckoutReservation({
      profileId: input.profile.id,
      purchasedByUserId: input.actor.userId,
      stripePriceId: input.priceId,
    });
    reservationId = reservation.id;

    const sessionParams = buildProfileProCheckoutSessionParams({
      appBaseUrl: input.appBaseUrl,
      billingReservationId: reservationId,
      priceId: input.priceId,
      profileId: input.profile.id,
      purchaserUserId: input.actor.userId,
      customerId: input.customerId,
      customerEmail: input.customerId ? null : input.actor.email,
    });

    const session = await input.createCheckoutSession(sessionParams);
    checkoutSessionId = session.id;

    if (!session.url) {
      const error = new Error('Stripe nao retornou uma URL de checkout.') as Error & {
        status?: number;
      };
      error.status = 502;
      await abortCheckoutSessionAndReservation(reservationId, session.id, error);
      throw error;
    }

    const stripeCustomerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? input.customerId ?? null;

    const checkoutExpiresAt =
      typeof session.expires_at === 'number'
        ? new Date(session.expires_at * 1000).toISOString()
        : null;

    try {
      await input.attachCheckoutSessionToReservation({
        reservationId,
        stripeCheckoutSessionId: session.id,
        checkoutExpiresAt,
        stripeCustomerId,
      });
    } catch (attachError) {
      await abortCheckoutSessionAndReservation(reservationId, session.id, attachError);
      throw attachError;
    }

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      sessionParams,
    };
  } catch (error) {
    if (reservationId && !checkoutSessionId) {
      await input.releaseCheckoutReservation(reservationId).catch(() => undefined);
    }

    throw error;
  }
}

export async function processProfileProWebhookEvent(
  input: ProcessProfileProWebhookEventParams
) {
  const profile = await input.loadProfileById(input.snapshot.profileId);

  if (!profile) {
    throw new Error('Target profile not found for Stripe profile subscription event.');
  }

  const existing =
    input.eventType === 'checkout.session.completed' && input.snapshot.checkoutSessionId
      ? await input.loadSubscriptionByCheckoutSessionId(input.snapshot.checkoutSessionId)
      : await input.loadSubscriptionByStripeId(input.snapshot.subscriptionId);

  const recoveredExisting =
    !existing &&
    input.eventType === 'checkout.session.completed' &&
    input.snapshot.billingReservationId
      ? await input.loadSubscriptionByReservationId(input.snapshot.billingReservationId)
      : existing;

  const currentEntitlement = await input.loadCurrentEntitlementByProfileId(input.snapshot.profileId);

  if (input.eventType === 'checkout.session.completed' && !recoveredExisting) {
    throw new Error('Stripe checkout reservation not found for profile PRO checkout session.');
  }

  if (input.eventType !== 'checkout.session.completed' && !recoveredExisting) {
    throw new Error('Stripe profile subscription mapping not found for subscription event.');
  }

  if (
    recoveredExisting &&
    (
      recoveredExisting.profileId !== input.snapshot.profileId ||
      recoveredExisting.purchasedByUserId !== input.snapshot.purchaserUserId ||
      recoveredExisting.stripePriceId !== input.snapshot.priceId ||
      (
        input.snapshot.billingReservationId &&
        recoveredExisting.id !== input.snapshot.billingReservationId
      ) ||
      (
        input.snapshot.checkoutSessionId &&
        recoveredExisting.stripeCheckoutSessionId &&
        recoveredExisting.stripeCheckoutSessionId !== input.snapshot.checkoutSessionId
      ) ||
      (
        recoveredExisting.stripeSubscriptionId &&
        recoveredExisting.stripeSubscriptionId !== input.snapshot.subscriptionId
      )
    )
  ) {
    throw new Error('Stripe profile subscription mapping mismatch detected.');
  }

  if (
    input.eventType === 'checkout.session.completed' &&
    recoveredExisting &&
    recoveredExisting.status !== 'checkout_pending' &&
    recoveredExisting.status !== 'incomplete'
  ) {
    throw new Error('Stripe checkout reservation is not in a recoverable state.');
  }

  if (CURRENT_STRIPE_STATUSES.includes(input.snapshot.status)) {
    const activeConflict = await input.loadActiveConflictByProfileId(
      input.snapshot.profileId,
      recoveredExisting?.id ?? null
    );

    if (activeConflict) {
      throw new Error(
        'Target profile already has another active Stripe subscription mapping.'
      );
    }
  }

  const orderingDecision = resolveProfileStripeOrderingDecision({
    existing: recoveredExisting,
    incomingEventId: input.eventId,
    incomingEventCreated: input.eventCreated,
    incomingStatus: input.snapshot.status,
  });

  if (orderingDecision !== 'apply') {
    return {
      handled: false,
      reason: orderingDecision,
      action: 'ignore' as const,
      subscriptionRecord: recoveredExisting,
    };
  }

  const subscriptionRecord = await input.saveSubscriptionRecord(
    buildProfileStripeSubscriptionRecord({
      existing: recoveredExisting,
      snapshot: input.snapshot,
      eventId: input.eventId,
      eventCreated: input.eventCreated,
    })
  );

  const action = resolveProfileStripeWebhookAction({
    eventType: input.eventType,
    paymentStatus: input.paymentStatus,
    snapshot: input.snapshot,
    now: input.now,
  });

  let resolvedAction = action;

  if (resolvedAction === 'provision_pro') {
    await input.upsertProfileEntitlement(
      buildProEntitlements({
        profileId: input.snapshot.profileId,
        source: 'stripe',
        subscriptionRef: input.snapshot.subscriptionId,
        effectiveFrom: new Date((input.now ?? new Date()).getTime()).toISOString(),
      })
    );
  }

  if (resolvedAction === 'downgrade_to_free') {
    if (
      shouldMaterializeFreeEntitlementOnStripeTermination({
        currentEntitlementSource: currentEntitlement?.source ?? null,
        currentEntitlementSubscriptionRef: currentEntitlement?.subscription_ref ?? null,
        endingStripeSubscriptionId: input.snapshot.subscriptionId,
      })
    ) {
      await input.upsertProfileEntitlement(
        buildFreeEntitlements({
          profileId: input.snapshot.profileId,
          source: 'default_free',
          subscriptionRef: null,
          effectiveFrom: new Date((input.now ?? new Date()).getTime()).toISOString(),
        })
      );
    } else {
      resolvedAction = 'sync_only';
    }
  }

  return {
    handled: true,
    reason: 'applied',
    action: resolvedAction,
    subscriptionRecord,
  };
}

export { CURRENT_STRIPE_STATUSES };
