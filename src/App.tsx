import * as React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { PublicApprovalPage } from './pages/PublicApprovalPage';
import { WorkspaceLayout } from './modules/workspace/WorkspaceLayout';
import { ProtectedRoute } from './shared/components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/aprovacao/:token" element={<PublicApprovalPage />} />

      {/* Protected Workspace Routes */}
      <Route path="/workspace/*" element={<ProtectedRoute />}>
        <Route path="*" element={<WorkspaceLayout />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
