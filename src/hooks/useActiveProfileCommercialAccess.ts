import * as React from 'react';
import { useAuth } from '../app/context/AuthContext';
import { useProfile } from '../app/context/ProfileContext';
import {
  canUseActiveProfileFeature,
  resolveActiveProfileCommercialAccess,
  resolveActiveProfileFeatureAccess,
  type ActiveProfileCommercialAccess,
  type CommercialFeatureAccess,
} from '../shared/utils/activeProfileCommercialAccess.ts';
import type { ProfileFeature } from '../types/profile-entitlements.ts';
import type { ResolvedProfileEntitlements } from '../types/profile-entitlements.ts';
import { profileEntitlementsService } from '../services/profile-entitlements.service';

interface UseActiveProfileCommercialAccessResult extends ActiveProfileCommercialAccess {
  activeProfileId: string | null;
  canUseFeature: (feature: ProfileFeature) => boolean;
  resolveFeatureAccess: (feature: ProfileFeature) => CommercialFeatureAccess;
  refetch: () => Promise<unknown>;
}

export const useActiveProfileCommercialAccess = (): UseActiveProfileCommercialAccessResult => {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [queryStatus, setQueryStatus] = React.useState<
    'loading' | 'resolved' | 'missing' | 'error'
  >('loading');
  const [entitlements, setEntitlements] = React.useState<ResolvedProfileEntitlements | null>(null);
  const requestIdRef = React.useRef(0);

  const loadEntitlements = React.useCallback(async () => {
    const profileId = activeProfile?.id;
    const requestId = ++requestIdRef.current;

    if (!profileId) {
      setQueryStatus('loading');
      setEntitlements(null);
      return null;
    }

    setQueryStatus('loading');
    setEntitlements(null);

    try {
      const nextEntitlements = await profileEntitlementsService.getResolvedByProfileId(profileId);

      if (requestId !== requestIdRef.current) {
        return nextEntitlements;
      }

      setEntitlements(nextEntitlements);
      setQueryStatus(nextEntitlements ? 'resolved' : 'missing');
      return nextEntitlements;
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        throw error;
      }

      setEntitlements(null);
      setQueryStatus('error');
      throw error;
    }
  }, [activeProfile?.id]);

  React.useEffect(() => {
    if (!activeProfile?.id) {
      setQueryStatus('loading');
      setEntitlements(null);
      return;
    }

    void loadEntitlements().catch(() => undefined);
  }, [activeProfile?.id, loadEntitlements]);

  const access = React.useMemo(
    () =>
      resolveActiveProfileCommercialAccess({
        hasActiveProfile: !!activeProfile?.id,
        entitlementStatus: queryStatus,
        entitlements,
        currentPlan: user?.currentPlan,
        isAdmin: !!user?.isAdmin,
      }),
    [
      activeProfile?.id,
      entitlements,
      queryStatus,
      user?.currentPlan,
      user?.isAdmin,
    ]
  );

  return React.useMemo(
    () => ({
      ...access,
      activeProfileId: activeProfile?.id ?? null,
      canUseFeature: (feature: ProfileFeature) => canUseActiveProfileFeature(access, feature),
      resolveFeatureAccess: (feature: ProfileFeature) =>
        resolveActiveProfileFeatureAccess(access, feature),
      refetch: loadEntitlements,
    }),
    [access, activeProfile?.id, loadEntitlements]
  );
};
