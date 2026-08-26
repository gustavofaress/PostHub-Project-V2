export const COMMERCIAL_PLAN_CODES = [
  'free',
  'pro',
  'legacy_start',
  'legacy_growth',
  'legacy_pro',
] as const;

export type CommercialPlanCode = (typeof COMMERCIAL_PLAN_CODES)[number];

export const ENTITLEMENT_SOURCES = ['default_free', 'legacy_snapshot', 'stripe'] as const;

export type EntitlementSource = (typeof ENTITLEMENT_SOURCES)[number];

export const PROFILE_FEATURES = [
  'ideas',
  'calendar',
  'kanban',
  'references',
  'metrics',
  'socialAnalytics',
  'approval',
  'approvalLinkCreation',
  'reports',
  'team',
] as const;

export type ProfileFeature = (typeof PROFILE_FEATURES)[number];

export interface ProfileEntitlementRecord {
  profile_id: string;
  plan_code: CommercialPlanCode;
  source: EntitlementSource;
  subscription_ref: string | null;
  effective_from: string;
  effective_until: string | null;
  ideas_enabled: boolean;
  calendar_enabled: boolean;
  kanban_enabled: boolean;
  references_enabled: boolean;
  metrics_enabled: boolean;
  social_analytics_enabled: boolean;
  approval_enabled: boolean;
  approval_link_creation_enabled: boolean;
  reports_enabled: boolean;
  max_additional_members: number | null;
  created_at: string;
  updated_at: string;
}

export type ProfileFeatureFlags = Record<ProfileFeature, boolean>;

export interface ResolvedProfileEntitlements extends ProfileEntitlementRecord {
  features: ProfileFeatureFlags;
}

export interface ProfileSeatState {
  additionalMemberCount: number;
  maxAdditionalMembers: number | null;
  remainingAdditionalMembers: number | null;
  state: 'within_limit' | 'at_limit' | 'over_limit' | 'unlimited';
  isUnlimited: boolean;
  isWithinLimit: boolean;
  isAtLimit: boolean;
  isOverLimit: boolean;
  canInvite: boolean;
  canReactivate: boolean;
}

export interface ProfileFeatureResolution {
  status: 'resolved' | 'missing';
  enabled: boolean;
}

export const COUNTED_WORKSPACE_MEMBER_STATUSES = ['invited', 'active'] as const;

export type CountedWorkspaceMemberStatus = (typeof COUNTED_WORKSPACE_MEMBER_STATUSES)[number];
export type WorkspaceMemberLimitStatus = CountedWorkspaceMemberStatus | 'disabled';

export const PROFILE_ENTITLEMENTS_SELECT = [
  'profile_id',
  'plan_code',
  'source',
  'subscription_ref',
  'effective_from',
  'effective_until',
  'ideas_enabled',
  'calendar_enabled',
  'kanban_enabled',
  'references_enabled',
  'metrics_enabled',
  'social_analytics_enabled',
  'approval_enabled',
  'approval_link_creation_enabled',
  'reports_enabled',
  'max_additional_members',
  'created_at',
  'updated_at',
].join(', ');

interface BuildPlanEntitlementOptions {
  profileId: string;
  source?: EntitlementSource;
  subscriptionRef?: string | null;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const FREE_FEATURE_FLAGS = {
  ideas_enabled: true,
  calendar_enabled: true,
  kanban_enabled: true,
  references_enabled: false,
  metrics_enabled: false,
  social_analytics_enabled: false,
  approval_enabled: false,
  approval_link_creation_enabled: false,
  reports_enabled: false,
  max_additional_members: 2,
} as const;

const PRO_FEATURE_FLAGS = {
  ideas_enabled: true,
  calendar_enabled: true,
  kanban_enabled: true,
  references_enabled: true,
  metrics_enabled: true,
  social_analytics_enabled: true,
  approval_enabled: true,
  approval_link_creation_enabled: true,
  reports_enabled: true,
  max_additional_members: null,
} as const;

const toIsoString = (value?: string) => value ?? new Date().toISOString();

const buildEntitlementRecord = (
  input: BuildPlanEntitlementOptions & {
    planCode: ProfileEntitlementRecord['plan_code'];
    source: EntitlementSource;
    features: typeof FREE_FEATURE_FLAGS | typeof PRO_FEATURE_FLAGS;
  }
): ProfileEntitlementRecord => {
  const effectiveFrom = toIsoString(input.effectiveFrom);
  const createdAt = toIsoString(input.createdAt);
  const updatedAt = toIsoString(input.updatedAt);

  return {
    profile_id: input.profileId,
    plan_code: input.planCode,
    source: input.source,
    subscription_ref: input.subscriptionRef ?? null,
    effective_from: effectiveFrom,
    effective_until: input.effectiveUntil ?? null,
    ideas_enabled: input.features.ideas_enabled,
    calendar_enabled: input.features.calendar_enabled,
    kanban_enabled: input.features.kanban_enabled,
    references_enabled: input.features.references_enabled,
    metrics_enabled: input.features.metrics_enabled,
    social_analytics_enabled: input.features.social_analytics_enabled,
    approval_enabled: input.features.approval_enabled,
    approval_link_creation_enabled: input.features.approval_link_creation_enabled,
    reports_enabled: input.features.reports_enabled,
    max_additional_members: input.features.max_additional_members,
    created_at: createdAt,
    updated_at: updatedAt,
  };
};

const buildFeatureFlags = (
  entitlements: ProfileEntitlementRecord | ResolvedProfileEntitlements
): ProfileFeatureFlags => ({
  ideas: entitlements.ideas_enabled,
  calendar: entitlements.calendar_enabled,
  kanban: entitlements.kanban_enabled,
  references: entitlements.references_enabled,
  metrics: entitlements.metrics_enabled,
  socialAnalytics: entitlements.social_analytics_enabled,
  approval: entitlements.approval_enabled,
  approvalLinkCreation: entitlements.approval_link_creation_enabled,
  reports: entitlements.reports_enabled,
  team: entitlements.max_additional_members === null || entitlements.max_additional_members >= 0,
});

export const buildFreeEntitlements = (
  input: BuildPlanEntitlementOptions
): ProfileEntitlementRecord =>
  buildEntitlementRecord({
    ...input,
    planCode: 'free',
    source: input.source ?? 'default_free',
    features: FREE_FEATURE_FLAGS,
  });

export const buildProEntitlements = (
  input: BuildPlanEntitlementOptions
): ProfileEntitlementRecord =>
  buildEntitlementRecord({
    ...input,
    planCode: 'pro',
    source: input.source ?? 'stripe',
    features: PRO_FEATURE_FLAGS,
  });

export const resolveProfileEntitlements = (
  entitlements: ProfileEntitlementRecord
): ResolvedProfileEntitlements => ({
  ...entitlements,
  features: buildFeatureFlags(entitlements),
});

export const hasProfileFeature = (
  entitlements: ProfileEntitlementRecord | ResolvedProfileEntitlements,
  feature: ProfileFeature
) => buildFeatureFlags(entitlements)[feature];

export const resolveProfileFeature = (
  entitlements: ProfileEntitlementRecord | ResolvedProfileEntitlements | null | undefined,
  feature: ProfileFeature
): ProfileFeatureResolution => {
  if (!entitlements) {
    return {
      status: 'missing',
      enabled: false,
    };
  }

  return {
    status: 'resolved',
    enabled: hasProfileFeature(entitlements, feature),
  };
};

export const computeSeatState = (input: {
  additionalMemberCount: number;
  maxAdditionalMembers: number | null;
}): ProfileSeatState => {
  const additionalMemberCount = Math.max(0, Math.trunc(input.additionalMemberCount));
  const maxAdditionalMembers =
    input.maxAdditionalMembers === null
      ? null
      : Math.max(0, Math.trunc(input.maxAdditionalMembers));

  if (maxAdditionalMembers === null) {
    return {
      additionalMemberCount,
      maxAdditionalMembers,
      remainingAdditionalMembers: null,
      state: 'unlimited',
      isUnlimited: true,
      isWithinLimit: true,
      isAtLimit: false,
      isOverLimit: false,
      canInvite: true,
      canReactivate: true,
    };
  }

  const remainingAdditionalMembers = Math.max(maxAdditionalMembers - additionalMemberCount, 0);
  const isOverLimit = additionalMemberCount > maxAdditionalMembers;
  const isAtLimit = additionalMemberCount === maxAdditionalMembers;

  return {
    additionalMemberCount,
    maxAdditionalMembers,
    remainingAdditionalMembers,
    state: isOverLimit ? 'over_limit' : isAtLimit ? 'at_limit' : 'within_limit',
    isUnlimited: false,
    isWithinLimit: !isOverLimit,
    isAtLimit,
    isOverLimit,
    canInvite: additionalMemberCount < maxAdditionalMembers,
    canReactivate: additionalMemberCount < maxAdditionalMembers,
  };
};

export const isCountedWorkspaceMemberStatus = (
  status?: string | null
): status is CountedWorkspaceMemberStatus => {
  return status === 'invited' || status === 'active';
};

export const doesWorkspaceMemberTransitionConsumeSeat = (input: {
  previousProfileId?: string | null;
  nextProfileId?: string | null;
  previousStatus?: string | null;
  nextStatus?: string | null;
}) => {
  if (!isCountedWorkspaceMemberStatus(input.nextStatus)) {
    return false;
  }

  const sameProfile =
    !!input.previousProfileId &&
    !!input.nextProfileId &&
    input.previousProfileId === input.nextProfileId;

  if (!sameProfile) {
    return true;
  }

  return !isCountedWorkspaceMemberStatus(input.previousStatus);
};
