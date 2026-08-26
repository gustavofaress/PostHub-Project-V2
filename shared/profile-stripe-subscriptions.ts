export const PROFILE_PRO_BILLING_FLOW = 'profile_pro_v1' as const;

export const PROFILE_PRO_WEBHOOK_EVENT_TYPES = [
  'checkout.session.completed',
  'invoice.paid',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const;

export type ProfileProWebhookEventType = (typeof PROFILE_PRO_WEBHOOK_EVENT_TYPES)[number];

export const PROFILE_STRIPE_SUBSCRIPTION_STATUSES = [
  'checkout_pending',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
] as const;

export type ProfileStripeSubscriptionStatus =
  (typeof PROFILE_STRIPE_SUBSCRIPTION_STATUSES)[number];

export const PROFILE_STRIPE_CURRENT_STATUSES = [
  'checkout_pending',
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'paused',
] as const;

export type ProfileStripeCurrentStatus = (typeof PROFILE_STRIPE_CURRENT_STATUSES)[number];

export interface ProfileProMetadata {
  billing_flow: typeof PROFILE_PRO_BILLING_FLOW;
  billing_reservation_id: string;
  profile_id: string;
  purchaser_user_id: string;
}

export interface ProfileStripeSubscriptionSnapshot {
  billingReservationId: string | null;
  checkoutSessionId: string | null;
  subscriptionId: string;
  profileId: string;
  purchaserUserId: string;
  customerId: string | null;
  priceId: string;
  status: ProfileStripeSubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface ProfileStripeSubscriptionRecord {
  id: string;
  profileId: string;
  purchasedByUserId: string;
  stripeCustomerId: string | null;
  stripeCheckoutSessionId: string | null;
  checkoutExpiresAt: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string;
  status: ProfileStripeSubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  lastStripeEventId: string | null;
  lastStripeEventCreated: number | null;
}

export interface BuildProfileProCheckoutSessionParamsInput {
  appBaseUrl: string;
  billingReservationId: string;
  priceId: string;
  profileId: string;
  purchaserUserId: string;
  customerId?: string | null;
  customerEmail?: string | null;
}

export interface ResolveProfileProCheckoutEligibilityInput {
  actorUserId: string | null | undefined;
  actorIsAdmin?: boolean | null | undefined;
  profileOwnerUserId: string | null | undefined;
  currentEntitlementPlanCode?: string | null;
}

export type ProfileProCheckoutEligibilityReason =
  | 'authentication_required'
  | 'profile_not_found'
  | 'billing_authority_required'
  | 'admin_billing_not_required'
  | 'free_entitlement_required';

export interface ProfileProCheckoutEligibilityResult {
  allowed: boolean;
  reason: ProfileProCheckoutEligibilityReason | null;
}

export type ProfileStripeOrderingDecision =
  | 'apply'
  | 'duplicate'
  | 'ignore_older_event'
  | 'ignore_terminal_regression';

export type ProfileStripeWebhookAction =
  | 'ignore'
  | 'sync_only'
  | 'provision_pro'
  | 'downgrade_to_free';

export type ProfileStripeCheckoutState =
  | 'available'
  | 'checkout_pending_valid'
  | 'checkout_pending_expired'
  | 'current_subscription';

const DEFAULT_PROFILE_PRO_SUCCESS_PATH = '/workspace/dashboard?billing=profile-pro-processing';
const DEFAULT_PROFILE_PRO_CANCEL_PATH = '/workspace/dashboard?billing=profile-pro-cancelled';

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

export const buildProfileProMetadata = (input: {
  billingReservationId: string;
  profileId: string;
  purchaserUserId: string;
}): ProfileProMetadata => ({
  billing_flow: PROFILE_PRO_BILLING_FLOW,
  billing_reservation_id: input.billingReservationId,
  profile_id: input.profileId,
  purchaser_user_id: input.purchaserUserId,
});

export const parseProfileProMetadata = (metadata: unknown): ProfileProMetadata | null => {
  if (!isRecord(metadata)) {
    return null;
  }

  const billingFlow = getOptionalString(metadata.billing_flow);
  const billingReservationId = getOptionalString(metadata.billing_reservation_id);
  const profileId = getOptionalString(metadata.profile_id);
  const purchaserUserId = getOptionalString(metadata.purchaser_user_id);

  if (
    billingFlow !== PROFILE_PRO_BILLING_FLOW ||
    !billingReservationId ||
    !profileId ||
    !purchaserUserId
  ) {
    return null;
  }

  return {
    billing_flow: PROFILE_PRO_BILLING_FLOW,
    billing_reservation_id: billingReservationId,
    profile_id: profileId,
    purchaser_user_id: purchaserUserId,
  };
};

export const normalizeProfileStripeSubscriptionStatus = (
  status: string | null | undefined
): ProfileStripeSubscriptionStatus | null => {
  return PROFILE_STRIPE_SUBSCRIPTION_STATUSES.includes(
    status as ProfileStripeSubscriptionStatus
  )
    ? (status as ProfileStripeSubscriptionStatus)
    : null;
};

export const isProfileProPrice = (priceId: string | null | undefined, expectedPriceId: string) =>
  !!priceId && !!expectedPriceId && priceId === expectedPriceId;

export const isProfileStripeCurrentStatus = (
  status: string | null | undefined
): status is ProfileStripeCurrentStatus =>
  PROFILE_STRIPE_CURRENT_STATUSES.includes(status as ProfileStripeCurrentStatus);

export const isProvisionableProfileStripeStatus = (
  status: string | null | undefined
): status is 'active' => status === 'active';

export const isGraceProfileStripeStatus = (
  status: string | null | undefined
): status is 'past_due' | 'paused' => status === 'past_due' || status === 'paused';

export const isTerminalProfileStripeStatus = (
  status: string | null | undefined
): status is 'canceled' | 'incomplete_expired' | 'unpaid' =>
  status === 'canceled' || status === 'incomplete_expired' || status === 'unpaid';

export const hasStripePeriodEnded = (
  currentPeriodEnd: string | null | undefined,
  now = new Date()
) => {
  if (!currentPeriodEnd) {
    return false;
  }

  const timestamp = Date.parse(currentPeriodEnd);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp <= now.getTime();
};

export const hasCheckoutExpired = (
  checkoutExpiresAt: string | null | undefined,
  now = new Date()
) => {
  if (!checkoutExpiresAt) {
    return false;
  }

  const timestamp = Date.parse(checkoutExpiresAt);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp <= now.getTime();
};

const toIsoTimestampFromUnixSeconds = (timestamp: unknown) => {
  return typeof timestamp === 'number' ? new Date(timestamp * 1000).toISOString() : null;
};

export const getSubscriptionIdFromInvoicePayload = (invoice: unknown) => {
  if (!isRecord(invoice)) {
    return null;
  }

  const parent = invoice.parent;
  if (isRecord(parent) && parent.type === 'subscription_details') {
    const subscriptionDetails = parent.subscription_details;
    if (isRecord(subscriptionDetails)) {
      const subscriptionId = getOptionalId(subscriptionDetails.subscription);
      if (subscriptionId) {
        return subscriptionId;
      }
    }
  }

  return getOptionalId(invoice.subscription);
};

export const getProfileProSubscriptionItemFromPayload = (
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

export const buildProfileStripeSubscriptionSnapshotFromSubscriptionPayload = (input: {
  subscription: unknown;
  expectedPriceId: string;
  fallbackMetadata?: unknown;
}): ProfileStripeSubscriptionSnapshot | null => {
  if (!isRecord(input.subscription)) {
    return null;
  }

  const metadata =
    parseProfileProMetadata(input.subscription.metadata) ??
    parseProfileProMetadata(input.fallbackMetadata);

  if (!metadata) {
    return null;
  }

  const status = normalizeProfileStripeSubscriptionStatus(
    getOptionalString(input.subscription.status)
  );
  const profileProItem = getProfileProSubscriptionItemFromPayload(
    input.subscription,
    input.expectedPriceId
  );

  if (!status || !isRecord(profileProItem) || !isRecord(profileProItem.price)) {
    return null;
  }

  const priceId = getOptionalString(profileProItem.price.id);
  const subscriptionId = getOptionalString(input.subscription.id);

  if (!priceId || !subscriptionId) {
    return null;
  }

  return {
    billingReservationId: metadata.billing_reservation_id,
    checkoutSessionId: null,
    subscriptionId,
    profileId: metadata.profile_id,
    purchaserUserId: metadata.purchaser_user_id,
    customerId: getOptionalId(input.subscription.customer),
    priceId,
    status,
    currentPeriodEnd: toIsoTimestampFromUnixSeconds(profileProItem.current_period_end),
    cancelAtPeriodEnd: input.subscription.cancel_at_period_end === true,
  };
};

export const buildProfileProCheckoutSessionParams = (
  input: BuildProfileProCheckoutSessionParamsInput
) => {
  const appBaseUrl = normalizeOrigin(input.appBaseUrl);
  const metadata = buildProfileProMetadata({
    billingReservationId: input.billingReservationId,
    profileId: input.profileId,
    purchaserUserId: input.purchaserUserId,
  });

  const params: Record<string, unknown> = {
    mode: 'subscription',
    success_url: new URL(DEFAULT_PROFILE_PRO_SUCCESS_PATH, `${appBaseUrl}/`).toString(),
    cancel_url: new URL(DEFAULT_PROFILE_PRO_CANCEL_PATH, `${appBaseUrl}/`).toString(),
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

export const resolveProfileProCheckoutEligibility = (
  input: ResolveProfileProCheckoutEligibilityInput
): ProfileProCheckoutEligibilityResult => {
  if (!input.actorUserId) {
    return { allowed: false, reason: 'authentication_required' };
  }

  if (!input.profileOwnerUserId) {
    return { allowed: false, reason: 'profile_not_found' };
  }

  if (input.profileOwnerUserId !== input.actorUserId) {
    return { allowed: false, reason: 'billing_authority_required' };
  }

  if (input.actorIsAdmin) {
    return { allowed: false, reason: 'admin_billing_not_required' };
  }

  if (input.currentEntitlementPlanCode !== 'free') {
    return { allowed: false, reason: 'free_entitlement_required' };
  }

  return { allowed: true, reason: null };
};

export const resolveProfileStripeCheckoutState = (input: {
  status: string | null | undefined;
  checkoutExpiresAt?: string | null | undefined;
  now?: Date;
}): ProfileStripeCheckoutState => {
  if (input.status === 'checkout_pending') {
    return hasCheckoutExpired(input.checkoutExpiresAt, input.now ?? new Date())
      ? 'checkout_pending_expired'
      : 'checkout_pending_valid';
  }

  if (isProfileStripeCurrentStatus(input.status)) {
    return 'current_subscription';
  }

  return 'available';
};

export const resolveProfileStripeOrderingDecision = (input: {
  existing: Pick<
    ProfileStripeSubscriptionRecord,
    'status' | 'lastStripeEventId' | 'lastStripeEventCreated'
  > | null;
  incomingEventId: string;
  incomingEventCreated: number;
  incomingStatus: ProfileStripeSubscriptionStatus;
}): ProfileStripeOrderingDecision => {
  if (!input.existing?.lastStripeEventId) {
    return 'apply';
  }

  if (input.existing.lastStripeEventId === input.incomingEventId) {
    return 'duplicate';
  }

  const lastCreated = input.existing.lastStripeEventCreated;
  if (typeof lastCreated !== 'number') {
    return 'apply';
  }

  if (input.incomingEventCreated < lastCreated) {
    return 'ignore_older_event';
  }

  if (
    input.incomingEventCreated === lastCreated &&
    isTerminalProfileStripeStatus(input.existing.status) &&
    !isTerminalProfileStripeStatus(input.incomingStatus)
  ) {
    return 'ignore_terminal_regression';
  }

  return 'apply';
};

export const resolveProfileStripeWebhookAction = (input: {
  eventType: ProfileProWebhookEventType;
  paymentStatus?: string | null;
  snapshot: ProfileStripeSubscriptionSnapshot;
  now?: Date;
}): ProfileStripeWebhookAction => {
  const now = input.now ?? new Date();
  const periodEnded = hasStripePeriodEnded(input.snapshot.currentPeriodEnd, now);

  if (input.eventType === 'checkout.session.completed') {
    if (
      input.paymentStatus === 'paid' &&
      isProvisionableProfileStripeStatus(input.snapshot.status)
    ) {
      return 'provision_pro';
    }

    return 'sync_only';
  }

  if (input.eventType === 'invoice.paid') {
    if (input.snapshot.status === 'active') {
      return 'provision_pro';
    }

    return 'sync_only';
  }

  if (input.eventType === 'customer.subscription.deleted') {
    return 'downgrade_to_free';
  }

  if (isProvisionableProfileStripeStatus(input.snapshot.status)) {
    return 'provision_pro';
  }

  if (input.snapshot.cancelAtPeriodEnd && !periodEnded) {
    return 'sync_only';
  }

  if (input.snapshot.status === 'unpaid') {
    return 'downgrade_to_free';
  }

  if (isGraceProfileStripeStatus(input.snapshot.status) && !periodEnded) {
    return 'sync_only';
  }

  if (isTerminalProfileStripeStatus(input.snapshot.status) || periodEnded) {
    return 'downgrade_to_free';
  }

  return 'sync_only';
};

export const shouldMaterializeFreeEntitlementOnStripeTermination = (input: {
  currentEntitlementSource?: string | null;
  currentEntitlementSubscriptionRef?: string | null;
  endingStripeSubscriptionId: string;
}) => {
  return (
    input.currentEntitlementSource === 'stripe' &&
    input.currentEntitlementSubscriptionRef === input.endingStripeSubscriptionId
  );
};
