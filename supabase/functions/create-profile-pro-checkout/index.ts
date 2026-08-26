import Stripe from 'npm:stripe@17.7.0';

import { corsHeaders } from '../_shared/cors.ts';
import { runCreateProfileProCheckout } from '../_shared/stripe/profile-pro.ts';
import {
  createStripeClient,
  getAppBaseUrl,
  jsonResponse,
  requireAuthenticatedUser,
} from '../_shared/stripe/runtime.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_PRICE_PROFILE_PRO = Deno.env.get('STRIPE_PRICE_PROFILE_PRO') ?? '';

interface CreateProfileProCheckoutPayload {
  profileId?: string;
}

interface CheckoutProfileRow {
  id: string;
  user_id: string;
}

interface StripeCheckoutStateRow {
  id: string;
  status: string;
  stripe_checkout_session_id: string | null;
  checkout_expires_at: string | null;
}

async function loadCheckoutProfile(
  adminClient: Awaited<ReturnType<typeof requireAuthenticatedUser>>['adminClient'],
  profileId: string
) {
  const { data: profile, error: profileError } = await adminClient
    .from('client_profiles')
    .select('id, user_id')
    .eq('id', profileId)
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
    .eq('id', profile.user_id)
    .maybeSingle();

  if (actorError) {
    throw actorError;
  }

  const { data: entitlement, error: entitlementError } = await adminClient
    .from('profile_entitlements')
    .select('plan_code')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (entitlementError) {
    throw entitlementError;
  }

  const { data: currentStripeSubscription, error: subscriptionError } = await adminClient
    .from('profile_stripe_subscriptions')
    .select('id, status, stripe_checkout_session_id, checkout_expires_at')
    .eq('profile_id', profileId)
    .in('status', ['checkout_pending', 'incomplete', 'trialing', 'active', 'past_due', 'paused'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    throw subscriptionError;
  }

  return {
    id: (profile as CheckoutProfileRow).id,
    userId: (profile as CheckoutProfileRow).user_id,
    ownerIsAdmin:
      actorRecord && typeof actorRecord.is_admin === 'boolean' ? actorRecord.is_admin : false,
    currentEntitlementPlanCode:
      entitlement && typeof entitlement.plan_code === 'string' ? entitlement.plan_code : null,
    currentStripeRecordId:
      currentStripeSubscription && typeof currentStripeSubscription.id === 'string'
        ? currentStripeSubscription.id
        : null,
    currentStripeSubscriptionStatus:
      currentStripeSubscription && typeof currentStripeSubscription.status === 'string'
        ? currentStripeSubscription.status
        : null,
    currentStripeCheckoutSessionId:
      currentStripeSubscription &&
      typeof currentStripeSubscription.stripe_checkout_session_id === 'string'
        ? currentStripeSubscription.stripe_checkout_session_id
        : null,
    currentStripeCheckoutExpiresAt:
      currentStripeSubscription &&
      typeof currentStripeSubscription.checkout_expires_at === 'string'
        ? currentStripeSubscription.checkout_expires_at
        : null,
  };
}

async function loadStripeCustomerId(
  adminClient: Awaited<ReturnType<typeof requireAuthenticatedUser>>['adminClient'],
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
  adminClient: Awaited<ReturnType<typeof requireAuthenticatedUser>>['adminClient'],
  reservationId: string
) {
  const { error } = await adminClient
    .from('profile_stripe_subscriptions')
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
  adminClient: Awaited<ReturnType<typeof requireAuthenticatedUser>>['adminClient'],
  input: {
    profileId: string;
    purchasedByUserId: string;
    stripePriceId: string;
  }
) {
  const { data, error } = await adminClient
    .from('profile_stripe_subscriptions')
    .insert({
      profile_id: input.profileId,
      purchased_by_user_id: input.purchasedByUserId,
      stripe_price_id: input.stripePriceId,
      status: 'checkout_pending',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const conflict = new Error(
        'Ja existe uma contratacao PRO em andamento ou ativa para este perfil.'
      ) as Error & { status?: number; code?: string };
      conflict.status = 409;
      conflict.code = 'PROFILE_PRO_CHECKOUT_CONFLICT';
      throw conflict;
    }

    throw error;
  }

  return { id: data.id as string };
}

async function attachCheckoutSessionToReservation(
  adminClient: Awaited<ReturnType<typeof requireAuthenticatedUser>>['adminClient'],
  input: {
    reservationId: string;
    stripeCheckoutSessionId: string;
    checkoutExpiresAt: string | null;
    stripeCustomerId: string | null;
  }
) {
  const { error } = await adminClient
    .from('profile_stripe_subscriptions')
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
  adminClient: Awaited<ReturnType<typeof requireAuthenticatedUser>>['adminClient'],
  reservationId: string
) {
  const { error } = await adminClient
    .from('profile_stripe_subscriptions')
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
      : 'Nao foi possivel iniciar o checkout PRO deste perfil.';

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
    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_PROFILE_PRO) {
      const error = new Error('Stripe profile checkout is not configured.') as Error & {
        status?: number;
        code?: string;
      };
      error.status = 500;
      error.code = 'STRIPE_PROFILE_PRO_NOT_CONFIGURED';
      throw error;
    }

    const payload = (await request.json().catch(() => ({}))) as CreateProfileProCheckoutPayload;
    const profileId = payload.profileId?.trim();

    if (!profileId) {
      const error = new Error('profileId is required.') as Error & { status?: number };
      error.status = 400;
      throw error;
    }

    const { user, adminClient } = await requireAuthenticatedUser(request);
    const stripe = createStripeClient(STRIPE_SECRET_KEY);
    const profile = await loadCheckoutProfile(adminClient, profileId);
    const customerId = await loadStripeCustomerId(adminClient, user.id);

    const result = await runCreateProfileProCheckout({
      actor: {
        userId: user.id,
        email: user.email ?? null,
        isAdmin: profile?.ownerIsAdmin ?? false,
      },
      profile,
      priceId: STRIPE_PRICE_PROFILE_PRO,
      appBaseUrl: getAppBaseUrl(),
      customerId,
      retrieveCheckoutSession: (checkoutSessionId) =>
        stripe.checkout.sessions.retrieve(checkoutSessionId),
      expireCheckoutSession: (checkoutSessionId) =>
        stripe.checkout.sessions.expire(checkoutSessionId),
      expireCurrentCheckoutReservation: (reservationId) =>
        expireCurrentCheckoutReservation(adminClient, reservationId),
      createCheckoutReservation: (reservationInput) =>
        createCheckoutReservation(adminClient, reservationInput),
      attachCheckoutSessionToReservation: (reservationInput) =>
        attachCheckoutSessionToReservation(adminClient, reservationInput),
      releaseCheckoutReservation: (reservationId) =>
        releaseCheckoutReservation(adminClient, reservationId),
      createCheckoutSession: async (params) =>
        stripe.checkout.sessions.create(
          params as Stripe.Checkout.SessionCreateParams
        ),
    });

    return new Response(
      JSON.stringify({
        sessionId: result.sessionId,
        checkoutUrl: result.checkoutUrl,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error(
      '[create-profile-pro-checkout] error:',
      error instanceof Error ? error.message : error
    );

    const response = buildCheckoutErrorResponse(error);
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
