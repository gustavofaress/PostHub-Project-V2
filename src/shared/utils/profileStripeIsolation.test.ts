import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const checkoutSource = readFileSync(
  new URL('../../../supabase/functions/create-profile-pro-checkout/index.ts', import.meta.url),
  'utf8'
);

const webhookSource = readFileSync(
  new URL('../../../supabase/functions/stripe-profile-entitlement-webhook/index.ts', import.meta.url),
  'utf8'
);

const migrationSql = readFileSync(
  new URL('../../../supabase/migrations/20260825222618_profile_stripe_subscriptions_foundation.sql', import.meta.url),
  'utf8'
);

test('new Stripe checkout and webhook stay isolated from legacy billing tables and current_plan', () => {
  const combinedSource = `${checkoutSource}\n${webhookSource}`;

  assert.doesNotMatch(combinedSource, /\.from\('profile_subscriptions'\)/);
  assert.doesNotMatch(combinedSource, /\.from\('profile_purchase_credits'\)/);
  assert.doesNotMatch(combinedSource, /\.from\('subscribers'\)/);
  assert.doesNotMatch(combinedSource, /current_plan/);
  assert.doesNotMatch(combinedSource, /client_profiles\.subscription_id/);
  assert.doesNotMatch(
    combinedSource,
    /\.from\('client_profiles'\)\s*\.select\([^)]*subscription_id/i
  );
  assert.doesNotMatch(combinedSource, /update\s+client_profiles[\s\S]*subscription_id/i);
});

test('new webhook uses the dedicated profile webhook secret and Stripe signature verification', () => {
  assert.match(webhookSource, /STRIPE_PROFILE_WEBHOOK_SECRET/);
  assert.match(
    webhookSource,
    /if\s*\(!STRIPE_SECRET_KEY\s*\|\|\s*!STRIPE_PROFILE_WEBHOOK_SECRET\s*\|\|\s*!STRIPE_PRICE_PROFILE_PRO\)/
  );
  assert.match(webhookSource, /request\.headers\.get\('stripe-signature'\)/);
  assert.match(webhookSource, /constructEventAsync/);
  assert.doesNotMatch(webhookSource, /STRIPE_PRICE_EXTRA_PROFILE/);
  assert.doesNotMatch(webhookSource, /loadSubscriptionByEmail/i);
  assert.doesNotMatch(webhookSource, /customer_email/i);
});

test('profile stripe subscriptions migration is scoped to the new table only', () => {
  assert.match(migrationSql, /create table if not exists public\.profile_stripe_subscriptions/i);
  assert.match(
    migrationSql,
    /profile_id uuid not null references public\.client_profiles\(id\) on delete restrict/i
  );
  assert.match(migrationSql, /stripe_checkout_session_id text/i);
  assert.match(migrationSql, /checkout_expires_at timestamptz/i);
  assert.match(migrationSql, /unique \(stripe_subscription_id\)/i);
  assert.match(migrationSql, /unique \(stripe_checkout_session_id\)/i);
  assert.match(migrationSql, /'checkout_pending'/i);
  assert.match(
    migrationSql,
    /create unique index if not exists profile_stripe_subscriptions_current_profile_unique_idx/i
  );
  assert.match(
    migrationSql,
    /where status in \('checkout_pending', 'incomplete', 'trialing', 'active', 'past_due', 'paused'\)/i
  );
  assert.match(migrationSql, /alter table public\.profile_stripe_subscriptions enable row level security/i);
  assert.doesNotMatch(migrationSql, /on delete cascade/i);
  assert.doesNotMatch(migrationSql, /update public\.usuarios/i);
  assert.doesNotMatch(migrationSql, /profile_subscriptions/i);
  assert.doesNotMatch(migrationSql, /profile_purchase_credits/i);
});
