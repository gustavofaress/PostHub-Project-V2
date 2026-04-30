import type { WorkspaceModule } from './navigation';

export type PlanId = 'start' | 'growth' | 'pro';
export type PlanFeature = WorkspaceModule | 'team';

interface StripeCheckoutContext {
  userId?: string | null;
  email?: string | null;
}

export const INCLUDED_PROFILES_PER_ACCOUNT = 1;
export const EXTRA_PROFILE_PRICE_LABEL = 'R$47,90';
export const EXTRA_PROFILE_PRICE_VALUE = 47.9;

export const STRIPE_PRICE_IDS: Record<PlanId, string> = {
  start: 'price_1TJcfiLE0cyETHYjbu7xfPYL',
  growth: 'price_1TJcfsLE0cyETHYjv9JSmfN7',
  pro: 'price_1TD3N0LE0cyETHYj74Y6NFpn',
};

export const STRIPE_PAYMENT_LINKS: Record<PlanId, string> = {
  start: 'https://buy.stripe.com/5kQcN6dqjc6P9VZ0OOdMI04',
  growth: 'https://buy.stripe.com/dRmfZifyreeX0lp8hgdMI05',
  pro: 'https://buy.stripe.com/8x200k0DxdaT6JN0OOdMI03',
};

export const STRIPE_ADDON_PAYMENT_LINKS = {
  extraProfile: 'https://buy.stripe.com/9B6eVeeundaT8RVeFEdMI06',
} as const;

const EXTRA_PROFILE_PAYMENT_LINK_PLACEHOLDER = 'your_extra_profile_payment_link';

const appendCheckoutContext = (baseLink: string, context?: StripeCheckoutContext) => {
  if (!baseLink) return '';

  try {
    const url = new URL(baseLink);

    if (context?.userId) {
      url.searchParams.set('client_reference_id', context.userId);
    }

    if (context?.email) {
      url.searchParams.set('locked_prefilled_email', context.email);
    }

    return url.toString();
  } catch {
    return baseLink;
  }
};

export const buildExtraProfilePaymentLink = (context?: StripeCheckoutContext) =>
  appendCheckoutContext(STRIPE_ADDON_PAYMENT_LINKS.extraProfile, context);

export const isExtraProfilePaymentLinkConfigured = () =>
  !!STRIPE_ADDON_PAYMENT_LINKS.extraProfile &&
  !STRIPE_ADDON_PAYMENT_LINKS.extraProfile.includes(EXTRA_PROFILE_PAYMENT_LINK_PLACEHOLDER);

const ALWAYS_OPEN_FEATURES: PlanFeature[] = [
  'onboarding',
  'dashboard',
  'settings',
  'account',
  'credits',
  'support',
  'admin',
];

export const PLAN_FEATURES: Record<PlanId, PlanFeature[]> = {
  start: ['calendar', 'kanban', 'ideas', 'clients'],
  growth: ['calendar', 'kanban', 'ideas', 'clients', 'references', 'reports'],
  pro: [
    'calendar',
    'kanban',
    'ideas',
    'clients',
    'references',
    'reports',
    'scripts',
    'approval',
    'integrations',
    'team',
  ],
};

export const normalizePlan = (plan?: string | null): PlanId | null => {
  const normalizedPlan = (plan || '').toLowerCase().trim();

  if (normalizedPlan === 'start' || normalizedPlan === 'growth' || normalizedPlan === 'pro') {
    return normalizedPlan;
  }

  return null;
};

const isTrialPlan = (plan?: string | null) => {
  const normalizedPlan = (plan || '').toLowerCase().trim();
  return normalizedPlan === 'start_7' || normalizedPlan === 'teste' || normalizedPlan === 'trial';
};

export const hasAccess = (
  plan: string | null | undefined,
  feature: PlanFeature,
  isAdmin = false
) => {
  if (isAdmin) return feature !== 'performance';
  if (feature === 'performance') return false;
  if (isTrialPlan(plan)) return true;
  if (ALWAYS_OPEN_FEATURES.includes(feature)) return true;

  const normalizedPlan = normalizePlan(plan);
  if (!normalizedPlan) return false;

  return PLAN_FEATURES[normalizedPlan].includes(feature);
};

export const getMinimumPlanForFeature = (feature: PlanFeature): PlanId | null => {
  if (feature === 'performance') return 'pro';

  if (PLAN_FEATURES.start.includes(feature)) return 'start';
  if (PLAN_FEATURES.growth.includes(feature)) return 'growth';
  if (PLAN_FEATURES.pro.includes(feature)) return 'pro';

  return null;
};
