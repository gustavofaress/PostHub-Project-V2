import Stripe from 'npm:stripe@17.7.0';

import type { ProfileEntitlementRecord } from '../../../shared/profile-entitlements.ts';
import {
  isProfileProPrice,
  parseProfileProMetadata,
  type ProfileStripeSubscriptionRecord,
  type ProfileStripeSubscriptionSnapshot,
  type ProfileStripeSubscriptionStatus,
  type ProfileProWebhookEventType,
} from '../../../shared/profile-stripe-subscriptions.ts';
import { processProfileProWebhookEvent } from '../_shared/stripe/profile-pro.ts';
import { createAdminClient, createStripeClient, jsonResponse } from '../_shared/stripe/runtime.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_PROFILE_WEBHOOK_SECRET = Deno.env.get('STRIPE_PROFILE_WEBHOOK_SECRET') ?? '';
const STRIPE_PRICE_PROFILE_PRO = Deno.env.get('STRIPE_PRICE_PROFILE_PRO') ?? '';

type StripeAdminClient = ReturnType<typeof createAdminClient>;

interface ProfileStripeSubscriptionRow {
  id: string;
  profile_id: string;
  purchased_by_user_id: string;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  checkout_expires_at: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string;
  status: ProfileStripeSubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  last_stripe_event_id: string | null;
  last_stripe_event_created: number | null;
}

function normalizeProfileStripeSubscriptionStatus(
  status: string | null | undefined
): ProfileStripeSubscriptionStatus | null {
  if (
    status === 'checkout_pending' ||
    status === 'incomplete' ||
    status === 'incomplete_expired' ||
    status === 'trialing' ||
    status === 'active' ||
    status === 'past_due' ||
    status === 'canceled' ||
    status === 'unpaid' ||
    status === 'paused'
  ) {
    return status;
  }

  return null;
}

function getPrimaryPriceIdFromSubscription(subscription: Stripe.Subscription) {
  return subscription.items.data.find((item) => typeof item.price?.id === 'string')?.price?.id ?? null;
}

function toIsoTimestamp(timestamp?: number | null) {
  if (typeof timestamp !== 'number') {
    return null;
  }

  return new Date(timestamp * 1000).toISOString();
}

function buildSnapshotFromSubscription(
  subscription: Stripe.Subscription,
  fallbackMetadata?: Record<string, string> | null
): ProfileStripeSubscriptionSnapshot | null {
  const metadata =
    parseProfileProMetadata(subscription.metadata) ??
    parseProfileProMetadata(fallbackMetadata ?? undefined);

  if (!metadata) {
    return null;
  }

  const status = normalizeProfileStripeSubscriptionStatus(subscription.status);
  const priceId = getPrimaryPriceIdFromSubscription(subscription);

  if (!status || !priceId) {
    return null;
  }

  return {
    billingReservationId: metadata.billing_reservation_id,
    checkoutSessionId: null,
    subscriptionId: subscription.id,
    profileId: metadata.profile_id,
    purchaserUserId: metadata.purchaser_user_id,
    customerId:
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id ?? null,
    priceId,
    status,
    currentPeriodEnd: toIsoTimestamp(subscription.current_period_end),
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
  };
}

async function retrieveSubscription(
  stripe: Stripe,
  subscriptionId: string
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

async function loadProfileById(adminClient: StripeAdminClient, profileId: string) {
  const { data, error } = await adminClient
    .from('client_profiles')
    .select('id')
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data && typeof data.id === 'string' ? { id: data.id } : null;
}

async function loadCurrentEntitlementByProfileId(
  adminClient: StripeAdminClient,
  profileId: string
) {
  const { data, error } = await adminClient
    .from('profile_entitlements')
    .select('plan_code, source, subscription_ref')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Pick<ProfileEntitlementRecord, 'plan_code' | 'source' | 'subscription_ref'> | null) ?? null;
}

async function loadSubscriptionByStripeId(
  adminClient: StripeAdminClient,
  stripeSubscriptionId: string
): Promise<ProfileStripeSubscriptionRecord | null> {
  const { data, error } = await adminClient
    .from('profile_stripe_subscriptions')
    .select(
      [
        'id',
        'profile_id',
        'purchased_by_user_id',
        'stripe_customer_id',
        'stripe_checkout_session_id',
        'checkout_expires_at',
        'stripe_subscription_id',
        'stripe_price_id',
        'status',
        'current_period_end',
        'cancel_at_period_end',
        'last_stripe_event_id',
        'last_stripe_event_created',
      ].join(', ')
    )
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    profileId: data.profile_id,
    purchasedByUserId: data.purchased_by_user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeCheckoutSessionId: data.stripe_checkout_session_id,
    checkoutExpiresAt: data.checkout_expires_at,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripePriceId: data.stripe_price_id,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    lastStripeEventId: data.last_stripe_event_id,
    lastStripeEventCreated: data.last_stripe_event_created,
  };
}

async function loadSubscriptionByCheckoutSessionId(
  adminClient: StripeAdminClient,
  stripeCheckoutSessionId: string
): Promise<ProfileStripeSubscriptionRecord | null> {
  const { data, error } = await adminClient
    .from('profile_stripe_subscriptions')
    .select(
      [
        'id',
        'profile_id',
        'purchased_by_user_id',
        'stripe_customer_id',
        'stripe_checkout_session_id',
        'checkout_expires_at',
        'stripe_subscription_id',
        'stripe_price_id',
        'status',
        'current_period_end',
        'cancel_at_period_end',
        'last_stripe_event_id',
        'last_stripe_event_created',
      ].join(', ')
    )
    .eq('stripe_checkout_session_id', stripeCheckoutSessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    profileId: data.profile_id,
    purchasedByUserId: data.purchased_by_user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeCheckoutSessionId: data.stripe_checkout_session_id,
    checkoutExpiresAt: data.checkout_expires_at,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripePriceId: data.stripe_price_id,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    lastStripeEventId: data.last_stripe_event_id,
    lastStripeEventCreated: data.last_stripe_event_created,
  };
}

async function loadSubscriptionByReservationId(
  adminClient: StripeAdminClient,
  reservationId: string
): Promise<ProfileStripeSubscriptionRecord | null> {
  const { data, error } = await adminClient
    .from('profile_stripe_subscriptions')
    .select(
      [
        'id',
        'profile_id',
        'purchased_by_user_id',
        'stripe_customer_id',
        'stripe_checkout_session_id',
        'checkout_expires_at',
        'stripe_subscription_id',
        'stripe_price_id',
        'status',
        'current_period_end',
        'cancel_at_period_end',
        'last_stripe_event_id',
        'last_stripe_event_created',
      ].join(', ')
    )
    .eq('id', reservationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    profileId: data.profile_id,
    purchasedByUserId: data.purchased_by_user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeCheckoutSessionId: data.stripe_checkout_session_id,
    checkoutExpiresAt: data.checkout_expires_at,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripePriceId: data.stripe_price_id,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    lastStripeEventId: data.last_stripe_event_id,
    lastStripeEventCreated: data.last_stripe_event_created,
  };
}

async function loadActiveConflictByProfileId(
  adminClient: StripeAdminClient,
  profileId: string,
  currentRecordId: string | null
) {
  let query = adminClient
    .from('profile_stripe_subscriptions')
    .select('id, profile_id, stripe_subscription_id, status')
    .eq('profile_id', profileId)
    .in('status', ['checkout_pending', 'incomplete', 'trialing', 'active', 'past_due', 'paused']);

  if (currentRecordId) {
    query = query.neq('id', currentRecordId);
  }

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    profileId: data.profile_id,
    stripeSubscriptionId: data.stripe_subscription_id ?? '',
    status: data.status,
  };
}

async function saveSubscriptionRecord(
  adminClient: StripeAdminClient,
  record: ProfileStripeSubscriptionRecord
) {
  const payload = {
    id: record.id,
    profile_id: record.profileId,
    purchased_by_user_id: record.purchasedByUserId,
    stripe_customer_id: record.stripeCustomerId,
    stripe_checkout_session_id: record.stripeCheckoutSessionId,
    checkout_expires_at: record.checkoutExpiresAt,
    stripe_subscription_id: record.stripeSubscriptionId,
    stripe_price_id: record.stripePriceId,
    status: record.status,
    current_period_end: record.currentPeriodEnd,
    cancel_at_period_end: record.cancelAtPeriodEnd,
    last_stripe_event_id: record.lastStripeEventId,
    last_stripe_event_created: record.lastStripeEventCreated,
  };

  const { data, error } = await adminClient
    .from('profile_stripe_subscriptions')
    .upsert(payload, {
      onConflict: 'id',
    })
    .select(
      [
        'id',
        'profile_id',
        'purchased_by_user_id',
        'stripe_customer_id',
        'stripe_checkout_session_id',
        'checkout_expires_at',
        'stripe_subscription_id',
        'stripe_price_id',
        'status',
        'current_period_end',
        'cancel_at_period_end',
        'last_stripe_event_id',
        'last_stripe_event_created',
      ].join(', ')
    )
    .single();

  if (error) {
    throw error;
  }

  const row = data as ProfileStripeSubscriptionRow;

  return {
    id: row.id,
    profileId: row.profile_id,
    purchasedByUserId: row.purchased_by_user_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    checkoutExpiresAt: row.checkout_expires_at,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripePriceId: row.stripe_price_id,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    lastStripeEventId: row.last_stripe_event_id,
    lastStripeEventCreated: row.last_stripe_event_created,
  };
}

async function upsertProfileEntitlement(
  adminClient: StripeAdminClient,
  record: ProfileEntitlementRecord
) {
  const { error } = await adminClient.from('profile_entitlements').upsert(
    {
      profile_id: record.profile_id,
      plan_code: record.plan_code,
      source: record.source,
      subscription_ref: record.subscription_ref,
      effective_from: record.effective_from,
      effective_until: record.effective_until,
      ideas_enabled: record.ideas_enabled,
      calendar_enabled: record.calendar_enabled,
      kanban_enabled: record.kanban_enabled,
      references_enabled: record.references_enabled,
      metrics_enabled: record.metrics_enabled,
      social_analytics_enabled: record.social_analytics_enabled,
      approval_enabled: record.approval_enabled,
      approval_link_creation_enabled: record.approval_link_creation_enabled,
      reports_enabled: record.reports_enabled,
      max_additional_members: record.max_additional_members,
    },
    { onConflict: 'profile_id' }
  );

  if (error) {
    throw error;
  }
}

async function resolveEventSnapshot(
  stripe: Stripe,
  event: Stripe.Event
): Promise<{
  snapshot: ProfileStripeSubscriptionSnapshot | null;
  paymentStatus: string | null;
}> {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null;

    if (!subscriptionId) {
      return { snapshot: null, paymentStatus: session.payment_status ?? null };
    }

    const subscription = await retrieveSubscription(stripe, subscriptionId);
    const snapshot = buildSnapshotFromSubscription(subscription, session.metadata ?? null);
    return {
      snapshot: snapshot
        ? {
            ...snapshot,
            checkoutSessionId: session.id,
          }
        : null,
      paymentStatus: session.payment_status ?? null,
    };
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id ?? null;

    if (!subscriptionId) {
      return { snapshot: null, paymentStatus: invoice.paid ? 'paid' : invoice.status ?? null };
    }

    const subscription = await retrieveSubscription(stripe, subscriptionId);
    return {
      snapshot: buildSnapshotFromSubscription(subscription),
      paymentStatus: invoice.paid ? 'paid' : invoice.status ?? null,
    };
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    return {
      snapshot: buildSnapshotFromSubscription(subscription),
      paymentStatus: null,
    };
  }

  return { snapshot: null, paymentStatus: null };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    if (!STRIPE_SECRET_KEY || !STRIPE_PROFILE_WEBHOOK_SECRET || !STRIPE_PRICE_PROFILE_PRO) {
      throw new Error('Stripe profile webhook is not configured.');
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return jsonResponse({ error: 'Missing Stripe signature.' }, 400);
    }

    const stripe = createStripeClient(STRIPE_SECRET_KEY);
    const adminClient = createAdminClient();
    const body = await request.text();

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_PROFILE_WEBHOOK_SECRET
    );

    if (
      event.type !== 'checkout.session.completed' &&
      event.type !== 'invoice.paid' &&
      event.type !== 'customer.subscription.updated' &&
      event.type !== 'customer.subscription.deleted'
    ) {
      return jsonResponse({ received: true, ignored: event.type });
    }

    const { snapshot, paymentStatus } = await resolveEventSnapshot(stripe, event);

    if (!snapshot || !isProfileProPrice(snapshot.priceId, STRIPE_PRICE_PROFILE_PRO)) {
      return jsonResponse({ received: true, ignored: 'non_profile_pro_flow' });
    }

    const result = await processProfileProWebhookEvent({
      eventId: event.id,
      eventCreated: event.created,
      eventType: event.type as ProfileProWebhookEventType,
      paymentStatus,
      snapshot,
      loadProfileById: (profileId) => loadProfileById(adminClient, profileId),
      loadSubscriptionByStripeId: (stripeSubscriptionId) =>
        loadSubscriptionByStripeId(adminClient, stripeSubscriptionId),
      loadSubscriptionByCheckoutSessionId: (stripeCheckoutSessionId) =>
        loadSubscriptionByCheckoutSessionId(adminClient, stripeCheckoutSessionId),
      loadSubscriptionByReservationId: (reservationId) =>
        loadSubscriptionByReservationId(adminClient, reservationId),
      loadCurrentEntitlementByProfileId: (profileId) =>
        loadCurrentEntitlementByProfileId(adminClient, profileId),
      loadActiveConflictByProfileId: (profileId, currentRecordId) =>
        loadActiveConflictByProfileId(adminClient, profileId, currentRecordId),
      saveSubscriptionRecord: (record) => saveSubscriptionRecord(adminClient, record),
      upsertProfileEntitlement: (record) => upsertProfileEntitlement(adminClient, record),
    });

    return jsonResponse({
      received: true,
      action: result.action,
      handled: result.handled,
      reason: result.reason,
      profileId: snapshot.profileId,
      stripeSubscriptionId: snapshot.subscriptionId,
    });
  } catch (error) {
    console.error(
      '[stripe-profile-entitlement-webhook] error:',
      error instanceof Error ? error.message : error
    );

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    );
  }
});
