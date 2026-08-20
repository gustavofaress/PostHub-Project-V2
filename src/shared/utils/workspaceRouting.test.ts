import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWorkspaceModule, resolveWorkspaceRoute } from './workspaceRouting.ts';

test('workspace root redirects to dashboard', () => {
  assert.deepEqual(resolveWorkspaceRoute('/workspace'), {
    activeModule: 'dashboard',
    redirectTo: '/workspace/dashboard',
  });
  assert.deepEqual(resolveWorkspaceRoute('/workspace/'), {
    activeModule: 'dashboard',
    redirectTo: '/workspace/dashboard',
  });
});

test('legacy onboarding route redirects to dashboard', () => {
  assert.deepEqual(resolveWorkspaceRoute('/workspace/onboarding'), {
    activeModule: 'dashboard',
    redirectTo: '/workspace/dashboard',
  });
});

test('legacy discontinued module routes redirect to dashboard', () => {
  assert.deepEqual(resolveWorkspaceRoute('/workspace/scripts'), {
    activeModule: 'dashboard',
    redirectTo: '/workspace/dashboard',
  });
  assert.deepEqual(resolveWorkspaceRoute('/workspace/clients'), {
    activeModule: 'dashboard',
    redirectTo: '/workspace/dashboard',
  });
  assert.deepEqual(resolveWorkspaceRoute('/workspace/scheduler'), {
    activeModule: 'dashboard',
    redirectTo: '/workspace/dashboard',
  });
});

test('known workspace modules stay available without redirects', () => {
  assert.deepEqual(resolveWorkspaceRoute('/workspace/calendar'), {
    activeModule: 'calendar',
    redirectTo: null,
  });
  assert.equal(normalizeWorkspaceModule('approval'), 'approval');
});

test('unknown modules fail back to dashboard without creating a legacy redirect', () => {
  assert.deepEqual(resolveWorkspaceRoute('/workspace/unknown-module'), {
    activeModule: 'dashboard',
    redirectTo: null,
  });
});
