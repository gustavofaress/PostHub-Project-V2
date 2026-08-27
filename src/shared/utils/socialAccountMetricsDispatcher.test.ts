import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

(globalThis as typeof globalThis & { Deno?: unknown }).Deno = {
  env: {
    get: () => '',
  },
};

const {
  getSocialAccountMetricsSyncAdapter,
  listScheduledSocialConnections,
  loadSocialConnectionById,
} = await import(
  '../../../supabase/functions/_shared/social/sync/account-metrics.ts'
);
const { getTrustedWindsorYoutubeConnectionAccountId } = await import(
  '../../../supabase/functions/_shared/social/sync/youtube-account-metrics.ts'
);

function makeConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: 'connection-id',
    profile_id: 'profile-id',
    provider: 'windsor',
    platform: 'instagram',
    provider_datasource: 'instagram',
    external_account_id: 'account-id',
    external_account_name: 'Display account name must not identify YouTube syncs',
    external_account_handle: 'handle',
    external_account_avatar_url: null,
    status: 'active',
    connected_by: 'user-id',
    provider_metadata: { connector_account_id: 'legacy-windsor-id' },
    connected_at: '2026-08-27T00:00:00.000Z',
    disconnected_at: null,
    last_sync_at: null,
    last_successful_sync_at: null,
    last_sync_error: null,
    created_at: '2026-08-27T00:00:00.000Z',
    updated_at: '2026-08-27T00:00:00.000Z',
    ...overrides,
  } as Parameters<typeof getSocialAccountMetricsSyncAdapter>[0];
}

function assertSyncErrorCode(error: unknown, expectedCode: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === expectedCode
  );
}

test('account-metrics dispatcher routes Instagram to its existing core and YouTube explicitly', () => {
  assert.equal(getSocialAccountMetricsSyncAdapter(makeConnection()), 'instagram');
  assert.equal(
    getSocialAccountMetricsSyncAdapter(
      makeConnection({
        platform: 'youtube',
        provider_datasource: 'youtube',
        external_account_id: 'trusted-youtube-channel-id',
      })
    ),
    'youtube'
  );

  assert.throws(
    () => getSocialAccountMetricsSyncAdapter(makeConnection({ platform: 'tiktok' })),
    (error: unknown) => assertSyncErrorCode(error, 'unsupported_connection')
  );
  assert.throws(
    () => getSocialAccountMetricsSyncAdapter(makeConnection({ provider: 'unknown' })),
    (error: unknown) => assertSyncErrorCode(error, 'unsupported_connection')
  );
});

test('YouTube sync accepts only a non-empty persisted external channel id', () => {
  const trustedConnection = makeConnection({
    platform: 'youtube',
    provider_datasource: 'youtube',
    external_account_id: '  trusted-youtube-channel-id  ',
  });

  assert.equal(
    getTrustedWindsorYoutubeConnectionAccountId(trustedConnection),
    'trusted-youtube-channel-id'
  );
  assert.throws(
    () =>
      getTrustedWindsorYoutubeConnectionAccountId(
        makeConnection({
          platform: 'youtube',
          provider_datasource: 'youtube',
          external_account_id: '   ',
          external_account_name: 'A name is not a trusted channel id',
          provider_metadata: { connector_account_id: '33198' },
        })
      ),
    (error: unknown) => assertSyncErrorCode(error, 'youtube_connection_identity_missing')
  );
});

test('scheduled sync excludes active YouTube while the registry remains unavailable', async () => {
  const instagramConnection = makeConnection({ id: 'instagram-connection' });
  const youtubeConnection = makeConnection({
    id: 'youtube-connection',
    platform: 'youtube',
    provider_datasource: 'youtube',
    external_account_id: 'trusted-youtube-channel-id',
  });
  const query = {
    select: () => query,
    eq: () => query,
    order: async () => ({ data: [instagramConnection, youtubeConnection], error: null }),
  };
  const adminClient = {
    from: (table: string) => {
      assert.equal(table, 'social_connections');
      return query;
    },
  };

  const scheduled = await listScheduledSocialConnections(adminClient as never);

  assert.deepEqual(scheduled.map((connection) => connection.id), ['instagram-connection']);
});

test('shared connection lookup uses a neutral not-found message', async () => {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  const adminClient = { from: () => query };

  await assert.rejects(
    () =>
      loadSocialConnectionById(adminClient as never, {
        profileId: 'profile-id',
        connectionId: 'missing-connection',
      }),
    (error: unknown) =>
      assertSyncErrorCode(error, 'connection_not_found') &&
      (error as { publicMessage?: unknown }).publicMessage === 'A conexão social não foi encontrada.'
  );
});

test('YouTube sync source has no identity-discovery fallback and always scopes connector requests', () => {
  const source = readFileSync(
    new URL(
      '../../../supabase/functions/_shared/social/sync/youtube-account-metrics.ts',
      import.meta.url
    ),
    'utf8'
  );

  assert.match(source, /connection\.external_account_id/);
  assert.match(source, /fetchWindsorYoutubeAccountMetrics\(\{\s*accountId,/s);
  assert.match(source, /scopeWindsorYoutubeRows\(snapshotRows, params\.accountId\)/);
  assert.match(source, /scopeWindsorYoutubeRows\(dailyRows, params\.accountId\)/);
  assert.doesNotMatch(source, /connection\.external_account_name/);
  assert.doesNotMatch(source, /connection\.provider_metadata/);
  assert.doesNotMatch(source, /ds-accounts|co-user-linked-accounts|listWindsorLinkedAccounts/);
  assert.doesNotMatch(source, /\.find\(|\.at\(0\)/);
});

test('YouTube dispatch keeps endpoint guards, registry disabled, and the Instagram core intact', () => {
  const accountMetricsSource = readFileSync(
    new URL(
      '../../../supabase/functions/_shared/social/sync/account-metrics.ts',
      import.meta.url
    ),
    'utf8'
  );
  const endpointSource = readFileSync(
    new URL('../../../supabase/functions/social-sync-connection/index.ts', import.meta.url),
    'utf8'
  );
  const registrySource = readFileSync(
    new URL('../../../supabase/functions/_shared/social/registry.ts', import.meta.url),
    'utf8'
  );
  const configSource = readFileSync(new URL('../../../supabase/config.toml', import.meta.url), 'utf8');

  assert.match(accountMetricsSource, /async function syncInstagramSocialConnectionAccountMetrics/);
  assert.match(accountMetricsSource, /fetchWindsorInstagramAccountMetrics/);
  assert.match(accountMetricsSource, /case 'instagram':\s*return 'instagram';/);
  assert.match(accountMetricsSource, /case 'youtube':\s*return 'youtube';/);
  assert.match(
    accountMetricsSource,
    /return \(\(data \?\? \[\]\) as SocialConnectionRecord\[\]\)\.filter\(canSyncConnectionAccountMetrics\);/
  );
  assert.match(endpointSource, /requireAuthenticatedUser/);
  assert.match(endpointSource, /assertProfileAccess/);
  assert.match(endpointSource, /feature: 'socialAnalytics'/);
  assert.match(endpointSource, /feature: 'metrics'/);
  assert.match(endpointSource, /loadSocialConnectionById/);
  assert.match(endpointSource, /syncSocialConnectionAccountMetrics/);
  assert.match(configSource, /\[functions\.social-sync-connection\]\s+verify_jwt = true/);
  assert.match(
    registrySource,
    /youtube:\s*\{[\s\S]*?available:\s*false[\s\S]*?\}/
  );
});
