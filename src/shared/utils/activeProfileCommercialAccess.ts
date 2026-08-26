import type { WorkspaceModule } from '../constants/navigation';
import type {
  CommercialPlanCode,
  ProfileFeature,
  ResolvedProfileEntitlements,
} from '../../types/profile-entitlements.ts';
import { resolveProfileCommercialFeatureAccess } from '../../../shared/profile-commercial-access.ts';

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

const BASELINE_FREE_FEATURES = new Set<ProfileFeature>(['ideas', 'calendar', 'kanban']);

export const WORKSPACE_MODULE_COMMERCIAL_FEATURE_MAP: Partial<
  Record<WorkspaceModule, ProfileFeature>
> = {
  approval: 'approval',
  calendar: 'calendar',
  ideas: 'ideas',
  kanban: 'kanban',
  performance: 'metrics',
  reports: 'reports',
  references: 'references',
};

export const getWorkspaceModuleCommercialFeature = (
  moduleId: WorkspaceModule
): ProfileFeature | null => WORKSPACE_MODULE_COMMERCIAL_FEATURE_MAP[moduleId] ?? null;

export const canAccessFeatureWithWorkspacePermission = (input: {
  commercialAllowed: boolean;
  permissionAllowed: boolean;
}) => input.commercialAllowed && input.permissionAllowed;

const buildFeatureAccess = (
  status: ActiveProfileCommercialStatus,
  input: ResolveActiveProfileCommercialAccessInput
): Record<ProfileFeature, CommercialFeatureAccess> => {
  return {
    ideas: resolveFeatureAccessForStatus('ideas', status, input),
    calendar: resolveFeatureAccessForStatus('calendar', status, input),
    kanban: resolveFeatureAccessForStatus('kanban', status, input),
    references: resolveFeatureAccessForStatus('references', status, input),
    metrics: resolveFeatureAccessForStatus('metrics', status, input),
    socialAnalytics: resolveFeatureAccessForStatus('socialAnalytics', status, input),
    approval: resolveFeatureAccessForStatus('approval', status, input),
    approvalLinkCreation: resolveFeatureAccessForStatus('approvalLinkCreation', status, input),
    reports: resolveFeatureAccessForStatus('reports', status, input),
    team: resolveFeatureAccessForStatus('team', status, input),
  };
};

const resolveFeatureAccessForStatus = (
  feature: ProfileFeature,
  status: ActiveProfileCommercialStatus,
  input: ResolveActiveProfileCommercialAccessInput
): CommercialFeatureAccess => {
  if (status === 'resolved' || status === 'admin_bypass' || status === 'legacy_fallback') {
    const resolvedAccess = resolveProfileCommercialFeatureAccess({
      feature,
      entitlements: status === 'resolved' ? input.entitlements : null,
      currentPlan: input.currentPlan,
      isAdmin: status === 'admin_bypass',
    });

    return {
      feature,
      enabled: resolvedAccess.enabled,
      status,
      source: resolvedAccess.source,
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
  } else if (input.isAdmin) {
    status = 'admin_bypass';
  } else if (input.entitlementStatus === 'resolved' && input.entitlements) {
    status = 'resolved';
  }

  return {
    status,
    entitlementStatus: input.entitlementStatus,
    entitlements: input.entitlements ?? null,
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
