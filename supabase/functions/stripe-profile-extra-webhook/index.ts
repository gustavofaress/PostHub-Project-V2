import Stripe from 'npm:stripe@20.4.1';

import type { ProfileEntitlementRecord } from '../../../shared/profile-entitlements.ts';
import {
  buildProfileExtraSubscriptionSnapshotFromSubscriptionPayload,
  getSubscriptionIdFromInvoicePayload,
  type ProfileExtraSubscriptionRecord,
  type ProfileExtraSubscriptionSnapshot,
  type ProfileExtraSubscriptionStatus,
  type ProfileExtraWebhookEventType,
} from '../../../shared/profile-extra-subscriptions.ts';
import { processProfileExtraWebhookEvent } from '../_shared/stripe/profile-extra.ts';
import { createAdminClient, createStripeClient, jsonResponse } from '../_shared/stripe/runtime.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_PROFILE_EXTRA_WEBHOOK_SECRET =
  Deno.env.get('STRIPE_PROFILE_EXTRA_WEBHOOK_SECRET') ?? '';
const STRIPE_PRICE_PROFILE_EXTRA_V1 = Deno.env.get('STRIPE_PRICE_PROFILE_EXTRA_V1') ?? '';

type StripeAdminClient = ReturnType<typeof createAdminClient>;

interface ProfileExtraSubscriptionRow {
  id: string;
  purchased_by_user_id: string;
  source_profile_id: string | null;
  target_profile_id: string | null;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  checkout_expires_at: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string;
  status: ProfileExtraSubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  last_stripe_event_id: string | null;
  last_stripe_event_created: number | null;
}

function mapSubscriptionRow(row: ProfileExtraSubscriptionRow): ProfileExtraSubscriptionRecord {
  return {
    id: row.id,
    purchasedByUserId: row.purchased_by_user_id,
    sourceProfileId: row.source_profile_id,
    targetProfileId: row.target_profile_id,
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

function buildSnapshotFromSubscription(
  subscription: Stripe.Subscription,
  expectedPriceId: string,
  fallbackMetadata?: Record<string, string> | null
): ProfileExtraSubscriptionSnapshot | null {
  return buildProfileExtraSubscriptionSnapshotFromSubscriptionPayload({
    subscription,
    expectedPriceId,
    fallbackMetadata: fallbackMetadata ?? undefined,
  });
}

async function retrieveSubscription(stripe: Stripe, subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

async function loadSourceProfileById(adminClient: StripeAdminClient, profileId: string) {
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
): Promise<ProfileExtraSubscriptionRecord | null> {
  const { data, error } = await adminClient
    .from('profile_extra_subscriptions')
    .select(
      [
        'id',
        'purchased_by_user_id',
        'source_profile_id',
        'target_profile_id',
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

  return data ? mapSubscriptionRow(data as ProfileExtraSubscriptionRow) : null;
}

async function loadSubscriptionByCheckoutSessionId(
  adminClient: StripeAdminClient,
  stripeCheckoutSessionId: string
): Promise<ProfileExtraSubscriptionRecord | null> {
  const { data, error } = await adminClient
    .from('profile_extra_subscriptions')
    .select(
      [
        'id',
        'purchased_by_user_id',
        'source_profile_id',
        'target_profile_id',
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

  return data ? mapSubscriptionRow(data as ProfileExtraSubscriptionRow) : null;
}

async function loadSubscriptionByReservationId(
  adminClient: StripeAdminClient,
  reservationId: string
): Promise<ProfileExtraSubscriptionRecord | null> {
  const { data, error } = await adminClient
    .from('profile_extra_subscriptions')
    .select(
      [
        'id',
        'purchased_by_user_id',
        'source_profile_id',
        'target_profile_id',
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

  return data ? mapSubscriptionRow(data as ProfileExtraSubscriptionRow) : null;
}

async function saveSubscriptionRecord(
  adminClient: StripeAdminClient,
  record: ProfileExtraSubscriptionRecord
) {
  const payload = {
    id: record.id,
    purchased_by_user_id: record.purchasedByUserId,
    source_profile_id: record.sourceProfileId,
    target_profile_id: record.targetProfileId,
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
    .from('profile_extra_subscriptions')
    .upsert(payload, {
      onConflict: 'id',
    })
    .select(
      [
        'id',
        'purchased_by_user_id',
        'source_profile_id',
        'target_profile_id',
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

  return mapSubscriptionRow(data as ProfileExtraSubscriptionRow);
}

async function updateTargetProfileActive(
  adminClient: StripeAdminClient,
  profileId: string,
  isActive: boolean
) {
  const { error } = await adminClient
    .from('client_profiles')
    .update({ is_active: isActive })
    .eq('id', profileId);

  if (error) {
    throw error;
  }
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
  snapshot: ProfileExtraSubscriptionSnapshot | null;
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
    const snapshot = buildSnapshotFromSubscription(
      subscription,
      STRIPE_PRICE_PROFILE_EXTRA_V1,
      session.metadata ?? null
    );

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
    const subscriptionId = getSubscriptionIdFromInvoicePayload(invoice);

    if (!subscriptionId) {
      return { snapshot: null, paymentStatus: invoice.paid ? 'paid' : invoice.status ?? null };
    }

    const subscription = await retrieveSubscription(stripe, subscriptionId);
    return {
      snapshot: buildSnapshotFromSubscription(subscription, STRIPE_PRICE_PROFILE_EXTRA_V1),
      paymentStatus: invoice.paid ? 'paid' : invoice.status ?? null,
    };
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    return {
      snapshot: buildSnapshotFromSubscription(
        event.data.object as Stripe.Subscription,
        STRIPE_PRICE_PROFILE_EXTRA_V1
      ),
      paymentStatus: null,
    };
  }

  return { snapshot: null, paymentStatus: null };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  if (!STRIPE_SECRET_KEY || !STRIPE_PROFILE_EXTRA_WEBHOOK_SECRET || !STRIPE_PRICE_PROFILE_EXTRA_V1) {
    console.error('[stripe-profile-extra-webhook] missing Stripe configuration');
    return jsonResponse({ error: 'Webhook not configured.' }, 500);
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return jsonResponse({ error: 'Missing Stripe signature.' }, 400);
  }

  const stripe = createStripeClient(STRIPE_SECRET_KEY);
  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      STRIPE_PROFILE_EXTRA_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('[stripe-profile-extra-webhook] invalid signature', error);
    return jsonResponse({ error: 'Invalid Stripe signature.' }, 400);
  }

  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'invoice.paid' &&
    event.type !== 'customer.subscription.updated' &&
    event.type !== 'customer.subscription.deleted'
  ) {
    return jsonResponse({ received: true, ignored: true });
  }

  try {
    const adminClient = createAdminClient();
    const { snapshot, paymentStatus } = await resolveEventSnapshot(stripe, event);

    if (!snapshot) {
      return jsonResponse({ received: true, ignored: true });
    }

    const result = await processProfileExtraWebhookEvent({
      eventId: event.id,
      eventCreated: event.created,
      eventType: event.type as ProfileExtraWebhookEventType,
      paymentStatus,
      snapshot,
      loadSourceProfileById: (profileId) => loadSourceProfileById(adminClient, profileId),
      loadSubscriptionByStripeId: (stripeSubscriptionId) =>
        loadSubscriptionByStripeId(adminClient, stripeSubscriptionId),
      loadSubscriptionByCheckoutSessionId: (stripeCheckoutSessionId) =>
        loadSubscriptionByCheckoutSessionId(adminClient, stripeCheckoutSessionId),
      loadSubscriptionByReservationId: (reservationId) =>
        loadSubscriptionByReservationId(adminClient, reservationId),
      loadCurrentEntitlementByProfileId: (profileId) =>
        loadCurrentEntitlementByProfileId(adminClient, profileId),
      saveSubscriptionRecord: (record) => saveSubscriptionRecord(adminClient, record),
      updateTargetProfileActive: (profileId, isActive) =>
        updateTargetProfileActive(adminClient, profileId, isActive),
      upsertProfileEntitlement: (record) => upsertProfileEntitlement(adminClient, record),
    });

    return jsonResponse({
      received: true,
      handled: result.handled,
      action: result.action,
      reason: result.reason,
    });
  } catch (error) {
    console.error('[stripe-profile-extra-webhook] processing failed', error);
    return jsonResponse(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Could not process Stripe profile extra event.',
      },
      400
    );
  }
});
