import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../app/context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-brand"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const canAccessWorkspace =
    user.accessStatus === 'pro' ||
    user.accessStatus === 'paid' ||
    user.accessStatus === 'trial_active';

  if (!canAccessWorkspace) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
