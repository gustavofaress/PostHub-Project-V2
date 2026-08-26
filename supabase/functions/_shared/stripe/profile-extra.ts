import type { ProfileEntitlementRecord } from '../../../../shared/profile-entitlements.ts';
import { buildFreeEntitlements, buildProEntitlements } from '../../../../shared/profile-entitlements.ts';
import {
  buildProfileExtraCheckoutSessionParams,
  resolveProfileExtraCheckoutEligibility,
  resolveProfileExtraCheckoutState,
  resolveProfileExtraWebhookAction,
  resolveProfileStripeOrderingDecision,
  shouldDowngradeProfileExtraEntitlementOnTermination,
  type ProfileExtraSubscriptionRecord,
  type ProfileExtraSubscriptionSnapshot,
  type ProfileExtraWebhookEventType,
  type ProfileStripeOrderingDecision,
} from '../../../../shared/profile-extra-subscriptions.ts';

export interface CheckoutExtraSourceProfileRecord {
  id: string;
  userId: string | null;
  currentEntitlementPlanCode: string | null;
  currentExtraRecordId: string | null;
  currentExtraStatus: string | null;
  currentExtraTargetProfileId: string | null;
  currentExtraCheckoutSessionId: string | null;
  currentExtraCheckoutExpiresAt: string | null;
}

export interface ExtraCheckoutActorContext {
  userId: string | null;
  email: string | null;
  isAdmin?: boolean | null;
}

export interface CreateProfileExtraCheckoutParams {
  actor: ExtraCheckoutActorContext;
  sourceProfile: CheckoutExtraSourceProfileRecord | null;
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
    sourceProfileId: string;
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

export interface ProcessProfileExtraWebhookEventParams {
  eventId: string;
  eventCreated: number;
  eventType: ProfileExtraWebhookEventType;
  paymentStatus?: string | null;
  snapshot: ProfileExtraSubscriptionSnapshot;
  loadSourceProfileById: (profileId: string) => Promise<{ id: string } | null>;
  loadSubscriptionByStripeId: (
    stripeSubscriptionId: string
  ) => Promise<ProfileExtraSubscriptionRecord | null>;
  loadSubscriptionByCheckoutSessionId: (
    stripeCheckoutSessionId: string
  ) => Promise<ProfileExtraSubscriptionRecord | null>;
  loadSubscriptionByReservationId: (
    reservationId: string
  ) => Promise<ProfileExtraSubscriptionRecord | null>;
  loadCurrentEntitlementByProfileId: (
    profileId: string
  ) => Promise<Pick<ProfileEntitlementRecord, 'plan_code' | 'source' | 'subscription_ref'> | null>;
  saveSubscriptionRecord: (
    record: ProfileExtraSubscriptionRecord
  ) => Promise<ProfileExtraSubscriptionRecord>;
  updateTargetProfileActive: (profileId: string, isActive: boolean) => Promise<void>;
  upsertProfileEntitlement: (record: ProfileEntitlementRecord) => Promise<void>;
  now?: Date;
}

const buildError = (message: string, status: number, code: string) => {
  const error = new Error(message) as Error & { status?: number; code?: string };
  error.status = status;
  error.code = code;
  return error;
};

const buildProfileExtraSubscriptionRecord = (input: {
  existing: ProfileExtraSubscriptionRecord | null;
  snapshot: ProfileExtraSubscriptionSnapshot;
  eventId: string;
  eventCreated: number;
}): ProfileExtraSubscriptionRecord => ({
  id: input.existing?.id ?? input.snapshot.billingReservationId ?? '',
  purchasedByUserId: input.snapshot.purchaserUserId,
  sourceProfileId: input.existing ? input.existing.sourceProfileId : input.snapshot.sourceProfileId,
  targetProfileId: input.existing?.targetProfileId ?? null,
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

export async function runCreateProfileExtraCheckout(
  input: CreateProfileExtraCheckoutParams
) {
  const now = input.now ?? new Date();
  const eligibility = resolveProfileExtraCheckoutEligibility({
    actorUserId: input.actor.userId,
    actorIsAdmin: input.actor.isAdmin,
    sourceProfileOwnerUserId: input.sourceProfile?.userId ?? null,
    sourceEntitlementPlanCode: input.sourceProfile?.currentEntitlementPlanCode ?? null,
  });

  if (!eligibility.allowed) {
    if (eligibility.reason === 'authentication_required') {
      throw buildError('Authenticated user not found.', 401, 'AUTHENTICATION_REQUIRED');
    }

    if (eligibility.reason === 'source_profile_not_found') {
      throw buildError('Perfil de origem nao encontrado.', 404, 'SOURCE_PROFILE_NOT_FOUND');
    }

    if (eligibility.reason === 'billing_authority_required') {
      throw buildError(
        'Somente o owner do perfil pode comprar um perfil adicional.',
        403,
        'PROFILE_EXTRA_OWNER_REQUIRED'
      );
    }

    if (eligibility.reason === 'admin_billing_not_required') {
      throw buildError(
        'Contas administrativas nao precisam comprar perfil adicional.',
        409,
        'PROFILE_EXTRA_ADMIN_BLOCKED'
      );
    }

    throw buildError(
      'Somente perfis PRO com entitlement materializado podem comprar perfil adicional.',
      409,
      'PROFILE_EXTRA_PRO_REQUIRED'
    );
  }

  if (!input.sourceProfile || !input.sourceProfile.userId || !input.actor.userId) {
    throw buildError('Perfil de origem nao encontrado.', 404, 'SOURCE_PROFILE_NOT_FOUND');
  }

  const checkoutState = resolveProfileExtraCheckoutState({
    status: input.sourceProfile.currentExtraStatus,
    targetProfileId: input.sourceProfile.currentExtraTargetProfileId,
    checkoutExpiresAt: input.sourceProfile.currentExtraCheckoutExpiresAt,
    now,
  });

  let refreshedCheckoutState = checkoutState;

  if (checkoutState === 'checkout_pending_expired' && input.sourceProfile.currentExtraRecordId) {
    if (!input.sourceProfile.currentExtraCheckoutSessionId) {
      throw buildError(
        'Ja existe um checkout de perfil adicional pendente e ele ainda nao pode ser liberado com seguranca.',
        409,
        'PROFILE_EXTRA_CHECKOUT_PENDING'
      );
    }

    let currentCheckoutSessionStatus: string | null = null;

    try {
      const currentCheckoutSession = await input.retrieveCheckoutSession(
        input.sourceProfile.currentExtraCheckoutSessionId
      );
      currentCheckoutSessionStatus =
        typeof currentCheckoutSession.status === 'string'
          ? currentCheckoutSession.status
          : null;
    } catch {
      throw buildError(
        'Nao foi possivel confirmar o estado do checkout anterior. Tente novamente em instantes.',
        503,
        'PROFILE_EXTRA_CHECKOUT_STATE_UNAVAILABLE'
      );
    }

    if (currentCheckoutSessionStatus === 'expired') {
      if (!input.expireCurrentCheckoutReservation) {
        throw buildError(
          'Nao foi possivel liberar a reservation expirada do perfil adicional.',
          503,
          'PROFILE_EXTRA_CHECKOUT_STATE_UNAVAILABLE'
        );
      }

      await input.expireCurrentCheckoutReservation(input.sourceProfile.currentExtraRecordId);
      refreshedCheckoutState = 'available';
    } else if (currentCheckoutSessionStatus === 'complete') {
      throw buildError(
        'Ja existe um checkout de perfil adicional concluido aguardando conciliacao.',
        409,
        'PROFILE_EXTRA_CHECKOUT_COMPLETED_PENDING_WEBHOOK'
      );
    } else {
      throw buildError(
        'Ja existe um checkout de perfil adicional em andamento.',
        409,
        'PROFILE_EXTRA_CHECKOUT_PENDING'
      );
    }
  }

  if (refreshedCheckoutState === 'checkout_pending_valid') {
    throw buildError(
      'Ja existe um checkout de perfil adicional em andamento.',
      409,
      'PROFILE_EXTRA_CHECKOUT_PENDING'
    );
  }

  if (refreshedCheckoutState === 'available_paid_slot') {
    throw buildError(
      'Ja existe um perfil adicional pago disponivel para criacao.',
      409,
      'PROFILE_EXTRA_SLOT_AVAILABLE'
    );
  }

  if (refreshedCheckoutState === 'current_unlinked_slot') {
    throw buildError(
      'Ja existe uma assinatura de perfil adicional em andamento para esta conta.',
      409,
      'PROFILE_EXTRA_SLOT_UNAVAILABLE'
    );
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
      sourceProfileId: input.sourceProfile.id,
      purchasedByUserId: input.actor.userId,
      stripePriceId: input.priceId,
    });
    reservationId = reservation.id;

    const sessionParams = buildProfileExtraCheckoutSessionParams({
      appBaseUrl: input.appBaseUrl,
      billingReservationId: reservationId,
      priceId: input.priceId,
      sourceProfileId: input.sourceProfile.id,
      purchaserUserId: input.actor.userId,
      customerId: input.customerId,
      customerEmail: input.customerId ? null : input.actor.email,
    });

    const session = await input.createCheckoutSession(sessionParams);
    checkoutSessionId = session.id;

    if (!session.url) {
      const error = buildError(
        'Stripe nao retornou uma URL de checkout.',
        502,
        'PROFILE_EXTRA_CHECKOUT_URL_MISSING'
      );
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

export async function processProfileExtraWebhookEvent(
  input: ProcessProfileExtraWebhookEventParams
) {
  if (input.eventType === 'checkout.session.completed') {
    const sourceProfile = await input.loadSourceProfileById(input.snapshot.sourceProfileId);

    if (!sourceProfile) {
      throw new Error('Source profile not found for Stripe profile extra checkout session.');
    }
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

  if (input.eventType === 'checkout.session.completed' && !recoveredExisting) {
    throw new Error('Stripe checkout reservation not found for profile extra checkout session.');
  }

  if (input.eventType !== 'checkout.session.completed' && !recoveredExisting) {
    throw new Error('Stripe profile extra subscription mapping not found for subscription event.');
  }

  if (
    recoveredExisting &&
    (
      recoveredExisting.purchasedByUserId !== input.snapshot.purchaserUserId ||
      recoveredExisting.stripePriceId !== input.snapshot.priceId ||
      (
        recoveredExisting.sourceProfileId !== null &&
        recoveredExisting.sourceProfileId !== input.snapshot.sourceProfileId
      ) ||
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
    throw new Error('Stripe profile extra subscription mapping mismatch detected.');
  }

  if (
    input.eventType === 'checkout.session.completed' &&
    recoveredExisting &&
    recoveredExisting.status !== 'checkout_pending' &&
    recoveredExisting.status !== 'incomplete'
  ) {
    throw new Error('Stripe profile extra reservation is not in a recoverable state.');
  }

  const orderingDecision: ProfileStripeOrderingDecision = resolveProfileStripeOrderingDecision({
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
    buildProfileExtraSubscriptionRecord({
      existing: recoveredExisting,
      snapshot: input.snapshot,
      eventId: input.eventId,
      eventCreated: input.eventCreated,
    })
  );

  const action = resolveProfileExtraWebhookAction({
    eventType: input.eventType,
    paymentStatus: input.paymentStatus,
    snapshot: input.snapshot,
    now: input.now,
  });

  let resolvedAction = action;
  const targetProfileId = subscriptionRecord.targetProfileId;

  if (resolvedAction === 'activate_slot' && targetProfileId) {
    await input.updateTargetProfileActive(targetProfileId, true);
    await input.upsertProfileEntitlement(
      buildProEntitlements({
        profileId: targetProfileId,
        source: 'stripe',
        subscriptionRef: input.snapshot.subscriptionId,
        effectiveFrom: new Date((input.now ?? new Date()).getTime()).toISOString(),
      })
    );
  }

  if (resolvedAction === 'suspend_target' && targetProfileId) {
    const currentEntitlement = await input.loadCurrentEntitlementByProfileId(targetProfileId);

    if (
      shouldDowngradeProfileExtraEntitlementOnTermination({
        currentEntitlementSource: currentEntitlement?.source ?? null,
        currentEntitlementSubscriptionRef: currentEntitlement?.subscription_ref ?? null,
        endingStripeSubscriptionId: input.snapshot.subscriptionId,
      })
    ) {
      await input.updateTargetProfileActive(targetProfileId, false);
      await input.upsertProfileEntitlement(
        buildFreeEntitlements({
          profileId: targetProfileId,
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
