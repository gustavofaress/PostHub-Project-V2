import type { WorkspaceModule } from './navigation';

export type PlanId = 'start' | 'growth' | 'pro';
export type PlanFeature = WorkspaceModule | 'team';

export const ALWAYS_OPEN_FEATURES: PlanFeature[] = [
  'onboarding',
  'dashboard',
  'integrations',
  'performance',
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

export const isTrialPlan = (plan?: string | null) => {
  const normalizedPlan = (plan || '').toLowerCase().trim();
  return normalizedPlan === 'start_7' || normalizedPlan === 'teste' || normalizedPlan === 'trial';
};

export const hasLegacyPlanAccess = (
  plan: string | null | undefined,
  feature: PlanFeature,
  isAdmin = false
) => {
  if (isAdmin) return true;
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
