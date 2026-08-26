import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landingSource = readFileSync(
  new URL('../../pages/LandingPage.tsx', import.meta.url),
  'utf8'
);
const focusedLandingSource = readFileSync(
  new URL('../../pages/FocusedLandingPage.tsx', import.meta.url),
  'utf8'
);
const pricingPlansSource = landingSource.match(
  /const pricingPlans:[\s\S]*?\n\];\n\nconst howItWorksSteps/
)?.[0] ?? '';

test('public site presents only the current FREE and PRO offer', () => {
  assert.match(pricingPlansSource, /name: 'FREE'/);
  assert.match(pricingPlansSource, /name: 'PRO'/);
  assert.match(pricingPlansSource, /price: 'R\$ 0'/);
  assert.match(pricingPlansSource, /price: 'R\$ 47,90'/);
  assert.match(pricingPlansSource, /priceDetail: 'por perfil\/mês'/);
  assert.match(pricingPlansSource, /Owner \+ até 2 membros adicionais/);
  assert.match(pricingPlansSource, /Membros adicionais ilimitados/);
  assert.match(pricingPlansSource, /Perfis adicionais por R\$ 47,90\/mês cada/);
  assert.doesNotMatch(pricingPlansSource, /\bStart\b|\bGrowth\b|START_7|teste gratis|teste grátis|trial/i);
  assert.doesNotMatch(pricingPlansSource, /perfis ilimitados|clientes ilimitados/i);
});

test('public CTAs use signup and internal profile pricing instead of legacy billing', () => {
  assert.match(landingSource, /affiliateAttributionService\.buildPath\('\/signup'/);
  assert.match(landingSource, /buildAuthPath\('\/signup', \{[\s\S]*redirectTo: '\/pricing'/);
  assert.doesNotMatch(landingSource, /buildPlanPaymentLink|create-checkout|STRIPE_PRICE|price_|plink_/);
  assert.doesNotMatch(focusedLandingSource, /teste grátis|trial/i);
  assert.match(focusedLandingSource, /Começar grátis/);
});

test('public pricing remains responsive with two stacked-capable cards', () => {
  assert.match(landingSource, /grid max-w-5xl gap-6 lg:grid-cols-2/);
  assert.match(landingSource, /w-full items-center justify-center/);
});
