import {
  hasLegacyPlanAccess,
  type PlanFeature,
} from '../src/shared/constants/legacyPlanAccess.ts';
import type {
  ProfileEntitlementRecord,
  ProfileFeature,
  ResolvedProfileEntitlements,
} from './profile-entitlements.ts';
import { hasProfileFeature } from './profile-entitlements.ts';

export const LEGACY_PROFILE_FEATURE_PLAN_FEATURE_MAP: Record<ProfileFeature, PlanFeature> = {
  ideas: 'ideas',
  calendar: 'calendar',
  kanban: 'kanban',
  references: 'references',
  metrics: 'performance',
  socialAnalytics: 'integrations',
  approval: 'approval',
  approvalLinkCreation: 'calendar',
  reports: 'reports',
  team: 'team',
};

export type ProfileCommercialAccessSource =
  | 'profile_entitlements'
  | 'admin_bypass'
  | 'legacy_runtime';

export interface ResolvedProfileCommercialFeatureAccess {
  feature: ProfileFeature;
  enabled: boolean;
  source: ProfileCommercialAccessSource;
}

export const resolveProfileCommercialFeatureAccess = (params: {
  feature: ProfileFeature;
  entitlements?: ProfileEntitlementRecord | ResolvedProfileEntitlements | null;
  currentPlan?: string | null;
  isAdmin?: boolean;
}): ResolvedProfileCommercialFeatureAccess => {
  if (params.entitlements) {
    return {
      feature: params.feature,
      enabled: hasProfileFeature(params.entitlements, params.feature),
      source: 'profile_entitlements',
    };
  }

  if (params.isAdmin) {
    return {
      feature: params.feature,
      enabled: true,
      source: 'admin_bypass',
    };
  }

  return {
    feature: params.feature,
    enabled: hasLegacyPlanAccess(
      params.currentPlan,
      LEGACY_PROFILE_FEATURE_PLAN_FEATURE_MAP[params.feature],
      false
    ),
    source: 'legacy_runtime',
  };
};
