import { isTrialPlan, normalizePlan } from '../constants/legacyPlanAccess';

export type UserAccessStatus =
  | 'free'
  | 'trial_active'
  | 'trial_expired'
  | 'paid'
  | 'pro'
  | 'blocked'
  | 'missing'
  | 'unknown';

export const isTrialStillActive = (trialExpiresAt?: string | null) => {
  if (!trialExpiresAt) return false;
  return new Date(trialExpiresAt).getTime() > Date.now();
};

export const resolveLegacyUserAccessStatus = (params: {
  currentPlan?: string | null;
  isAdmin?: boolean;
  trialExpiresAt?: string | null;
}): UserAccessStatus => {
  if (params.isAdmin) return 'pro';

  const normalizedPlan = (params.currentPlan || '').toLowerCase().trim();

  if (!normalizedPlan) return 'missing';
  if (normalizedPlan === 'blocked' || normalizedPlan === 'bloqueado') return 'blocked';

  const normalizedKnownPlan = normalizePlan(normalizedPlan);

  if (normalizedKnownPlan === 'pro') return 'pro';
  if (normalizedKnownPlan === 'free') return 'free';
  if (normalizedKnownPlan) return 'paid';

  if (isTrialPlan(normalizedPlan)) {
    return isTrialStillActive(params.trialExpiresAt) ? 'trial_active' : 'trial_expired';
  }

  return 'unknown';
};
