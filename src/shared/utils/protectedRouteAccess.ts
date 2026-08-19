export type LegacyCommercialAccessStatus =
  | 'trial_active'
  | 'trial_expired'
  | 'paid'
  | 'pro'
  | 'blocked'
  | 'missing'
  | 'unknown'
  | null
  | undefined;

export type ProtectedProduct = 'workspace' | 'metric-hub';
export type ProtectedRouteDecision = 'loading' | 'allow' | 'redirect_login';

export const DEFAULT_POSTHUB_AUTHENTICATED_PATH = '/workspace/dashboard';
export const DEFAULT_ADMIN_AUTHENTICATED_PATH = '/workspace/admin';
export const LEGACY_COMMERCIAL_PROTECTED_PATH_PREFIXES = ['/metric-hub/app'] as const;

export const canAccessLegacyCommercialProduct = (
  accessStatus?: LegacyCommercialAccessStatus
) =>
  accessStatus === 'pro' || accessStatus === 'paid' || accessStatus === 'trial_active';

export const requiresLegacyCommercialGate = (path?: string | null) => {
  if (!path) return false;

  return LEGACY_COMMERCIAL_PROTECTED_PATH_PREFIXES.some((protectedPrefix) =>
    path.startsWith(protectedPrefix)
  );
};

export const canAccessRequestedProductAfterLogin = (params: {
  redirectTo?: string | null;
  accessStatus?: LegacyCommercialAccessStatus;
}) => {
  if (!requiresLegacyCommercialGate(params.redirectTo)) {
    return true;
  }

  return canAccessLegacyCommercialProduct(params.accessStatus);
};

export const resolveProtectedRouteDecision = (params: {
  isLoading: boolean;
  hasAuthenticatedSession: boolean;
  product: ProtectedProduct;
  accessStatus?: LegacyCommercialAccessStatus;
}): ProtectedRouteDecision => {
  if (params.isLoading) {
    return 'loading';
  }

  if (!params.hasAuthenticatedSession) {
    return 'redirect_login';
  }

  if (params.product === 'workspace') {
    return 'allow';
  }

  return canAccessLegacyCommercialProduct(params.accessStatus) ? 'allow' : 'redirect_login';
};

export const resolvePostAuthDestination = (params: {
  redirectTo?: string | null;
  isAdmin?: boolean;
}) => {
  if (params.redirectTo) {
    return params.redirectTo;
  }

  return params.isAdmin
    ? DEFAULT_ADMIN_AUTHENTICATED_PATH
    : DEFAULT_POSTHUB_AUTHENTICATED_PATH;
};
