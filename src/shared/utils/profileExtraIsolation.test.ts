import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const checkoutSource = readFileSync(
  new URL('../../../supabase/functions/create-profile-extra-checkout/index.ts', import.meta.url),
  'utf8'
);
const statusSource = readFileSync(
  new URL('../../../supabase/functions/get-profile-extra-status/index.ts', import.meta.url),
  'utf8'
);
const webhookSource = readFileSync(
  new URL('../../../supabase/functions/stripe-profile-extra-webhook/index.ts', import.meta.url),
  'utf8'
);
const sharedSource = readFileSync(
  new URL('../../../shared/profile-extra-subscriptions.ts', import.meta.url),
  'utf8'
);
const sharedStripeSource = readFileSync(
  new URL('../../../shared/profile-stripe-subscriptions.ts', import.meta.url),
  'utf8'
);
const edgeSharedSource = readFileSync(
  new URL('../../../supabase/functions/_shared/stripe/profile-extra.ts', import.meta.url),
  'utf8'
);
const configSource = readFileSync(new URL('../../../supabase/config.toml', import.meta.url), 'utf8');

const combinedNewFlowSource = [
  checkoutSource,
  statusSource,
  webhookSource,
  sharedSource,
  sharedStripeSource,
  edgeSharedSource,
].join('\n');

test('profile extra flow uses the dedicated new Stripe env and never hardcodes a Price ID', () => {
  assert.match(combinedNewFlowSource, /STRIPE_PRICE_PROFILE_EXTRA_V1/);
  assert.doesNotMatch(combinedNewFlowSource, /STRIPE_PRICE_EXTRA_PROFILE/);
  assert.doesNotMatch(combinedNewFlowSource, /price_1TLmKQLE0cyETHYjLxDPNyBy/);
  assert.doesNotMatch(combinedNewFlowSource, /price_1[A-Za-z0-9]+/);
});

test('profile extra flow is isolated from legacy billing tables and user plan state', () => {
  assert.doesNotMatch(combinedNewFlowSource, /\.from\('profile_subscriptions'\)/);
  assert.doesNotMatch(combinedNewFlowSource, /\.from\('profile_purchase_credits'\)/);
  assert.doesNotMatch(combinedNewFlowSource, /\.from\('subscribers'\)/);
  assert.doesNotMatch(combinedNewFlowSource, /usuarios\.current_plan|current_plan/);
  assert.doesNotMatch(combinedNewFlowSource, /client_profiles\.subscription_id/);
  assert.doesNotMatch(
    combinedNewFlowSource,
    /\.from\('client_profiles'\)\s*\.select\([^)]*subscription_id/i
  );
  assert.doesNotMatch(combinedNewFlowSource, /update\s+client_profiles[\s\S]*subscription_id/i);
  assert.doesNotMatch(combinedNewFlowSource, /create-checkout/);
});

test('profile extra webhook requires signature before trusting payload metadata', () => {
  assert.match(webhookSource, /STRIPE_PROFILE_EXTRA_WEBHOOK_SECRET/);
  assert.match(webhookSource, /request\.headers\.get\('stripe-signature'\)/);
  assert.match(webhookSource, /constructEventAsync/);

  assert.ok(
    webhookSource.indexOf('constructEventAsync') <
      webhookSource.indexOf('const { snapshot, paymentStatus } = await resolveEventSnapshot')
  );
  assert.doesNotMatch(webhookSource, /loadSubscriptionByEmail/i);
  assert.doesNotMatch(webhookSource, /customer_email/i);
});

test('profile extra functions use Stripe Clover SDK only in the new flow', () => {
  assert.match(combinedNewFlowSource, /npm:stripe@20\.4\.1/);
  assert.doesNotMatch(combinedNewFlowSource, /npm:stripe@17\.7\.0/);
  assert.match(combinedNewFlowSource, /parent\.type === 'subscription_details'/);
  assert.match(combinedNewFlowSource, /current_period_end/);
  assert.doesNotMatch(combinedNewFlowSource, /subscription\.current_period_end/);
});

test('profile extra functions have isolated Supabase verify_jwt config', () => {
  assert.match(
    configSource,
    /\[functions\.create-profile-extra-checkout\]\s+verify_jwt = true/i
  );
  assert.match(configSource, /\[functions\.get-profile-extra-status\]\s+verify_jwt = true/i);
  assert.match(
    configSource,
    /\[functions\.stripe-profile-extra-webhook\]\s+verify_jwt = false/i
  );
});
