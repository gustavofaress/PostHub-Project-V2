import * as React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { AcceptInvitePage } from './pages/auth/AcceptInvitePage';
import { MemberLoginPage } from './pages/auth/MemberLoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { SupportPasswordResetPage } from './pages/auth/SupportPasswordResetPage';
import { PublicApprovalPage } from './pages/PublicApprovalPage';
import { PricingPage } from './pages/PricingPage';
import { FocusedLandingPage } from './pages/FocusedLandingPage';
import { ResponsiveWorkspaceLayout } from './modules/workspace/ResponsiveWorkspaceLayout';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { trackMetaEvent } from './services/meta-conversions.service';
import { metaAttributionService } from './services/meta-attribution.service';

export default function App() {
  const location = useLocation();
  const lastTrackedPath = React.useRef('');

  React.useEffect(() => {
    const path = `${location.pathname}${location.search}`;

    if (lastTrackedPath.current === path) return;

    lastTrackedPath.current = path;
    metaAttributionService.captureFromCurrentLocation();
    trackMetaEvent({ eventName: 'PageView' });
  }, [location.pathname, location.search]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/lp" element={<FocusedLandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/suporte/redefinir-senha" element={<SupportPasswordResetPage />} />
      <Route path="/member-login" element={<MemberLoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/pricing" element={<PricingPage />} />
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
