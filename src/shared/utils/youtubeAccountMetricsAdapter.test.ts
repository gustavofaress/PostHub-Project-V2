import assert from 'node:assert/strict';
import test from 'node:test';

(globalThis as typeof globalThis & { Deno?: unknown }).Deno = {
  env: {
    get: () => '',
  },
};

const {
  normalizeWindsorYoutubeChannelSnapshotRow,
  normalizeWindsorYoutubeDailyMetricsRow,
} = await import('../../../supabase/functions/_shared/social/providers/windsor.ts');
const { getSocialPlatformConfig } = await import(
  '../../../supabase/functions/_shared/social/registry.ts'
);
const {
  aggregateYoutubeDailyMetrics,
  buildYoutubeDailyStorageRow,
  buildYoutubeSnapshotStorageRow,
  collapseWindsorYoutubeChannelSnapshotRows,
  scopeWindsorYoutubeRows,
} = await import('../../../supabase/functions/_shared/social/sync/youtube-account-metrics.ts');

test('YouTube normalizers retain only confirmed raw fields and permit nullable duration', () => {
  const snapshot = normalizeWindsorYoutubeChannelSnapshotRow({
    datasource: 'youtube',
    account_id: 'channel-a',
    account_name: 'Channel A',
    channel_image: 'https://image.example/channel-a.png',
    subscriber_count: 45,
    access_token: 'must-not-leak',
    nested: { must: 'not-persist' },
  });
  const daily = normalizeWindsorYoutubeDailyMetricsRow({
    date: '2026-08-21',
    datasource: 'youtube',
    account_id: 'channel-a',
    subscribers_gained_channel: 0,
    subscribers_lost_channel: 1,
    views: 6,
    estimated_minutes_watched: 2,
    average_view_duration: null,
    average_view_percentage: 91.87,
    likes: -1,
    comments: 0,
    shares: 0,
    refresh_token: 'must-not-leak',
  });

  assert.equal(snapshot.subscriberCount, 45);
  assert.equal(daily.averageViewDuration, null);
  assert.equal(daily.averageViewPercentage, 91.87);
  assert.equal(daily.likes, -1);
  assert.deepEqual(snapshot.rawData, {
    datasource: 'youtube',
    account_id: 'channel-a',
    account_name: 'Channel A',
    channel_image: 'https://image.example/channel-a.png',
    subscriber_count: 45,
  });
  assert.doesNotMatch(JSON.stringify(daily.rawData), /must-not-leak/);
  assert.doesNotMatch(JSON.stringify(snapshot.rawData), /must-not-leak|not-persist/);
});

test('YouTube snapshot is stored only at sync date and daily history never receives current subscriber count', () => {
  const snapshot = normalizeWindsorYoutubeChannelSnapshotRow({
    datasource: 'youtube',
    account_id: 'channel-a',
    subscriber_count: 45,
  });
  const daily = normalizeWindsorYoutubeDailyMetricsRow({
    date: '2026-08-21',
    datasource: 'youtube',
    account_id: 'channel-a',
    subscribers_gained_channel: 0,
    subscribers_lost_channel: 1,
    views: 6,
    estimated_minutes_watched: 2,
    average_view_duration: null,
    average_view_percentage: 91.87,
    likes: -1,
    comments: 0,
    shares: 0,
  });
  const snapshotStorage = buildYoutubeSnapshotStorageRow({
    profileId: 'profile-a',
    connectionId: 'connection-a',
    syncDate: '2026-08-27',
    fetchedAt: '2026-08-27T12:00:00.000Z',
    row: snapshot,
  });
  const dailyStorage = buildYoutubeDailyStorageRow({
    profileId: 'profile-a',
    connectionId: 'connection-a',
    fetchedAt: '2026-08-27T12:00:00.000Z',
    row: daily,
  });

  assert.equal(snapshotStorage.metric_date, '2026-08-27');
  assert.equal(snapshotStorage.followers, 45);
  assert.equal(dailyStorage?.metric_date, '2026-08-21');
  assert.equal(dailyStorage?.followers, null);
  assert.equal(dailyStorage?.followers_count, null);
  assert.equal(dailyStorage?.followers_gained, 0);
  assert.equal(dailyStorage?.likes, -1);
  assert.equal(dailyStorage?.platform_metrics.subscribers_lost_channel, 1);
  assert.equal(dailyStorage?.platform_metrics.net_subscribers, -1);
});

test('YouTube daily merge preserves a same-day snapshot and existing platform metrics when provider values are null', () => {
  const daily = normalizeWindsorYoutubeDailyMetricsRow({
    date: '2026-08-27',
    datasource: 'youtube',
    account_id: 'channel-a',
    subscribers_gained_channel: 2,
    subscribers_lost_channel: 1,
    views: 10,
    estimated_minutes_watched: 3,
    average_view_duration: null,
    average_view_percentage: 50,
    likes: null,
    comments: 2,
    shares: 3,
  });
  const storage = buildYoutubeDailyStorageRow({
    profileId: 'profile-a',
    connectionId: 'connection-a',
    fetchedAt: '2026-08-27T12:00:00.000Z',
    row: daily,
    existing: {
      followers: 45,
      followers_count: 45,
      likes: 5,
      platform_metrics: { subscriber_count: 45, average_view_duration: 77, likes: 5 },
      raw_data: { youtube_channel_snapshot: { subscriber_count: 45 } },
    },
  });

  assert.equal(storage?.followers, 45);
  assert.equal(storage?.followers_count, 45);
  assert.equal(storage?.likes, 5);
  assert.equal(storage?.platform_metrics.subscriber_count, 45);
  assert.equal(storage?.platform_metrics.average_view_duration, 77);
  assert.equal(storage?.platform_metrics.likes, 5);
  assert.deepEqual(storage?.raw_data.youtube_daily_metrics, {
    date: '2026-08-27',
    datasource: 'youtube',
    account_id: 'channel-a',
    subscribers_gained_channel: 2,
    subscribers_lost_channel: 1,
    views: 10,
    estimated_minutes_watched: 3,
    average_view_duration: null,
    average_view_percentage: 50,
    likes: null,
    comments: 2,
    shares: 3,
  });
});

test('YouTube daily merge preserves an existing views value when provider views are null', () => {
  const storage = buildYoutubeDailyStorageRow({
    profileId: 'profile-a',
    connectionId: 'connection-a',
    fetchedAt: '2026-08-27T12:00:00.000Z',
    row: normalizeWindsorYoutubeDailyMetricsRow({
      date: '2026-08-27',
      datasource: 'youtube',
      account_id: 'channel-a',
      subscribers_gained_channel: 0,
      subscribers_lost_channel: 0,
      views: null,
    }),
    existing: { views: 100 },
  });

  assert.equal(storage?.views, 100);
});

test('YouTube daily materialized net is recalculated from effective gained and lost values', () => {
  const cases = [
    {
      existing: {
        subscribers_gained_channel: 4,
        subscribers_lost_channel: 1,
        net_subscribers: 3,
      },
      gained: 2,
      lost: null,
      expectedGained: 2,
      expectedLost: 1,
      expectedNet: 1,
    },
    {
      existing: {
        subscribers_gained_channel: 4,
        subscribers_lost_channel: 1,
        net_subscribers: 3,
      },
      gained: null,
      lost: 2,
      expectedGained: 4,
      expectedLost: 2,
      expectedNet: 2,
    },
    {
      existing: {},
      gained: 2,
      lost: null,
      expectedGained: 2,
      expectedLost: null,
      expectedNet: null,
    },
    {
      existing: {
        subscribers_gained_channel: 2,
        subscribers_lost_channel: 1,
      },
      gained: null,
      lost: null,
      expectedGained: 2,
      expectedLost: 1,
      expectedNet: 1,
    },
    {
      existing: {},
      gained: 0,
      lost: 1,
      expectedGained: 0,
      expectedLost: 1,
      expectedNet: -1,
    },
  ];

  for (const {
    existing,
    gained,
    lost,
    expectedGained,
    expectedLost,
    expectedNet,
  } of cases) {
    const storage = buildYoutubeDailyStorageRow({
      profileId: 'profile-a',
      connectionId: 'connection-a',
      fetchedAt: '2026-08-27T12:00:00.000Z',
      row: normalizeWindsorYoutubeDailyMetricsRow({
        date: '2026-08-27',
        datasource: 'youtube',
        account_id: 'channel-a',
        subscribers_gained_channel: gained,
        subscribers_lost_channel: lost,
      }),
      existing: { platform_metrics: existing },
    });

    assert.equal(storage?.followers_gained, gained);
    assert.equal(storage?.platform_metrics.subscribers_gained_channel, expectedGained);
    assert.equal(storage?.platform_metrics.subscribers_lost_channel, expectedLost);
    assert.equal(storage?.platform_metrics.net_subscribers, expectedNet);
    assert.equal(storage?.raw_data.youtube_daily_metrics.subscribers_lost_channel, lost);
  }
});

test('YouTube scope excludes other accounts and datasources', () => {
  const rows = scopeWindsorYoutubeRows(
    [
      { datasource: 'youtube', accountId: 'channel-a', value: 'keep' },
      { datasource: 'youtube', accountId: 'channel-b', value: 'drop-account' },
      { datasource: 'instagram', accountId: 'channel-a', value: 'drop-datasource' },
    ],
    'channel-a'
  );

  assert.deepEqual(rows, [{ datasource: 'youtube', accountId: 'channel-a', value: 'keep' }]);
});

test('YouTube period aggregation uses additive metrics and view-weighted retention', () => {
  const rows = [
    normalizeWindsorYoutubeDailyMetricsRow({
      date: '2026-08-20',
      datasource: 'youtube',
      account_id: 'channel-a',
      subscribers_gained_channel: 2,
      subscribers_lost_channel: 1,
      views: 10,
      estimated_minutes_watched: 5,
      average_view_duration: null,
      average_view_percentage: 20,
      likes: -1,
      comments: 2,
      shares: 3,
    }),
    normalizeWindsorYoutubeDailyMetricsRow({
      date: '2026-08-21',
      datasource: 'youtube',
      account_id: 'channel-a',
      subscribers_gained_channel: 1,
      subscribers_lost_channel: 0,
      views: 90,
      estimated_minutes_watched: 45,
      average_view_duration: null,
      average_view_percentage: 80,
      likes: 4,
      comments: 5,
      shares: 6,
    }),
  ];
  const aggregate = aggregateYoutubeDailyMetrics(rows);

  assert.deepEqual(aggregate, {
    views: 100,
    estimatedMinutesWatched: 50,
    subscribersGainedChannel: 3,
    subscribersLostChannel: 1,
    netSubscribers: 2,
    likes: 3,
    comments: 7,
    shares: 9,
    averageViewPercentageDerived: 74,
    averageViewPercentageSource: 'derived_from_daily_rows',
    averageViewDurationApproximateSeconds: 30,
    averageViewDurationIsApproximate: true,
    averageViewDurationSource: 'derived_from_daily_rows',
  });
});

test('YouTube aggregate preserves unknown values rather than substituting zero', () => {
  const rows = [
    normalizeWindsorYoutubeDailyMetricsRow({
      date: '2026-08-20',
      datasource: 'youtube',
      account_id: 'channel-a',
      subscribers_gained_channel: 2,
      subscribers_lost_channel: 1,
      views: 10,
      estimated_minutes_watched: 5,
      average_view_percentage: 50,
      likes: 2,
      comments: 1,
      shares: 1,
    }),
    normalizeWindsorYoutubeDailyMetricsRow({
      date: '2026-08-21',
      datasource: 'youtube',
      account_id: 'channel-a',
      subscribers_gained_channel: null,
      subscribers_lost_channel: 1,
      views: 20,
      estimated_minutes_watched: null,
      average_view_percentage: null,
      likes: null,
      comments: 1,
      shares: 1,
    }),
  ];
  const aggregate = aggregateYoutubeDailyMetrics(rows);

  assert.equal(aggregate.views, 30);
  assert.equal(aggregate.estimatedMinutesWatched, null);
  assert.equal(aggregate.subscribersGainedChannel, null);
  assert.equal(aggregate.subscribersLostChannel, 2);
  assert.equal(aggregate.netSubscribers, null);
  assert.equal(aggregate.likes, null);
  assert.equal(aggregate.comments, 2);
  assert.equal(aggregate.shares, 2);
  assert.equal(aggregate.averageViewDurationApproximateSeconds, null);
  assert.equal(aggregate.averageViewPercentageDerived, null);
});

test('YouTube aggregate requires complete watch time and retention data for derived values', () => {
  const noWatchTime = aggregateYoutubeDailyMetrics([
    normalizeWindsorYoutubeDailyMetricsRow({
      date: '2026-08-20',
      datasource: 'youtube',
      account_id: 'channel-a',
      views: 10,
      estimated_minutes_watched: null,
      average_view_percentage: 50,
    }),
  ]);
  const missingRetention = aggregateYoutubeDailyMetrics([
    normalizeWindsorYoutubeDailyMetricsRow({
      date: '2026-08-20',
      datasource: 'youtube',
      account_id: 'channel-a',
      views: 10,
      estimated_minutes_watched: 5,
      average_view_percentage: 50,
    }),
    normalizeWindsorYoutubeDailyMetricsRow({
      date: '2026-08-21',
      datasource: 'youtube',
      account_id: 'channel-a',
      views: 5,
      estimated_minutes_watched: 3,
      average_view_percentage: null,
    }),
  ]);

  assert.equal(noWatchTime.averageViewDurationApproximateSeconds, null);
  assert.equal(missingRetention.averageViewPercentageDerived, null);
});

test('YouTube collapses identical snapshots and rejects conflicting snapshots', () => {
  const duplicateSnapshots = Array.from({ length: 25 }, () =>
    normalizeWindsorYoutubeChannelSnapshotRow({
      datasource: 'youtube',
      account_id: 'channel-a',
      account_name: 'Channel A',
      channel_image: 'https://image.example/channel-a.png',
      subscriber_count: 45,
    })
  );

  assert.equal(collapseWindsorYoutubeChannelSnapshotRows(duplicateSnapshots).length, 1);
  assert.throws(
    () =>
      collapseWindsorYoutubeChannelSnapshotRows([
        duplicateSnapshots[0],
        normalizeWindsorYoutubeChannelSnapshotRow({
          datasource: 'youtube',
          account_id: 'channel-a',
          account_name: 'Channel A',
          channel_image: 'https://image.example/channel-a.png',
          subscriber_count: 46,
        }),
      ]),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: unknown }).code === 'windsor_youtube_snapshot_ambiguous'
  );
});

test('YouTube remains unavailable and Instagram remains available', () => {
  assert.equal(getSocialPlatformConfig('youtube')?.available, false);
  assert.equal(getSocialPlatformConfig('instagram')?.available, true);
});
