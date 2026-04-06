import * as React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { AcceptInvitePage } from './pages/auth/AcceptInvitePage';
import { PublicApprovalPage } from './pages/PublicApprovalPage';
import { ResponsiveWorkspaceLayout } from './modules/workspace/ResponsiveWorkspaceLayout';
import { ProtectedRoute } from './shared/components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route path="/aprovacao/:token" element={<PublicApprovalPage />} />

      {/* Protected Workspace Routes */}
      <Route path="/workspace/*" element={<ProtectedRoute />}>
        <Route path="*" element={<ResponsiveWorkspaceLayout />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
