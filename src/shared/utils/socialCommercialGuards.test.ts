import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  runSocialCheckConnectionFlow,
  runSocialCreateConnectionFlow,
  runSocialSyncConnectionFlow,
} from '../../../supabase/functions/_shared/social/commercial.ts';

test('social-create-connection FREE path blocks before Windsor', async () => {
  let windsorCalled = false;

  await assert.rejects(
    () =>
      runSocialCreateConnectionFlow({
        assertSocialAnalyticsAccess: async () => {
          throw new Error('PROFILE_FEATURE_NOT_ENABLED');
        },
        createAuthorizationLink: async () => {
          windsorCalled = true;
          return { authorizationUrl: 'https://windsor.example' };
        },
      }),
    /PROFILE_FEATURE_NOT_ENABLED/
  );

  assert.equal(windsorCalled, false);
});

test('social-create-connection PRO path reaches Windsor after the gate passes', async () => {
  let windsorCalled = false;

  const result = await runSocialCreateConnectionFlow({
    assertSocialAnalyticsAccess: async () => undefined,
    createAuthorizationLink: async () => {
      windsorCalled = true;
      return { authorizationUrl: 'https://windsor.example' };
    },
  });

  assert.equal(windsorCalled, true);
  assert.equal(result.authorizationUrl, 'https://windsor.example');
});

test('social-check-connection FREE path blocks before listing Windsor linked accounts', async () => {
  let windsorCalled = false;

  await assert.rejects(
    () =>
      runSocialCheckConnectionFlow({
        assertSocialAnalyticsAccess: async () => {
          throw new Error('PROFILE_FEATURE_NOT_ENABLED');
        },
        listLinkedAccounts: async () => {
          windsorCalled = true;
          return { accounts: [] };
        },
      }),
    /PROFILE_FEATURE_NOT_ENABLED/
  );

  assert.equal(windsorCalled, false);
});

test('social-sync-connection FREE path blocks before any sync core runs', async () => {
  let syncCalled = false;

  await assert.rejects(
    () =>
      runSocialSyncConnectionFlow({
        assertSocialAnalyticsAccess: async () => {
          throw new Error('PROFILE_FEATURE_NOT_ENABLED');
        },
        assertMetricsAccess: async () => undefined,
        syncConnection: async () => {
          syncCalled = true;
          return { status: 'success' };
        },
      }),
    /PROFILE_FEATURE_NOT_ENABLED/
  );

  assert.equal(syncCalled, false);
});

test('social-sync-connection also blocks before sync core when metrics access is missing', async () => {
  let syncCalled = false;
  let metricsCheckCalled = false;

  await assert.rejects(
    () =>
      runSocialSyncConnectionFlow({
        assertSocialAnalyticsAccess: async () => undefined,
        assertMetricsAccess: async () => {
          metricsCheckCalled = true;
          throw new Error('PROFILE_FEATURE_NOT_ENABLED');
        },
        syncConnection: async () => {
          syncCalled = true;
          return { status: 'success' };
        },
      }),
    /PROFILE_FEATURE_NOT_ENABLED/
  );

  assert.equal(metricsCheckCalled, true);
  assert.equal(syncCalled, false);
});

test('social-sync-connection PRO path reaches the sync core only after both gates pass', async () => {
  const executionOrder: string[] = [];

  const result = await runSocialSyncConnectionFlow({
    assertSocialAnalyticsAccess: async () => {
      executionOrder.push('socialAnalytics');
    },
    assertMetricsAccess: async () => {
      executionOrder.push('metrics');
    },
    syncConnection: async () => {
      executionOrder.push('sync');
      return { status: 'success' };
    },
  });

  assert.deepEqual(executionOrder, ['socialAnalytics', 'metrics', 'sync']);
  assert.equal(result.status, 'success');
});

test('social-disconnect stays outside the premium gate so cleanup remains allowed', () => {
  const source = readFileSync(
    new URL('../../../supabase/functions/social-disconnect/index.ts', import.meta.url),
    'utf8'
  );

  assert.match(source, /assertProfileAccess/);
  assert.doesNotMatch(source, /assertProfileCommercialFeature/);
});
