import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pricingSource = readFileSync(
  new URL('../../pages/PricingPage.tsx', import.meta.url),
  'utf8'
);

const billingServiceSource = readFileSync(
  new URL('../../services/profile-billing.service.ts', import.meta.url),
  'utf8'
);

const pricingHelperSource = readFileSync(
  new URL('./profilePricing.ts', import.meta.url),
  'utf8'
);

const billingNoticeSource = readFileSync(
  new URL('../components/ProfileBillingReturnNotice.tsx', import.meta.url),
  'utf8'
);

const lockedModuleSource = readFileSync(
  new URL('../components/LockedModuleState.tsx', import.meta.url),
  'utf8'
);

const moduleRendererSource = readFileSync(
  new URL('../../modules/workspace/components/ModuleRenderer.tsx', import.meta.url),
  'utf8'
);

const calendarSource = readFileSync(
  new URL('../../modules/calendar/EditorialCalendar.tsx', import.meta.url),
  'utf8'
);

const navigationSource = readFileSync(
  new URL('../constants/navigation.ts', import.meta.url),
  'utf8'
);

test('Pricing page uses profile entitlement state and the profile checkout service only', () => {
  assert.match(pricingSource, /useActiveProfileCommercialAccess\(\)/);
  assert.match(pricingSource, /commercialAccess\.entitlements\?\.plan_code/);
  assert.match(pricingSource, /profileBillingService\.createProfileProCheckout\(checkoutProfileId\)/);
  assert.match(billingServiceSource, /create-profile-pro-checkout/);
  assert.doesNotMatch(pricingSource, /buildPlanPaymentLink/);
  assert.doesNotMatch(pricingSource, /affiliateAttributionService/);
  assert.doesNotMatch(pricingSource, /create-checkout/);
  assert.doesNotMatch(pricingSource, /currentPlan/);
  assert.doesNotMatch(pricingSource, /current_plan/);
  assert.doesNotMatch(pricingSource, /STRIPE_PRICE/);
  assert.doesNotMatch(pricingSource, /price_1/);
});

test('new Pricing page exposes only current FREE and PRO plans', () => {
  assert.match(pricingSource, /FREE/);
  assert.match(pricingSource, /PRO/);
  assert.match(pricingSource, /R\$ 47,90/);
  assert.match(pricingSource, /\/ mês \/ perfil/);
  assert.doesNotMatch(pricingSource, /\bStart\b/);
  assert.doesNotMatch(pricingSource, /\bGrowth\b/);
  assert.doesNotMatch(pricingSource, /START_7|start_7|trial/i);
  assert.doesNotMatch(pricingSource, /perfis ilimitados|clientes ilimitados/i);
});

test('pricing helper keeps FREE-only checkout and safe non-owner/admin/missing states', () => {
  assert.match(pricingHelperSource, /planCode === 'free'/);
  assert.match(pricingHelperSource, /input\.profileRole === 'owner'/);
  assert.match(pricingHelperSource, /isAdmin/);
  assert.match(pricingHelperSource, /entitlement_missing/);
  assert.doesNotMatch(pricingHelperSource, /currentPlan/);
  assert.doesNotMatch(pricingHelperSource, /current_plan/);
  assert.doesNotMatch(pricingHelperSource, /buildPlanPaymentLink/);
});

test('Dashboard return notice refetches entitlement without optimistic PRO unlock', () => {
  assert.match(billingNoticeSource, /profile-pro-processing/);
  assert.match(billingNoticeSource, /profile-pro-cancelled/);
  assert.match(billingNoticeSource, /commercialAccess\.refetch\(\)/);
  assert.match(billingNoticeSource, /plan_code === 'pro'/);
  assert.match(billingNoticeSource, /source === 'stripe'/);
  assert.doesNotMatch(billingNoticeSource, /buildProEntitlements/);
  assert.doesNotMatch(billingNoticeSource, /profile_entitlements/);
});

test('premium lock CTAs navigate to the new Pricing page', () => {
  assert.match(lockedModuleSource, /navigate\('\/pricing'\)/);
  assert.match(navigationSource, /\{ label: 'Fazer Upgrade', path: '\/pricing' \}/);

  const commercialResolvedBlock = moduleRendererSource.match(
    /if \(commercialFeatureAccess\?\.status === 'resolved'[\s\S]*?if \(commercialFeatureAccess\?\.status === 'legacy_fallback'/
  );
  assert.ok(commercialResolvedBlock);
  assert.doesNotMatch(commercialResolvedBlock[0], /showUpgradeActions=\{false\}/);

  const approvalCommercialBlock = calendarSource.match(
    /isApprovalLinkCommerciallyLocked \? \([\s\S]*?\) : isApprovalLinkLegacyLocked/
  );
  assert.ok(approvalCommercialBlock);
  assert.doesNotMatch(approvalCommercialBlock[0], /showUpgradeActions=\{false\}/);
});
