import {
  getSubscriptionIdFromInvoicePayload,
  hasCheckoutExpired,
  hasStripePeriodEnded,
  isGraceProfileStripeStatus,
  isProfileStripeCurrentStatus,
  isProvisionableProfileStripeStatus,
  isTerminalProfileStripeStatus,
  normalizeProfileStripeSubscriptionStatus,
  resolveProfileStripeOrderingDecision,
  type ProfileStripeOrderingDecision,
  type ProfileStripeSubscriptionStatus,
} from './profile-stripe-subscriptions.ts';

export const PROFILE_EXTRA_BILLING_FLOW = 'profile_extra_v1' as const;

export const PROFILE_EXTRA_WEBHOOK_EVENT_TYPES = [
  'checkout.session.completed',
  'invoice.paid',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const;

export type ProfileExtraWebhookEventType = (typeof PROFILE_EXTRA_WEBHOOK_EVENT_TYPES)[number];

export type ProfileExtraSubscriptionStatus = ProfileStripeSubscriptionStatus;

export interface ProfileExtraMetadata {
  billing_flow: typeof PROFILE_EXTRA_BILLING_FLOW;
  billing_reservation_id: string;
  source_profile_id: string;
  purchaser_user_id: string;
}

export interface ProfileExtraSubscriptionSnapshot {
  billingReservationId: string | null;
  checkoutSessionId: string | null;
  subscriptionId: string;
  sourceProfileId: string;
  purchaserUserId: string;
  customerId: string | null;
  priceId: string;
  status: ProfileExtraSubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface ProfileExtraSubscriptionRecord {
  id: string;
  purchasedByUserId: string;
  sourceProfileId: string | null;
  targetProfileId: string | null;
  stripeCustomerId: string | null;
  stripeCheckoutSessionId: string | null;
  checkoutExpiresAt: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string;
  status: ProfileExtraSubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  lastStripeEventId: string | null;
  lastStripeEventCreated: number | null;
}

export interface BuildProfileExtraCheckoutSessionParamsInput {
  appBaseUrl: string;
  billingReservationId: string;
  priceId: string;
  sourceProfileId: string;
  purchaserUserId: string;
  customerId?: string | null;
  customerEmail?: string | null;
}

export interface ResolveProfileExtraCheckoutEligibilityInput {
  actorUserId: string | null | undefined;
  actorIsAdmin?: boolean | null | undefined;
  sourceProfileOwnerUserId: string | null | undefined;
  sourceEntitlementPlanCode?: string | null;
}

export type ProfileExtraCheckoutEligibilityReason =
  | 'authentication_required'
  | 'source_profile_not_found'
  | 'billing_authority_required'
  | 'admin_billing_not_required'
  | 'pro_entitlement_required';

export interface ProfileExtraCheckoutEligibilityResult {
  allowed: boolean;
  reason: ProfileExtraCheckoutEligibilityReason | null;
}

export type ProfileExtraCheckoutState =
  | 'available'
  | 'checkout_pending_valid'
  | 'checkout_pending_expired'
  | 'available_paid_slot'
  | 'current_unlinked_slot';

export type ProfileExtraWebhookAction =
  | 'ignore'
  | 'sync_only'
  | 'activate_slot'
  | 'suspend_target';

export interface ProfileExtraStatusSnapshot {
  hasAvailableSlot: boolean;
  checkoutPending: boolean;
  hasLinkedExtraProfiles: boolean;
}

const DEFAULT_PROFILE_EXTRA_SUCCESS_PATH =
  '/workspace/dashboard?billing=profile-extra-processing';
const DEFAULT_PROFILE_EXTRA_CANCEL_PATH =
  '/workspace/dashboard?billing=profile-extra-cancelled';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const getOptionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const getOptionalId = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (isRecord(value)) {
    return getOptionalString(value.id);
  }

  return null;
};

const normalizeOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
};

const toIsoTimestampFromUnixSeconds = (timestamp: unknown) =>
  typeof timestamp === 'number' ? new Date(timestamp * 1000).toISOString() : null;

const normalizePlanCode = (value?: string | null) =>
  typeof value === 'string' ? value.trim().toLowerCase() : null;

export const buildProfileExtraMetadata = (input: {
  billingReservationId: string;
  sourceProfileId: string;
  purchaserUserId: string;
}): ProfileExtraMetadata => ({
  billing_flow: PROFILE_EXTRA_BILLING_FLOW,
  billing_reservation_id: input.billingReservationId,
  source_profile_id: input.sourceProfileId,
  purchaser_user_id: input.purchaserUserId,
});

export const parseProfileExtraMetadata = (metadata: unknown): ProfileExtraMetadata | null => {
  if (!isRecord(metadata)) {
    return null;
  }

  const billingFlow = getOptionalString(metadata.billing_flow);
  const billingReservationId = getOptionalString(metadata.billing_reservation_id);
  const sourceProfileId = getOptionalString(metadata.source_profile_id);
  const purchaserUserId = getOptionalString(metadata.purchaser_user_id);

  if (
    billingFlow !== PROFILE_EXTRA_BILLING_FLOW ||
    !billingReservationId ||
    !sourceProfileId ||
    !purchaserUserId
  ) {
    return null;
  }

  return {
    billing_flow: PROFILE_EXTRA_BILLING_FLOW,
    billing_reservation_id: billingReservationId,
    source_profile_id: sourceProfileId,
    purchaser_user_id: purchaserUserId,
  };
};

export const buildProfileExtraCheckoutSessionParams = (
  input: BuildProfileExtraCheckoutSessionParamsInput
) => {
  const appBaseUrl = normalizeOrigin(input.appBaseUrl);
  const metadata = buildProfileExtraMetadata({
    billingReservationId: input.billingReservationId,
    sourceProfileId: input.sourceProfileId,
    purchaserUserId: input.purchaserUserId,
  });

  const params: Record<string, unknown> = {
    mode: 'subscription',
    success_url: new URL(DEFAULT_PROFILE_EXTRA_SUCCESS_PATH, `${appBaseUrl}/`).toString(),
    cancel_url: new URL(DEFAULT_PROFILE_EXTRA_CANCEL_PATH, `${appBaseUrl}/`).toString(),
    line_items: [
      {
        price: input.priceId,
        quantity: 1,
      },
    ],
    metadata,
    subscription_data: {
      metadata,
    },
  };

  if (input.customerId) {
    params.customer = input.customerId;
  } else if (input.customerEmail) {
    params.customer_email = input.customerEmail;
  }

  return params;
};

export const resolveProfileExtraCheckoutEligibility = (
  input: ResolveProfileExtraCheckoutEligibilityInput
): ProfileExtraCheckoutEligibilityResult => {
  if (!input.actorUserId) {
    return { allowed: false, reason: 'authentication_required' };
  }

  if (!input.sourceProfileOwnerUserId) {
    return { allowed: false, reason: 'source_profile_not_found' };
  }

  if (input.sourceProfileOwnerUserId !== input.actorUserId) {
    return { allowed: false, reason: 'billing_authority_required' };
  }

  if (input.actorIsAdmin) {
    return { allowed: false, reason: 'admin_billing_not_required' };
  }

  const planCode = normalizePlanCode(input.sourceEntitlementPlanCode);
  if (planCode !== 'pro' && planCode !== 'legacy_pro') {
    return { allowed: false, reason: 'pro_entitlement_required' };
  }

  return { allowed: true, reason: null };
};

export const isProfileExtraAvailableSlot = (input: {
  status?: string | null;
  targetProfileId?: string | null;
}) => input.status === 'active' && !input.targetProfileId;

export const resolveProfileExtraCheckoutState = (input: {
  status?: string | null;
  targetProfileId?: string | null;
  checkoutExpiresAt?: string | null;
  now?: Date;
}): ProfileExtraCheckoutState => {
  if (input.status === 'checkout_pending') {
    return hasCheckoutExpired(input.checkoutExpiresAt, input.now ?? new Date())
      ? 'checkout_pending_expired'
      : 'checkout_pending_valid';
  }

  if (isProfileExtraAvailableSlot(input)) {
    return 'available_paid_slot';
  }

  if (isProfileStripeCurrentStatus(input.status) && !input.targetProfileId) {
    return 'current_unlinked_slot';
  }

  return 'available';
};

export const resolveProfileExtraStatusSnapshot = (input: {
  subscriptions: Array<Pick<ProfileExtraSubscriptionRecord, 'status' | 'targetProfileId'>>;
}): ProfileExtraStatusSnapshot => ({
  hasAvailableSlot: input.subscriptions.some((subscription) =>
    isProfileExtraAvailableSlot({
      status: subscription.status,
      targetProfileId: subscription.targetProfileId,
    })
  ),
  checkoutPending: input.subscriptions.some(
    (subscription) =>
      !subscription.targetProfileId &&
      subscription.status !== 'active' &&
      isProfileStripeCurrentStatus(subscription.status)
  ),
  hasLinkedExtraProfiles: input.subscriptions.some(
    (subscription) =>
      !!subscription.targetProfileId && isProfileStripeCurrentStatus(subscription.status)
  ),
});

export const getProfileExtraSubscriptionItemFromPayload = (
  subscription: unknown,
  expectedPriceId: string
) => {
  if (!isRecord(subscription)) {
    return null;
  }

  const items = subscription.items;
  if (!isRecord(items) || !Array.isArray(items.data)) {
    return null;
  }

  return (
    items.data.find((item) => {
      if (!isRecord(item) || !isRecord(item.price)) {
        return false;
      }

      return item.price.id === expectedPriceId;
    }) ?? null
  );
};

export const buildProfileExtraSubscriptionSnapshotFromSubscriptionPayload = (input: {
  subscription: unknown;
  expectedPriceId: string;
  fallbackMetadata?: unknown;
}): ProfileExtraSubscriptionSnapshot | null => {
  if (!isRecord(input.subscription)) {
    return null;
  }

  const metadata =
    parseProfileExtraMetadata(input.subscription.metadata) ??
    parseProfileExtraMetadata(input.fallbackMetadata);

  if (!metadata) {
    return null;
  }

  const status = normalizeProfileStripeSubscriptionStatus(
    getOptionalString(input.subscription.status)
  );
  const profileExtraItem = getProfileExtraSubscriptionItemFromPayload(
    input.subscription,
    input.expectedPriceId
  );

  if (!status || !isRecord(profileExtraItem) || !isRecord(profileExtraItem.price)) {
    return null;
  }

  const priceId = getOptionalString(profileExtraItem.price.id);
  const subscriptionId = getOptionalString(input.subscription.id);

  if (!priceId || !subscriptionId) {
    return null;
  }

  return {
    billingReservationId: metadata.billing_reservation_id,
    checkoutSessionId: null,
    subscriptionId,
    sourceProfileId: metadata.source_profile_id,
    purchaserUserId: metadata.purchaser_user_id,
    customerId: getOptionalId(input.subscription.customer),
    priceId,
    status,
    currentPeriodEnd: toIsoTimestampFromUnixSeconds(profileExtraItem.current_period_end),
    cancelAtPeriodEnd: input.subscription.cancel_at_period_end === true,
  };
};

export const resolveProfileExtraWebhookAction = (input: {
  eventType: ProfileExtraWebhookEventType;
  paymentStatus?: string | null;
  snapshot: ProfileExtraSubscriptionSnapshot;
  now?: Date;
}): ProfileExtraWebhookAction => {
  const now = input.now ?? new Date();
  const periodEnded = hasStripePeriodEnded(input.snapshot.currentPeriodEnd, now);

  if (input.eventType === 'checkout.session.completed') {
    if (
      input.paymentStatus === 'paid' &&
      isProvisionableProfileStripeStatus(input.snapshot.status)
    ) {
      return 'activate_slot';
    }

    return 'sync_only';
  }

  if (input.eventType === 'invoice.paid') {
    return input.snapshot.status === 'active' ? 'activate_slot' : 'sync_only';
  }

  if (input.eventType === 'customer.subscription.deleted') {
    return 'suspend_target';
  }

  if (isProvisionableProfileStripeStatus(input.snapshot.status)) {
    return 'activate_slot';
  }

  if (input.snapshot.cancelAtPeriodEnd && !periodEnded) {
    return 'sync_only';
  }

  if (input.snapshot.status === 'unpaid') {
    return 'suspend_target';
  }

  if (isGraceProfileStripeStatus(input.snapshot.status) && !periodEnded) {
    return 'sync_only';
  }

  if (isTerminalProfileStripeStatus(input.snapshot.status) || periodEnded) {
    return 'suspend_target';
  }

  return 'sync_only';
};

export const shouldDowngradeProfileExtraEntitlementOnTermination = (input: {
  currentEntitlementSource?: string | null;
  currentEntitlementSubscriptionRef?: string | null;
  endingStripeSubscriptionId: string;
}) =>
  input.currentEntitlementSource === 'stripe' &&
  input.currentEntitlementSubscriptionRef === input.endingStripeSubscriptionId;

export {
  getSubscriptionIdFromInvoicePayload,
  hasCheckoutExpired,
  resolveProfileStripeOrderingDecision,
  type ProfileStripeOrderingDecision,
};
