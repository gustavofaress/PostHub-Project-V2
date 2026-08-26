import {
  computeSeatState,
  doesWorkspaceMemberTransitionConsumeSeat,
  isCountedWorkspaceMemberStatus,
  PROFILE_ENTITLEMENTS_SELECT,
  type ProfileEntitlementRecord,
  type ProfileFeature,
  type ResolvedProfileEntitlements,
  type WorkspaceMemberLimitStatus,
} from '../../../shared/profile-entitlements.ts';
import {
  resolveProfileEntitlements,
} from '../../../shared/profile-entitlements.ts';
import {
  resolveProfileCommercialFeatureAccess,
  type ProfileCommercialAccessSource,
} from '../../../shared/profile-commercial-access.ts';

export {
  computeSeatState,
  doesWorkspaceMemberTransitionConsumeSeat,
  isCountedWorkspaceMemberStatus,
};

export type { WorkspaceMemberLimitStatus };
export const PROFILE_FEATURE_NOT_ENABLED_CODE = 'PROFILE_FEATURE_NOT_ENABLED';

type QueryChain = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

type SupabaseAdminClientLike = {
  from: (table: string) => QueryChain;
};

export interface ProfileCommercialFeatureAccess {
  feature: ProfileFeature;
  enabled: boolean;
  source: ProfileCommercialAccessSource;
  entitlements: ResolvedProfileEntitlements | null;
  actorUserId: string | null;
  fallbackUserId: string | null;
  currentPlan: string | null;
  isAdmin: boolean;
}

export interface ProfileCommercialFeatureError extends Error {
  code: typeof PROFILE_FEATURE_NOT_ENABLED_CODE;
  feature: ProfileFeature;
  status: number;
  publicMessage: string;
}

export async function getProfileEntitlement(
  adminClient: SupabaseAdminClientLike,
  profileId: string
): Promise<ResolvedProfileEntitlements | null> {
  const { data, error } = await adminClient
    .from('profile_entitlements')
    .select(PROFILE_ENTITLEMENTS_SELECT)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return resolveProfileEntitlements(data as unknown as ProfileEntitlementRecord);
}

async function loadProfileOwnerUserId(
  adminClient: SupabaseAdminClientLike,
  profileId: string
): Promise<string | null> {
  const { data, error } = await adminClient
    .from('client_profiles')
    .select('user_id')
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const profileRecord = data as { user_id?: unknown } | null;
  return typeof profileRecord?.user_id === 'string' ? profileRecord.user_id : null;
}

async function loadCommercialFallbackActor(
  adminClient: SupabaseAdminClientLike,
  params: {
    profileId: string;
    actorUserId?: string | null;
  }
) {
  const fallbackUserId =
    params.actorUserId?.trim() || (await loadProfileOwnerUserId(adminClient, params.profileId));

  if (!fallbackUserId) {
    return {
      fallbackUserId: null,
      currentPlan: null,
      isAdmin: false,
    };
  }

  const { data, error } = await adminClient
    .from('usuarios')
    .select('current_plan, is_admin')
    .eq('id', fallbackUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const userRecord = data as { current_plan?: unknown; is_admin?: unknown } | null;

  return {
    fallbackUserId,
    currentPlan: typeof userRecord?.current_plan === 'string' ? userRecord.current_plan : null,
    isAdmin: !!userRecord?.is_admin,
  };
}

export function createProfileFeatureDisabledError(
  feature: ProfileFeature
): ProfileCommercialFeatureError {
  const error = new Error('Este perfil não possui acesso ao recurso solicitado.') as
    & Error
    & ProfileCommercialFeatureError;
  error.code = PROFILE_FEATURE_NOT_ENABLED_CODE;
  error.feature = feature;
  error.status = 403;
  error.publicMessage = 'Este perfil não possui acesso ao recurso solicitado.';
  return error;
}

export async function resolveProfileCommercialFeatureAccessForUser(
  adminClient: SupabaseAdminClientLike,
  params: {
    profileId: string;
    feature: ProfileFeature;
    actorUserId?: string | null;
    preferEntitlementsOverAdmin?: boolean;
  }
): Promise<ProfileCommercialFeatureAccess> {
  const entitlements = await getProfileEntitlement(adminClient, params.profileId);
  const fallbackActor = await loadCommercialFallbackActor(adminClient, {
    profileId: params.profileId,
    actorUserId: params.actorUserId,
  });

  const resolvedAccess = resolveProfileCommercialFeatureAccess({
    feature: params.feature,
    entitlements,
    currentPlan: fallbackActor.currentPlan,
    isAdmin:
      params.preferEntitlementsOverAdmin && entitlements ? false : fallbackActor.isAdmin,
  });

  return {
    ...resolvedAccess,
    entitlements,
    actorUserId: params.actorUserId?.trim() || null,
    fallbackUserId: fallbackActor.fallbackUserId,
    currentPlan: fallbackActor.currentPlan,
    isAdmin: fallbackActor.isAdmin,
  };
}

export async function assertProfileCommercialFeature(
  adminClient: SupabaseAdminClientLike,
  params: {
    profileId: string;
    feature: ProfileFeature;
    actorUserId?: string | null;
    preferEntitlementsOverAdmin?: boolean;
  }
): Promise<ProfileCommercialFeatureAccess> {
  const access = await resolveProfileCommercialFeatureAccessForUser(adminClient, params);

  if (!access.enabled) {
    throw createProfileFeatureDisabledError(params.feature);
  }

  return access;
}
