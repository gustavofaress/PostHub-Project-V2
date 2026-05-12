import * as React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './app/context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { AcceptInvitePage } from './pages/auth/AcceptInvitePage';
import { MemberLoginPage } from './pages/auth/MemberLoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { SupportPasswordResetPage } from './pages/auth/SupportPasswordResetPage';
import { PublicApprovalPage } from './pages/PublicApprovalPage';
import { PublicCalendarApprovalPage } from './pages/PublicCalendarApprovalPage';
import { PricingPage } from './pages/PricingPage';
import { FocusedLandingPage } from './pages/FocusedLandingPage';
import { AffiliateReferralPage } from './pages/AffiliateReferralPage';
import { MetricHubPage } from './pages/MetricHubPage';
import { MetricHubAppPage } from './pages/MetricHubAppPage';
import { ResponsiveWorkspaceLayout } from './modules/workspace/ResponsiveWorkspaceLayout';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { trackMetaEvent } from './services/meta-conversions.service';
import { metaAttributionService } from './services/meta-attribution.service';
import { affiliateAttributionService } from './services/affiliate-attribution.service';

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const lastTrackedPath = React.useRef('');
  const lastAppliedAffiliateKey = React.useRef('');
  const applyingAffiliateKey = React.useRef('');

  React.useEffect(() => {
    const path = `${location.pathname}${location.search}`;

    if (lastTrackedPath.current === path) return;

    lastTrackedPath.current = path;
    metaAttributionService.captureFromCurrentLocation();
    trackMetaEvent({ eventName: 'PageView' });
  }, [location.pathname, location.search]);

  React.useEffect(() => {
    const affiliateSnapshot = affiliateAttributionService.captureFromCurrentLocation();

    if (!user?.id || !affiliateSnapshot.affiliateCode) {
      return;
    }

    const applyKey = `${user.id}:${affiliateSnapshot.affiliateCode}`;

    if (
      lastAppliedAffiliateKey.current === applyKey ||
      applyingAffiliateKey.current === applyKey
    ) {
      return;
    }

    applyingAffiliateKey.current = applyKey;

    void affiliateAttributionService
      .applyToCurrentUser(affiliateSnapshot.affiliateCode)
      .then((result) => {
        if (!result) return;

        if (
          result.applied ||
          result.locked ||
          result.reason === 'self_referral' ||
          result.reason === 'affiliate_not_found' ||
          result.reason === 'invalid_code'
        ) {
          lastAppliedAffiliateKey.current = applyKey;
        }

        if (result.reason === 'affiliate_not_found' || result.reason === 'invalid_code') {
          affiliateAttributionService.clear();
        }
      })
      .catch((error) => {
        console.error('[affiliate-attribution] failed to apply referral:', error);
      })
      .finally(() => {
        if (applyingAffiliateKey.current === applyKey) {
          applyingAffiliateKey.current = '';
        }
      });
  }, [location.pathname, location.search, user?.id]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/lp" element={<FocusedLandingPage />} />
      <Route path="/metric-hub" element={<MetricHubPage />} />
      <Route path="/r/:affiliateCode" element={<AffiliateReferralPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/suporte/redefinir-senha" element={<SupportPasswordResetPage />} />
      <Route path="/member-login" element={<MemberLoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route path="/aprovacao/:token" element={<PublicApprovalPage />} />
      <Route path="/calendario/aprovacao/:token" element={<PublicCalendarApprovalPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/metric-hub/app" element={<MetricHubAppPage />} />
      </Route>

      {/* Protected Workspace Routes */}
      <Route path="/workspace/*" element={<ProtectedRoute />}>
        <Route path="*" element={<ResponsiveWorkspaceLayout />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
