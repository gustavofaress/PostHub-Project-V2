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

test('legacy scripts route redirects to ideas', () => {
  assert.deepEqual(resolveWorkspaceRoute('/workspace/scripts'), {
    activeModule: 'ideas',
    redirectTo: '/workspace/ideas',
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
