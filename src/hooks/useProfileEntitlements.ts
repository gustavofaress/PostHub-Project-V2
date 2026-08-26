import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../app/context/AuthContext';
import { profileEntitlementsService } from '../services/profile-entitlements.service';
import type { ResolvedProfileEntitlements } from '../types/profile-entitlements.ts';

export type ProfileEntitlementQueryStatus = 'loading' | 'resolved' | 'missing' | 'error';

export interface UseProfileEntitlementsResult {
  status: ProfileEntitlementQueryStatus;
  entitlements: ResolvedProfileEntitlements | null;
  error: Error | null;
  hasProfileId: boolean;
  isLoading: boolean;
  isResolved: boolean;
  isMissing: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

export const getProfileEntitlementsKey = (userId?: string | null, profileId?: string | null) => [
  'profile-entitlements',
  userId ?? 'anonymous',
  profileId ?? 'no-profile',
];

export const useProfileEntitlements = (
  profileId?: string | null
): UseProfileEntitlementsResult => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: getProfileEntitlementsKey(user?.id, profileId),
    queryFn: () => profileEntitlementsService.getResolvedByProfileId(profileId as string),
    enabled: !!profileId,
  });

  let status: ProfileEntitlementQueryStatus = 'resolved';

  if (query.isPending) {
    status = 'loading';
  } else if (query.isError) {
    status = 'error';
  } else if (!profileId || !query.data) {
    status = 'missing';
  }

  return {
    status,
    entitlements: status === 'resolved' ? ((query.data ?? null) as ResolvedProfileEntitlements) : null,
    error: status === 'error' ? (query.error as Error) : null,
    hasProfileId: !!profileId,
    isLoading: status === 'loading',
    isResolved: status === 'resolved',
    isMissing: status === 'missing',
    isError: status === 'error',
    refetch: query.refetch,
  };
};
