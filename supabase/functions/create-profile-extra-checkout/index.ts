import Stripe from 'npm:stripe@20.4.1';

import { corsHeaders } from '../_shared/cors.ts';
import { runCreateProfileExtraCheckout } from '../_shared/stripe/profile-extra.ts';
import {
  createStripeClient,
  getAppBaseUrl,
  jsonResponse,
  requireAuthenticatedUser,
} from '../_shared/stripe/runtime.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_PRICE_PROFILE_EXTRA_V1 = Deno.env.get('STRIPE_PRICE_PROFILE_EXTRA_V1') ?? '';

interface CreateProfileExtraCheckoutPayload {
  sourceProfileId?: string;
}

interface SourceProfileRow {
  id: string;
  user_id: string;
}

interface ExtraSubscriptionStateRow {
  id: string;
  status: string;
  target_profile_id: string | null;
  stripe_checkout_session_id: string | null;
  checkout_expires_at: string | null;
}

type AuthenticatedContext = Awaited<ReturnType<typeof requireAuthenticatedUser>>;

async function loadCheckoutSourceProfile(
  adminClient: AuthenticatedContext['adminClient'],
  sourceProfileId: string
) {
  const { data: profile, error: profileError } = await adminClient
    .from('client_profiles')
    .select('id, user_id')
    .eq('id', sourceProfileId)
    .eq('is_active', true)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    return null;
  }

  const { data: actorRecord, error: actorError } = await adminClient
    .from('usuarios')
    .select('is_admin')
    .eq('id', (profile as SourceProfileRow).user_id)
    .maybeSingle();

  if (actorError) {
    throw actorError;
  }

  const { data: entitlement, error: entitlementError } = await adminClient
    .from('profile_entitlements')
    .select('plan_code')
    .eq('profile_id', sourceProfileId)
    .maybeSingle();

  if (entitlementError) {
    throw entitlementError;
  }

  const { data: currentExtraSubscription, error: subscriptionError } = await adminClient
    .from('profile_extra_subscriptions')
    .select('id, status, target_profile_id, stripe_checkout_session_id, checkout_expires_at')
    .eq('purchased_by_user_id', (profile as SourceProfileRow).user_id)
    .is('target_profile_id', null)
    .in('status', ['checkout_pending', 'incomplete', 'trialing', 'active', 'past_due', 'paused'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    throw subscriptionError;
  }

  return {
    id: (profile as SourceProfileRow).id,
    userId: (profile as SourceProfileRow).user_id,
    ownerIsAdmin:
      actorRecord && typeof actorRecord.is_admin === 'boolean' ? actorRecord.is_admin : false,
    currentEntitlementPlanCode:
      entitlement && typeof entitlement.plan_code === 'string' ? entitlement.plan_code : null,
    currentExtraRecordId:
      currentExtraSubscription && typeof currentExtraSubscription.id === 'string'
        ? currentExtraSubscription.id
        : null,
    currentExtraStatus:
      currentExtraSubscription && typeof currentExtraSubscription.status === 'string'
        ? currentExtraSubscription.status
        : null,
    currentExtraTargetProfileId:
      currentExtraSubscription &&
      typeof (currentExtraSubscription as ExtraSubscriptionStateRow).target_profile_id === 'string'
        ? (currentExtraSubscription as ExtraSubscriptionStateRow).target_profile_id
        : null,
    currentExtraCheckoutSessionId:
      currentExtraSubscription &&
      typeof (currentExtraSubscription as ExtraSubscriptionStateRow).stripe_checkout_session_id ===
        'string'
        ? (currentExtraSubscription as ExtraSubscriptionStateRow).stripe_checkout_session_id
        : null,
    currentExtraCheckoutExpiresAt:
      currentExtraSubscription &&
      typeof (currentExtraSubscription as ExtraSubscriptionStateRow).checkout_expires_at ===
        'string'
        ? (currentExtraSubscription as ExtraSubscriptionStateRow).checkout_expires_at
        : null,
  };
}

async function loadStripeCustomerId(
  adminClient: AuthenticatedContext['adminClient'],
  userId: string
) {
  const { data, error } = await adminClient
    .from('stripe_customers')
    .select('customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data && typeof data.customer_id === 'string' ? data.customer_id : null;
}

async function expireCurrentCheckoutReservation(
  adminClient: AuthenticatedContext['adminClient'],
  reservationId: string
) {
  const { error } = await adminClient
    .from('profile_extra_subscriptions')
    .update({
      status: 'incomplete_expired',
    })
    .eq('id', reservationId)
    .eq('status', 'checkout_pending');

  if (error) {
    throw error;
  }
}

async function createCheckoutReservation(
  adminClient: AuthenticatedContext['adminClient'],
  input: {
    sourceProfileId: string;
    purchasedByUserId: string;
    stripePriceId: string;
  }
) {
  const { data, error } = await adminClient
    .from('profile_extra_subscriptions')
    .insert({
      purchased_by_user_id: input.purchasedByUserId,
      source_profile_id: input.sourceProfileId,
      stripe_price_id: input.stripePriceId,
      status: 'checkout_pending',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const conflict = new Error(
        'Ja existe um checkout ou slot de perfil adicional em andamento para esta conta.'
      ) as Error & { status?: number; code?: string };
      conflict.status = 409;
      conflict.code = 'PROFILE_EXTRA_CHECKOUT_CONFLICT';
      throw conflict;
    }

    throw error;
  }

  return { id: data.id as string };
}

async function attachCheckoutSessionToReservation(
  adminClient: AuthenticatedContext['adminClient'],
  input: {
    reservationId: string;
    stripeCheckoutSessionId: string;
    checkoutExpiresAt: string | null;
    stripeCustomerId: string | null;
  }
) {
  const { error } = await adminClient
    .from('profile_extra_subscriptions')
    .update({
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      checkout_expires_at: input.checkoutExpiresAt,
      stripe_customer_id: input.stripeCustomerId,
    })
    .eq('id', input.reservationId)
    .eq('status', 'checkout_pending')
    .select('id')
    .single();

  if (error) {
    throw error;
  }
}

async function releaseCheckoutReservation(
  adminClient: AuthenticatedContext['adminClient'],
  reservationId: string
) {
  const { error } = await adminClient
    .from('profile_extra_subscriptions')
    .delete()
    .eq('id', reservationId)
    .eq('status', 'checkout_pending');

  if (error) {
    throw error;
  }
}

function buildCheckoutErrorResponse(error: unknown) {
  const status = typeof (error as { status?: number })?.status === 'number'
    ? (error as { status: number }).status
    : 400;

  const message =
    error instanceof Error && error.message.trim()
      ? error.message
      : 'Nao foi possivel iniciar o checkout de perfil adicional.';

  return jsonResponse(
    {
      error: message,
      code: (error as { code?: string }).code,
    },
    status
  );
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_PROFILE_EXTRA_V1) {
      const error = new Error('Stripe profile extra checkout is not configured.') as Error & {
        status?: number;
        code?: string;
      };
      error.status = 500;
      error.code = 'PROFILE_EXTRA_CHECKOUT_NOT_CONFIGURED';
      throw error;
    }

    const payload = (await request.json().catch(() => ({}))) as CreateProfileExtraCheckoutPayload;
    const sourceProfileId = payload.sourceProfileId?.trim();

    if (!sourceProfileId) {
      const error = new Error('sourceProfileId is required.') as Error & {
        status?: number;
        code?: string;
      };
      error.status = 400;
      error.code = 'SOURCE_PROFILE_REQUIRED';
      throw error;
    }

    const { user, adminClient } = await requireAuthenticatedUser(request);
    const stripe = createStripeClient(STRIPE_SECRET_KEY);
    const sourceProfile = await loadCheckoutSourceProfile(adminClient, sourceProfileId);
    const stripeCustomerId = user.id ? await loadStripeCustomerId(adminClient, user.id) : null;

    const result = await runCreateProfileExtraCheckout({
      actor: {
        userId: user.id,
        email: user.email ?? null,
        isAdmin: sourceProfile?.ownerIsAdmin ?? false,
      },
      sourceProfile,
      priceId: STRIPE_PRICE_PROFILE_EXTRA_V1,
      appBaseUrl: getAppBaseUrl(),
      customerId: stripeCustomerId,
      createCheckoutSession: (params) =>
        stripe.checkout.sessions.create(params as Stripe.Checkout.SessionCreateParams),
      retrieveCheckoutSession: (checkoutSessionId) =>
        stripe.checkout.sessions.retrieve(checkoutSessionId),
      expireCheckoutSession: async (checkoutSessionId) => {
        await stripe.checkout.sessions.expire(checkoutSessionId);
      },
      expireCurrentCheckoutReservation: (reservationId) =>
        expireCurrentCheckoutReservation(adminClient, reservationId),
      createCheckoutReservation: (input) => createCheckoutReservation(adminClient, input),
      attachCheckoutSessionToReservation: (input) =>
        attachCheckoutSessionToReservation(adminClient, input),
      releaseCheckoutReservation: (reservationId) =>
        releaseCheckoutReservation(adminClient, reservationId),
    });

    return jsonResponse({
      sessionId: result.sessionId,
      checkoutUrl: result.checkoutUrl,
    });
  } catch (error) {
    console.error('[create-profile-extra-checkout] failed', error);
    return buildCheckoutErrorResponse(error);
  }
});
