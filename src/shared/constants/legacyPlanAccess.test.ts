import test from 'node:test';
import assert from 'node:assert/strict';
import { hasLegacyPlanAccess, normalizePlan } from './legacyPlanAccess.ts';

test('normalizePlan recognizes free as a valid legacy account plan state', () => {
  assert.equal(normalizePlan('free'), 'free');
  assert.equal(normalizePlan('FREE'), 'free');
  assert.equal(normalizePlan('Free'), 'free');
});

test('FREE keeps the legacy always-open modules accessible', () => {
  assert.equal(hasLegacyPlanAccess('free', 'dashboard', false), true);
  assert.equal(hasLegacyPlanAccess('free', 'account', false), true);
  assert.equal(hasLegacyPlanAccess('free', 'settings', false), true);
  assert.equal(hasLegacyPlanAccess('free', 'credits', false), true);
  assert.equal(hasLegacyPlanAccess('free', 'support', false), true);
  assert.equal(hasLegacyPlanAccess('free', 'performance', false), true);
});

test('FREE includes ideas without inheriting other legacy paid features by default', () => {
  assert.equal(hasLegacyPlanAccess('free', 'ideas', false), true);
  assert.equal(hasLegacyPlanAccess('free', 'clients', false), false);
  assert.equal(hasLegacyPlanAccess('free', 'reports', false), false);
  assert.equal(hasLegacyPlanAccess('free', 'scripts', false), false);
  assert.equal(hasLegacyPlanAccess('free', 'team', false), false);
});
