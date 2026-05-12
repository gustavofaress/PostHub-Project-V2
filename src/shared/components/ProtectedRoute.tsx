import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/context/AuthContext';
import { buildAuthPath } from '../utils/authPaths';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const redirectTo = `${location.pathname}${location.search}${location.hash}`;
  const product = location.pathname.startsWith('/metric-hub') ? 'metric-hub' : null;
  const loginPath = buildAuthPath('/login', {
    redirectTo,
    product,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-brand"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={loginPath} replace />;
  }

  const canAccessWorkspace =
    user.accessStatus === 'pro' ||
    user.accessStatus === 'paid' ||
    user.accessStatus === 'trial_active';

  if (!canAccessWorkspace) {
    return <Navigate to={loginPath} replace />;
  }

  return <Outlet />;
};
