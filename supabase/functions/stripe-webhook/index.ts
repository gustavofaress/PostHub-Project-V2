import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

type PlanId = 'start' | 'growth' | 'pro';
type CheckoutLineItemSummary = {
  priceId: string | null;
  quantity: number;
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_PRICE_EXTRA_PROFILE = Deno.env.get('STRIPE_PRICE_EXTRA_PROFILE') ?? '';

const STRIPE_PRICE_TO_PLAN: Record<string, PlanId> = {
  [Deno.env.get('STRIPE_PRICE_START') ?? 'price_1TJcfiLE0cyETHYjbu7xfPYL']: 'start',
  [Deno.env.get('STRIPE_PRICE_GROWTH') ?? 'price_1TJcfsLE0cyETHYjv9JSmfN7']: 'growth',
  [Deno.env.get('STRIPE_PRICE_PRO') ?? 'price_1TD3N0LE0cyETHYj74Y6NFpn']: 'pro',
};

const createStripeClient = () =>
  new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover' as any,
    typescript: true,
  });

const createAdminClient = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const getPlanFromPriceId = (priceId?: string | null): PlanId | null => {
  if (!priceId) return null;
  return STRIPE_PRICE_TO_PLAN[priceId] ?? null;
};

const getLineItems = async (stripe: Stripe, sessionId: string): Promise<CheckoutLineItemSummary[]> => {
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 100,
  });

  return lineItems.data.map((item) => ({
    priceId: item.price?.id ?? null,
    quantity: item.quantity ?? 1,
  }));
};

const getExtraProfileQuantity = (lineItems: CheckoutLineItemSummary[]) => {
  if (!STRIPE_PRICE_EXTRA_PROFILE) return 0;

  return lineItems.reduce((total, item) => {
    if (item.priceId !== STRIPE_PRICE_EXTRA_PROFILE) return total;
    return total + Math.max(item.quantity || 0, 0);
  }, 0);
};

const updateUserPlan = async (
  adminClient: ReturnType<typeof createAdminClient>,
  email: string | null | undefined,
  plan: PlanId | null
) => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !plan) {
    throw new Error('Missing customer email or plan.');
  }

  const { error } = await adminClient
    .from('usuarios')
    .update({ current_plan: plan })
    .eq('email', normalizedEmail);

  if (error) {
    throw error;
  }
};

const resolveUserIdForCheckout = async (
  adminClient: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) => {
  const clientReferenceId = session.client_reference_id?.trim();

  if (clientReferenceId) {
    return clientReferenceId;
  }

  const normalizedEmail = (session.customer_details?.email ?? session.customer_email ?? '')
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const { data, error } = await adminClient
    .from('usuarios')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
};

const grantExtraProfiles = async (
  adminClient: ReturnType<typeof createAdminClient>,
  params: {
    eventId: string;
    session: Stripe.Checkout.Session;
    quantity: number;
  }
) => {
  const { eventId, session, quantity } = params;

  if (quantity <= 0) {
    return { quantity: 0, granted: false };
  }

  const userId = await resolveUserIdForCheckout(adminClient, session);

  if (!userId) {
    throw new Error('Could not resolve the user for the extra profile purchase.');
  }

  const { error } = await adminClient.from('profile_purchase_credits').insert({
    user_id: userId,
    stripe_event_id: eventId,
    stripe_checkout_session_id: session.id,
    stripe_customer_email: session.customer_details?.email ?? session.customer_email ?? null,
    quantity,
  });

  if (error) {
    const message = `${error.message || ''}`.toLowerCase();
    const isDuplicate =
      error.code === '23505' ||
      message.includes('duplicate key') ||
      message.includes('unique constraint');

    if (isDuplicate) {
      return { quantity: 0, granted: false };
    }

    throw error;
  }

  return { quantity, granted: true };
};

const handleCheckoutCompleted = async (
  stripe: Stripe,
  adminClient: ReturnType<typeof createAdminClient>,
  eventId: string,
  session: Stripe.Checkout.Session
) => {
  const lineItems = await getLineItems(stripe, session.id);
  const priceId = lineItems.find((item) => getPlanFromPriceId(item.priceId))?.priceId ?? null;
  const plan = getPlanFromPriceId(priceId);
  const extraProfilesQuantity = getExtraProfileQuantity(lineItems);

  if (plan) {
    await updateUserPlan(adminClient, session.customer_details?.email ?? session.customer_email, plan);
  }

  const extraProfiles = await grantExtraProfiles(adminClient, {
    eventId,
    session,
    quantity: extraProfilesQuantity,
  });

  return { plan, priceId, extraProfiles };
};

const getInvoiceCustomerEmail = async (stripe: Stripe, invoice: Stripe.Invoice) => {
  if (invoice.customer_email) return invoice.customer_email;

  if (typeof invoice.customer === 'object' && invoice.customer && 'email' in invoice.customer) {
    return invoice.customer.email;
  }

  if (typeof invoice.customer === 'string') {
    const customer = await stripe.customers.retrieve(invoice.customer);
    if (!customer.deleted) return customer.email;
  }

  return null;
};

const handleInvoicePaymentSucceeded = async (
  stripe: Stripe,
  adminClient: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) => {
  const priceId = invoice.lines.data.find((line) => line.price?.id)?.price?.id ?? null;
  const plan = getPlanFromPriceId(priceId);
  const customerEmail = await getInvoiceCustomerEmail(stripe, invoice);

  await updateUserPlan(adminClient, customerEmail, plan);

  return { plan, priceId };
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe environment variables are missing.');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables are missing.');
    }

    const stripe = createStripeClient();
    const adminClient = createAdminClient();

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return jsonResponse({ error: 'Missing Stripe signature.' }, 400);
    }

    const body = await request.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'checkout.session.completed') {
      const result = await handleCheckoutCompleted(
        stripe,
        adminClient,
        event.id,
        event.data.object as Stripe.Checkout.Session
      );
      return jsonResponse({ received: true, ...result });
    }

    if (event.type === 'invoice.payment_succeeded') {
      const result = await handleInvoicePaymentSucceeded(
        stripe,
        adminClient,
        event.data.object as Stripe.Invoice
      );
      return jsonResponse({ received: true, ...result });
    }

    return jsonResponse({ received: true, ignored: event.type });
  } catch (error) {
    console.error('[stripe-webhook] error:', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    );
  }
});
