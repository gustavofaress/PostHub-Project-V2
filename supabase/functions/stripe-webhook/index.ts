import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

type PlanId = 'start' | 'growth' | 'pro';
type CheckoutLineItemSummary = {
  priceId: string | null;
  quantity: number;
};
type CheckoutReferenceContext = {
  userId: string | null;
  affiliateCode: string | null;
};
type UsuarioAffiliateRecord = {
  id: string;
  email: string | null;
  referred_by_affiliate_user_id: string | null;
  referred_by_affiliate_code: string | null;
  affiliate_locked_at: string | null;
};
type AffiliatePartnerRecord = {
  id: string;
  email: string | null;
  affiliate_code: string | null;
  affiliate_commission_percent: number | null;
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

const normalizeAffiliateCode = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '');
  return normalized || null;
};

const parseCheckoutReferenceContext = (clientReferenceId?: string | null): CheckoutReferenceContext => {
  const rawValue = clientReferenceId?.trim();

  if (!rawValue) {
    return { userId: null, affiliateCode: null };
  }

  if (!rawValue.includes('u:') && !rawValue.includes('a:')) {
    return { userId: rawValue, affiliateCode: null };
  }

  return rawValue.split('|').reduce<CheckoutReferenceContext>(
    (result, part) => {
      if (part.startsWith('u:')) {
        result.userId = part.slice(2).trim() || null;
      }

      if (part.startsWith('a:')) {
        result.affiliateCode = normalizeAffiliateCode(part.slice(2));
      }

      return result;
    },
    { userId: null, affiliateCode: null }
  );
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

const getUsuarioByIdOrEmail = async (
  adminClient: ReturnType<typeof createAdminClient>,
  params: {
    userId?: string | null;
    email?: string | null;
  }
): Promise<UsuarioAffiliateRecord | null> => {
  const normalizedUserId = params.userId?.trim();
  const normalizedEmail = params.email?.trim().toLowerCase();
  const select = 'id, email, referred_by_affiliate_user_id, referred_by_affiliate_code, affiliate_locked_at';

  if (normalizedUserId) {
    const { data, error } = await adminClient
      .from('usuarios')
      .select(select)
      .eq('id', normalizedUserId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as UsuarioAffiliateRecord;
    }
  }

  if (!normalizedEmail) {
    return null;
  }

  const { data, error } = await adminClient
    .from('usuarios')
    .select(select)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UsuarioAffiliateRecord | null) ?? null;
};

const getAffiliatePartnerByCode = async (
  adminClient: ReturnType<typeof createAdminClient>,
  affiliateCode?: string | null
): Promise<AffiliatePartnerRecord | null> => {
  const normalizedCode = normalizeAffiliateCode(affiliateCode);

  if (!normalizedCode) {
    return null;
  }

  const { data, error } = await adminClient
    .from('usuarios')
    .select('id, email, affiliate_code, affiliate_commission_percent')
    .eq('is_affiliate_partner', true)
    .eq('affiliate_code', normalizedCode)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AffiliatePartnerRecord | null) ?? null;
};

const applyAffiliateAttributionFromCheckout = async (
  adminClient: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) => {
  const referenceContext = parseCheckoutReferenceContext(session.client_reference_id);

  if (!referenceContext.affiliateCode) {
    return null;
  }

  const usuario = await getUsuarioByIdOrEmail(adminClient, {
    userId: referenceContext.userId,
    email: session.customer_details?.email ?? session.customer_email ?? null,
  });

  if (!usuario || usuario.affiliate_locked_at) {
    return null;
  }

  const affiliatePartner = await getAffiliatePartnerByCode(adminClient, referenceContext.affiliateCode);

  if (!affiliatePartner) {
    return null;
  }

  const normalizedTargetEmail = usuario.email?.trim().toLowerCase();
  const normalizedAffiliateEmail = affiliatePartner.email?.trim().toLowerCase();

  if (
    affiliatePartner.id === usuario.id ||
    (normalizedTargetEmail && normalizedAffiliateEmail && normalizedTargetEmail === normalizedAffiliateEmail)
  ) {
    return null;
  }

  const { error } = await adminClient
    .from('usuarios')
    .update({
      referred_by_affiliate_user_id: affiliatePartner.id,
      referred_by_affiliate_code: affiliatePartner.affiliate_code,
      affiliate_attributed_at: new Date().toISOString(),
    })
    .eq('id', usuario.id)
    .is('affiliate_locked_at', null);

  if (error) {
    throw error;
  }

  return {
    referredUserId: usuario.id,
    affiliateUserId: affiliatePartner.id,
    affiliateCode: affiliatePartner.affiliate_code,
  };
};

const maybeCreateAffiliateCommission = async (
  adminClient: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice,
  params: {
    customerEmail: string | null;
    plan: PlanId | null;
  }
) => {
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? null;

  if (!subscriptionId) {
    return { created: false, reason: 'missing_subscription' as const };
  }

  const usuario = await getUsuarioByIdOrEmail(adminClient, {
    email: params.customerEmail,
  });

  if (!usuario?.referred_by_affiliate_user_id) {
    return { created: false, reason: 'missing_attribution' as const };
  }

  const affiliatePartner = await adminClient
    .from('usuarios')
    .select('id, affiliate_code, affiliate_commission_percent')
    .eq('id', usuario.referred_by_affiliate_user_id)
    .maybeSingle();

  if (affiliatePartner.error) {
    throw affiliatePartner.error;
  }

  if (!affiliatePartner.data?.id) {
    return { created: false, reason: 'missing_affiliate_partner' as const };
  }

  const commissionPercent = Number(affiliatePartner.data.affiliate_commission_percent ?? 30);
  const grossAmount = Math.max(invoice.amount_paid ?? 0, 0);
  const commissionAmount = Math.round(grossAmount * (commissionPercent / 100));
  const stripeCustomerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;

  const { error } = await adminClient.from('affiliate_commissions').insert({
    affiliate_user_id: affiliatePartner.data.id,
    referred_user_id: usuario.id,
    referred_user_email: params.customerEmail,
    affiliate_code: usuario.referred_by_affiliate_code ?? affiliatePartner.data.affiliate_code,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id,
    stripe_checkout_session_id: null,
    plan_id: params.plan,
    currency: (invoice.currency || 'brl').toLowerCase(),
    gross_amount: grossAmount,
    commission_percent: commissionPercent,
    commission_amount: commissionAmount,
    status: 'pending',
    first_paid_at: new Date().toISOString(),
  });

  if (error) {
    const message = `${error.message || ''}`.toLowerCase();
    const isDuplicate =
      error.code === '23505' ||
      message.includes('duplicate key') ||
      message.includes('unique constraint');

    if (!isDuplicate) {
      throw error;
    }
  }

  const { error: lockError } = await adminClient
    .from('usuarios')
    .update({
      affiliate_locked_at: new Date().toISOString(),
    })
    .eq('id', usuario.id)
    .is('affiliate_locked_at', null);

  if (lockError) {
    throw lockError;
  }

  return {
    created: !error,
    reason: error ? ('duplicate' as const) : ('created' as const),
    affiliateUserId: affiliatePartner.data.id,
    affiliateCode: usuario.referred_by_affiliate_code ?? affiliatePartner.data.affiliate_code,
    grossAmount,
    commissionAmount,
  };
};

const resolveUserIdForCheckout = async (
  adminClient: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) => {
  const { userId: parsedUserId } = parseCheckoutReferenceContext(session.client_reference_id);
  const clientReferenceId = parsedUserId?.trim();

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
  const affiliateAttribution = await applyAffiliateAttributionFromCheckout(adminClient, session);

  if (plan) {
    await updateUserPlan(adminClient, session.customer_details?.email ?? session.customer_email, plan);
  }

  const extraProfiles = await grantExtraProfiles(adminClient, {
    eventId,
    session,
    quantity: extraProfilesQuantity,
  });

  return { plan, priceId, extraProfiles, affiliateAttribution };
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

  const affiliateCommission = await maybeCreateAffiliateCommission(adminClient, invoice, {
    customerEmail,
    plan,
  });

  return { plan, priceId, affiliateCommission };
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
