import type { WorkspaceModule } from '../constants/navigation';
import { hasLegacyPlanAccess, type PlanFeature } from '../constants/legacyPlanAccess';
import type {
  CommercialPlanCode,
  ProfileFeature,
  ResolvedProfileEntitlements,
} from '../../types/profile-entitlements.ts';

export type EntitlementLookupStatus = 'loading' | 'resolved' | 'missing' | 'error';

export type ActiveProfileCommercialStatus =
  | 'loading'
  | 'resolved'
  | 'admin_bypass'
  | 'legacy_fallback'
  | 'error';

export type CommercialFeatureAccessSource =
  | 'profile_entitlements'
  | 'admin_bypass'
  | 'legacy_runtime'
  | 'fail_closed';

export interface CommercialFeatureAccess {
  feature: ProfileFeature;
  enabled: boolean;
  status: ActiveProfileCommercialStatus;
  source: CommercialFeatureAccessSource;
}

export interface ActiveProfileCommercialAccess {
  status: ActiveProfileCommercialStatus;
  entitlementStatus: EntitlementLookupStatus;
  entitlements: ResolvedProfileEntitlements | null;
  planCode: CommercialPlanCode | null;
  hasEntitlementRow: boolean;
  isMissingEntitlement: boolean;
  isLoading: boolean;
  isResolved: boolean;
  isAdminBypass: boolean;
  isLegacyFallback: boolean;
  isError: boolean;
  featureAccess: Record<ProfileFeature, CommercialFeatureAccess>;
}

interface ResolveActiveProfileCommercialAccessInput {
  hasActiveProfile: boolean;
  entitlementStatus: EntitlementLookupStatus;
  entitlements: ResolvedProfileEntitlements | null;
  currentPlan?: string | null;
  isAdmin?: boolean;
}

const BASELINE_FREE_FEATURES = new Set<ProfileFeature>(['calendar', 'kanban']);

const LEGACY_COMPATIBILITY_FEATURE_MAP: Record<ProfileFeature, PlanFeature> = {
  calendar: 'calendar',
  kanban: 'kanban',
  references: 'references',
  metrics: 'performance',
  socialAnalytics: 'integrations',
  approval: 'approval',
  approvalLinkCreation: 'calendar',
  team: 'team',
};

export const WORKSPACE_MODULE_COMMERCIAL_FEATURE_MAP: Partial<
  Record<WorkspaceModule, ProfileFeature>
> = {
  approval: 'approval',
  calendar: 'calendar',
  kanban: 'kanban',
  performance: 'metrics',
  references: 'references',
};

export const getWorkspaceModuleCommercialFeature = (
  moduleId: WorkspaceModule
): ProfileFeature | null => WORKSPACE_MODULE_COMMERCIAL_FEATURE_MAP[moduleId] ?? null;

const buildFeatureAccess = (
  status: ActiveProfileCommercialStatus,
  input: ResolveActiveProfileCommercialAccessInput
): Record<ProfileFeature, CommercialFeatureAccess> => {
  return {
    calendar: resolveFeatureAccessForStatus('calendar', status, input),
    kanban: resolveFeatureAccessForStatus('kanban', status, input),
    references: resolveFeatureAccessForStatus('references', status, input),
    metrics: resolveFeatureAccessForStatus('metrics', status, input),
    socialAnalytics: resolveFeatureAccessForStatus('socialAnalytics', status, input),
    approval: resolveFeatureAccessForStatus('approval', status, input),
    approvalLinkCreation: resolveFeatureAccessForStatus('approvalLinkCreation', status, input),
    team: resolveFeatureAccessForStatus('team', status, input),
  };
};

const resolveFeatureAccessForStatus = (
  feature: ProfileFeature,
  status: ActiveProfileCommercialStatus,
  input: ResolveActiveProfileCommercialAccessInput
): CommercialFeatureAccess => {
  if (status === 'resolved' && input.entitlements) {
    return {
      feature,
      enabled: input.entitlements.features[feature],
      status,
      source: 'profile_entitlements',
    };
  }

  if (status === 'admin_bypass') {
    return {
      feature,
      enabled: true,
      status,
      source: 'admin_bypass',
    };
  }

  if (status === 'legacy_fallback') {
    return {
      feature,
      enabled: hasLegacyPlanAccess(input.currentPlan, LEGACY_COMPATIBILITY_FEATURE_MAP[feature], false),
      status,
      source: 'legacy_runtime',
    };
  }

  return {
    feature,
    enabled: BASELINE_FREE_FEATURES.has(feature),
    status,
    source: 'fail_closed',
  };
};

export const resolveActiveProfileCommercialAccess = (
  input: ResolveActiveProfileCommercialAccessInput
): ActiveProfileCommercialAccess => {
  let status: ActiveProfileCommercialStatus = 'legacy_fallback';

  if (!input.hasActiveProfile || input.entitlementStatus === 'loading') {
    status = 'loading';
  } else if (input.entitlementStatus === 'error') {
    status = 'error';
  } else if (input.entitlementStatus === 'resolved' && input.entitlements) {
    status = 'resolved';
  } else if (input.isAdmin) {
    status = 'admin_bypass';
  }

  return {
    status,
    entitlementStatus: input.entitlementStatus,
    entitlements: status === 'resolved' ? input.entitlements : null,
    planCode: input.entitlements?.plan_code ?? null,
    hasEntitlementRow: !!input.entitlements,
    isMissingEntitlement: input.entitlementStatus === 'missing',
    isLoading: status === 'loading',
    isResolved: status === 'resolved',
    isAdminBypass: status === 'admin_bypass',
    isLegacyFallback: status === 'legacy_fallback',
    isError: status === 'error',
    featureAccess: buildFeatureAccess(status, input),
  };
};

export const resolveActiveProfileFeatureAccess = (
  access: ActiveProfileCommercialAccess,
  feature: ProfileFeature
) => access.featureAccess[feature];

export const canUseActiveProfileFeature = (
  access: ActiveProfileCommercialAccess,
  feature: ProfileFeature
) => resolveActiveProfileFeatureAccess(access, feature).enabled;
