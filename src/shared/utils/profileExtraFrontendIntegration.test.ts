import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  resolveAddProfileAction,
  resolveAddProfileButtonLabel,
  resolveAddProfileHelperMessage,
} from './profileExtraBilling';

const profileContextSource = readFileSync(
  new URL('../../app/context/ProfileContext.tsx', import.meta.url),
  'utf8'
);
const headerSource = readFileSync(
  new URL('../../modules/workspace/components/Header.tsx', import.meta.url),
  'utf8'
);
const mobileProfileSheetSource = readFileSync(
  new URL('../../modules/mobile/components/MobileProfileSheet.tsx', import.meta.url),
  'utf8'
);
const billingNoticeSource = readFileSync(
  new URL('../components/ProfileBillingReturnNotice.tsx', import.meta.url),
  'utf8'
);
const profileExtraBillingServiceSource = readFileSync(
  new URL('../../services/profile-extra-billing.service.ts', import.meta.url),
  'utf8'
);
const configSource = readFileSync(new URL('../../../supabase/config.toml', import.meta.url), 'utf8');

test('add profile helper routes FREE to Pricing and PRO/legacy_pro owner to paid extra checkout', () => {
  assert.equal(
    resolveAddProfileAction({
      activeProfileId: 'profile-free',
      profileRole: 'owner',
      entitlementStatus: 'resolved',
      planCode: 'free',
      isAdmin: false,
      availableProfileSlots: 0,
      checkoutPending: false,
    }),
    'go_to_pricing'
  );

  for (const planCode of ['pro', 'legacy_pro']) {
    assert.equal(
      resolveAddProfileAction({
        activeProfileId: `profile-${planCode}`,
        profileRole: 'owner',
        entitlementStatus: 'resolved',
        planCode,
        isAdmin: false,
        availableProfileSlots: 0,
        checkoutPending: false,
      }),
      'start_extra_checkout'
    );
  }
});

test('add profile helper blocks members, admins, missing entitlements, and unsupported legacy states', () => {
  assert.equal(
    resolveAddProfileAction({
      activeProfileId: 'profile-1',
      profileRole: 'editor',
      entitlementStatus: 'resolved',
      planCode: 'pro',
      isAdmin: false,
      availableProfileSlots: 0,
      checkoutPending: false,
    }),
    'owner_required'
  );
  assert.equal(
    resolveAddProfileAction({
      activeProfileId: 'profile-1',
      profileRole: 'owner',
      entitlementStatus: 'resolved',
      planCode: 'pro',
      isAdmin: true,
      availableProfileSlots: 0,
      checkoutPending: false,
    }),
    'admin_create'
  );
  assert.equal(
    resolveAddProfileAction({
      activeProfileId: 'profile-1',
      profileRole: 'owner',
      entitlementStatus: 'missing',
      planCode: null,
      isAdmin: false,
      availableProfileSlots: 0,
      checkoutPending: false,
    }),
    'entitlement_missing'
  );
  assert.equal(
    resolveAddProfileAction({
      activeProfileId: 'profile-1',
      profileRole: 'owner',
      entitlementStatus: 'resolved',
      planCode: 'legacy_growth',
      isAdmin: false,
      availableProfileSlots: 0,
      checkoutPending: false,
    }),
    'unsupported_plan'
  );
});

test('add profile helper uses available paid slot before starting a new checkout', () => {
  assert.equal(
    resolveAddProfileAction({
      activeProfileId: 'profile-1',
      profileRole: 'owner',
      entitlementStatus: 'resolved',
      planCode: 'pro',
      isAdmin: false,
      availableProfileSlots: 1,
      checkoutPending: true,
    }),
    'create_profile'
  );

  assert.equal(
    resolveAddProfileAction({
      activeProfileId: 'profile-1',
      profileRole: 'owner',
      entitlementStatus: 'resolved',
      planCode: 'pro',
      isAdmin: false,
      availableProfileSlots: 0,
      checkoutPending: true,
    }),
    'checkout_pending'
  );
});

test('button labels and helper copy reflect profile extra checkout without legacy payment links', () => {
  assert.equal(resolveAddProfileButtonLabel('go_to_pricing'), 'Ver planos');
  assert.equal(resolveAddProfileButtonLabel('start_extra_checkout'), 'Comprar perfil adicional');
  assert.match(resolveAddProfileHelperMessage('owner_required'), /propriet.rio/i);
  assert.match(resolveAddProfileHelperMessage('checkout_pending'), /em andamento/i);
});

test('ProfileContext hides inactive profiles but counts all owned profiles for creation capacity', () => {
  assert.match(profileContextSource, /\.eq\('is_active', true\)/);
  assert.match(profileContextSource, /\.select\('id', \{ count: 'exact', head: true \}\)/);
  assert.match(profileContextSource, /ownedProfilesCount = count \?\? 0/);
  assert.match(profileContextSource, /profileExtraBillingService\.getProfileExtraStatus\(\)/);
  assert.doesNotMatch(profileContextSource, /profile_purchase_credits/);
  assert.doesNotMatch(profileContextSource, /subscription_id/);
});

test('desktop and mobile add profile actions use new profile extra checkout service only', () => {
  for (const source of [headerSource, mobileProfileSheetSource]) {
    assert.match(source, /profileExtraBillingService\.createProfileExtraCheckout\(activeProfile\.id\)/);
    assert.match(source, /navigate\('\/pricing'\)/);
    assert.doesNotMatch(source, /buildExtraProfilePaymentLink/);
    assert.doesNotMatch(source, /isExtraProfilePaymentLinkConfigured/);
    assert.doesNotMatch(source, /price_1TLmKQLE0cyETHYjLxDPNyBy/);
    assert.doesNotMatch(source, /STRIPE_PRICE_EXTRA_PROFILE/);
  }
});

test('profile extra return processing refetches slot status and does not create profile optimistically', () => {
  assert.match(billingNoticeSource, /profile-extra-processing/);
  assert.match(billingNoticeSource, /profileExtraBillingService\.getProfileExtraStatus\(\)/);
  assert.match(billingNoticeSource, /extraStatus\.hasAvailableSlot/);
  assert.match(billingNoticeSource, /createProfile\(extraProfileName\)/);
  assert.match(billingNoticeSource, /Nenhum perfil adicional foi criado/);
  assert.doesNotMatch(billingNoticeSource, /profile_extra_subscriptions/);
  assert.doesNotMatch(billingNoticeSource, /profile_entitlements/);
});

test('profile extra service invokes only the new Edge Functions', () => {
  assert.match(profileExtraBillingServiceSource, /get-profile-extra-status/);
  assert.match(profileExtraBillingServiceSource, /create-profile-extra-checkout/);
  assert.doesNotMatch(profileExtraBillingServiceSource, /create-checkout/);
  assert.doesNotMatch(profileExtraBillingServiceSource, /price_1/);
});

test('new Supabase functions have the expected JWT configuration', () => {
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
