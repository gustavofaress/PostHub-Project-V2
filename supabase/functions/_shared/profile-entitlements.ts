import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
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
  hasProfileFeature,
  resolveProfileEntitlements,
} from '../../../shared/profile-entitlements.ts';

export {
  computeSeatState,
  doesWorkspaceMemberTransitionConsumeSeat,
  isCountedWorkspaceMemberStatus,
};

export type { WorkspaceMemberLimitStatus };

export async function getProfileEntitlement(
  adminClient: SupabaseClient,
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

export async function assertProfileFeature(
  adminClient: SupabaseClient,
  params: {
    profileId: string;
    feature: ProfileFeature;
  }
): Promise<ResolvedProfileEntitlements> {
  const entitlements = await getProfileEntitlement(adminClient, params.profileId);

  if (!entitlements) {
    throw new Error(`Profile entitlement not found for profile ${params.profileId}.`);
  }

  if (!hasProfileFeature(entitlements, params.feature)) {
    throw new Error(
      `Profile ${params.profileId} is not entitled to access feature ${params.feature}.`
    );
  }

  return entitlements;
}
