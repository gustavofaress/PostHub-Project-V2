import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessRequestedProductAfterLogin,
  resolvePostAuthDestination,
  resolveProtectedRouteDecision,
} from './protectedRouteAccess.ts';

test('without a session the protected route redirects to login', () => {
  assert.equal(
    resolveProtectedRouteDecision({
      isLoading: false,
      hasAuthenticatedSession: false,
      product: 'workspace',
      accessStatus: 'trial_active',
    }),
    'redirect_login'
  );
});

test('a valid trial_active session can enter the PostHub workspace', () => {
  assert.equal(
    resolveProtectedRouteDecision({
      isLoading: false,
      hasAuthenticatedSession: true,
      product: 'workspace',
      accessStatus: 'trial_active',
    }),
    'allow'
  );
});

test('a valid trial_expired session can enter the PostHub workspace', () => {
  assert.equal(
    resolveProtectedRouteDecision({
      isLoading: false,
      hasAuthenticatedSession: true,
      product: 'workspace',
      accessStatus: 'trial_expired',
    }),
    'allow'
  );
});

test('a valid unknown session can enter the PostHub workspace', () => {
  assert.equal(
    resolveProtectedRouteDecision({
      isLoading: false,
      hasAuthenticatedSession: true,
      product: 'workspace',
      accessStatus: 'unknown',
    }),
    'allow'
  );
});

test('a valid missing session can enter the PostHub workspace', () => {
  assert.equal(
    resolveProtectedRouteDecision({
      isLoading: false,
      hasAuthenticatedSession: true,
      product: 'workspace',
      accessStatus: 'missing',
    }),
    'allow'
  );
});

test('a blocked legacy commercial session can still enter the PostHub workspace', () => {
  assert.equal(
    resolveProtectedRouteDecision({
      isLoading: false,
      hasAuthenticatedSession: true,
      product: 'workspace',
      accessStatus: 'blocked',
    }),
    'allow'
  );
});

test('a valid admin session can enter the PostHub workspace', () => {
  assert.equal(
    resolveProtectedRouteDecision({
      isLoading: false,
      hasAuthenticatedSession: true,
      product: 'workspace',
      accessStatus: 'pro',
    }),
    'allow'
  );
});

test('a valid member-only session can enter the PostHub workspace', () => {
  assert.equal(
    resolveProtectedRouteDecision({
      isLoading: false,
      hasAuthenticatedSession: true,
      product: 'workspace',
      accessStatus: 'paid',
    }),
    'allow'
  );
});

test('Metric Hub keeps the legacy commercial gate', () => {
  assert.equal(
    resolveProtectedRouteDecision({
      isLoading: false,
      hasAuthenticatedSession: true,
      product: 'metric-hub',
      accessStatus: 'trial_expired',
    }),
    'redirect_login'
  );
  assert.equal(
    resolveProtectedRouteDecision({
      isLoading: false,
      hasAuthenticatedSession: true,
      product: 'metric-hub',
      accessStatus: 'trial_active',
    }),
    'allow'
  );
});

test('post-login routing defaults to the dashboard instead of onboarding', () => {
  assert.equal(resolvePostAuthDestination({ isAdmin: false }), '/workspace/dashboard');
});

test('post-login routing still preserves the admin default and explicit redirects', () => {
  assert.equal(resolvePostAuthDestination({ isAdmin: true }), '/workspace/admin');
  assert.equal(
    resolvePostAuthDestination({
      redirectTo: '/workspace/calendar',
      isAdmin: false,
    }),
    '/workspace/calendar'
  );
});

test('explicit Metric Hub redirects keep the legacy commercial validation after login', () => {
  assert.equal(
    canAccessRequestedProductAfterLogin({
      redirectTo: '/metric-hub/app',
      accessStatus: 'trial_expired',
    }),
    false
  );
  assert.equal(
    canAccessRequestedProductAfterLogin({
      redirectTo: '/metric-hub/app',
      accessStatus: 'trial_active',
    }),
    true
  );
  assert.equal(
    canAccessRequestedProductAfterLogin({
      redirectTo: '/workspace/dashboard',
      accessStatus: 'unknown',
    }),
    true
  );
});
