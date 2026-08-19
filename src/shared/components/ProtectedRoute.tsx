import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/context/AuthContext';
import { buildAuthPath } from '../utils/authPaths';
import {
  resolveProtectedRouteDecision,
  type ProtectedProduct,
} from '../utils/protectedRouteAccess';

interface ProtectedRouteProps {
  product?: ProtectedProduct;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ product = 'workspace' }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const redirectTo = `${location.pathname}${location.search}${location.hash}`;
  const productContext = product === 'metric-hub' ? 'metric-hub' : null;
  const loginPath = buildAuthPath('/login', {
    redirectTo,
    product: productContext,
  });

  const decision = resolveProtectedRouteDecision({
    isLoading,
    hasAuthenticatedSession: isAuthenticated && !!user,
    product,
    accessStatus: user?.accessStatus,
  });

  if (decision === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-brand"></div>
      </div>
    );
  }

  if (decision === 'redirect_login') {
    return <Navigate to={loginPath} replace />;
  }

  return <Outlet />;
};
