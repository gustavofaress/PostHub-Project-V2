import { supabase } from '../shared/utils/supabase';
import { resolveProfileEntitlements } from '../shared/utils/profileEntitlements.ts';
import type {
  ProfileEntitlementRecord,
  ResolvedProfileEntitlements,
} from '../types/profile-entitlements.ts';
import { PROFILE_ENTITLEMENTS_SELECT } from '../types/profile-entitlements.ts';

export const profileEntitlementsService = {
  async getByProfileId(profileId: string): Promise<ProfileEntitlementRecord | null> {
    if (!supabase || !profileId) {
      return null;
    }

    const { data, error } = await supabase
      .from('profile_entitlements')
      .select(PROFILE_ENTITLEMENTS_SELECT)
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as unknown as ProfileEntitlementRecord | null) ?? null;
  },

  async getResolvedByProfileId(profileId: string): Promise<ResolvedProfileEntitlements | null> {
    const record = await this.getByProfileId(profileId);

    if (!record) {
      return null;
    }

    return resolveProfileEntitlements(record);
  },
};
