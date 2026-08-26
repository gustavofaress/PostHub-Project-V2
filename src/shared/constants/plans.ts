import {
  getMinimumPlanForFeature,
  getPlanLabel,
  hasLegacyPlanAccess,
  isPaidPlanId,
  normalizePlan,
  type PlanFeature,
  type PaidPlanId,
  PLAN_FEATURES,
} from './legacyPlanAccess';

interface StripeCheckoutContext {
  userId?: string | null;
  email?: string | null;
  affiliateCode?: string | null;
}

export const INCLUDED_PROFILES_PER_ACCOUNT = 1;
export const EXTRA_PROFILE_PRICE_LABEL = 'R$47,90';
export const EXTRA_PROFILE_PRICE_VALUE = 47.9;
export const EXTRA_PROFILE_CHECKOUT_TITLE = '1 perfil adicional';
export const EXTRA_PROFILE_CHECKOUT_DESCRIPTION =
  'Essa compra libera mais 1 vaga de perfil na conta atual e nao altera a assinatura principal da PostHub.';
export const EXTRA_PROFILE_CHECKOUT_EMAIL_HINT =
  'Use o mesmo email da conta no checkout para o credito cair corretamente no seu acesso.';

export const STRIPE_PRICE_IDS: Record<PaidPlanId, string> = {
  start: 'price_1TJcfiLE0cyETHYjbu7xfPYL',
  growth: 'price_1TJcfsLE0cyETHYjv9JSmfN7',
  pro: 'price_1TD3N0LE0cyETHYj74Y6NFpn',
};

export const STRIPE_PAYMENT_LINKS: Record<PaidPlanId, string> = {
  start: 'https://buy.stripe.com/5kQcN6dqjc6P9VZ0OOdMI04',
  growth: 'https://buy.stripe.com/dRmfZifyreeX0lp8hgdMI05',
  pro: 'https://buy.stripe.com/8x200k0DxdaT6JN0OOdMI03',
};

export const STRIPE_ADDON_PAYMENT_LINKS = {
  extraProfile: 'https://buy.stripe.com/9B6eVeeundaT8RVeFEdMI06',
} as const;

const EXTRA_PROFILE_PAYMENT_LINK_PLACEHOLDER = 'your_extra_profile_payment_link';
const METRIC_HUB_PAYMENT_LINK_PLACEHOLDER = 'your_metric_hub_payment_link';

export const STRIPE_STANDALONE_PAYMENT_LINKS = {
  metricHub:
    import.meta.env.VITE_STRIPE_METRIC_HUB_PAYMENT_LINK?.trim() ||
    METRIC_HUB_PAYMENT_LINK_PLACEHOLDER,
} as const;

const buildClientReferenceId = (context?: StripeCheckoutContext) => {
  const parts: string[] = [];

  if (context?.userId) {
    parts.push(`u:${context.userId}`);
  }

  if (context?.affiliateCode) {
    parts.push(`a:${context.affiliateCode}`);
  }

  return parts.length > 0 ? parts.join('|') : null;
};

const appendCheckoutContext = (baseLink: string, context?: StripeCheckoutContext) => {
  if (!baseLink) return '';

  try {
    const url = new URL(baseLink);

    const clientReferenceId = buildClientReferenceId(context);

    if (clientReferenceId) {
      url.searchParams.set('client_reference_id', clientReferenceId);
    }

    if (context?.email) {
      url.searchParams.set('locked_prefilled_email', context.email);
    }

    return url.toString();
  } catch {
    return baseLink;
  }
};

export const buildPlanPaymentLink = (planId: PaidPlanId, context?: StripeCheckoutContext) =>
  appendCheckoutContext(STRIPE_PAYMENT_LINKS[planId], context);

export const buildExtraProfilePaymentLink = (context?: StripeCheckoutContext) =>
  appendCheckoutContext(STRIPE_ADDON_PAYMENT_LINKS.extraProfile, context);

export const buildMetricHubPaymentLink = (context?: StripeCheckoutContext) =>
  appendCheckoutContext(STRIPE_STANDALONE_PAYMENT_LINKS.metricHub, context);

export const isExtraProfilePaymentLinkConfigured = () =>
  !!STRIPE_ADDON_PAYMENT_LINKS.extraProfile &&
  !STRIPE_ADDON_PAYMENT_LINKS.extraProfile.includes(EXTRA_PROFILE_PAYMENT_LINK_PLACEHOLDER);

export const isMetricHubPaymentLinkConfigured = () =>
  !!STRIPE_STANDALONE_PAYMENT_LINKS.metricHub &&
  !STRIPE_STANDALONE_PAYMENT_LINKS.metricHub.includes(METRIC_HUB_PAYMENT_LINK_PLACEHOLDER);

export type { PaidPlanId, PlanFeature, PlanId } from './legacyPlanAccess';
export { PLAN_FEATURES, getMinimumPlanForFeature, getPlanLabel, isPaidPlanId, normalizePlan };

export const hasAccess = hasLegacyPlanAccess;
