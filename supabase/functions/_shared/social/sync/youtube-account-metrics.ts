import {
  fetchWindsorYoutubeChannelSnapshot,
  fetchWindsorYoutubeDailyMetrics,
} from '../providers/windsor.ts';
import type { SocialAdminClient } from '../security.ts';
import type {
  SocialConnectionRecord,
  WindsorYoutubeChannelSnapshotRow,
  WindsorYoutubeDailyMetricsRow,
} from '../types.ts';
import {
  createSyncError,
  createSyncRun,
  finishSyncRun,
  loadExistingMetricRow,
  toSyncError,
  type SocialAccountMetricsSyncResult,
  type SocialAccountMetricsSyncType,
  updateConnectionSyncStatus,
} from './account-metrics-lifecycle.ts';

export const WINDSOR_YOUTUBE_DATASOURCE = 'youtube';

export interface YoutubeAccountMetricsStorageRow {
  profile_id: string;
  connection_id: string;
  datasource: string;
  metric_date: string;
  followers?: number | null;
  followers_count?: number | null;
  followers_gained?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  platform_metrics: Record<string, unknown>;
  raw_data: Record<string, unknown>;
  fetched_at: string;
  updated_at: string;
}

export interface YoutubeMetricsAggregate {
  views: number | null;
  estimatedMinutesWatched: number | null;
  subscribersGainedChannel: number | null;
  subscribersLostChannel: number | null;
  netSubscribers: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  averageViewPercentageDerived: number | null;
  averageViewPercentageSource: 'derived_from_daily_rows';
  averageViewDurationApproximateSeconds: number | null;
  averageViewDurationIsApproximate: true;
  averageViewDurationSource: 'derived_from_daily_rows';
}

/**
 * YouTube account identity is intentionally resolved before this sync layer.
 * The persisted external_account_id must be the trusted YouTube channel ID; no
 * metadata, display-name, legacy Windsor account, or linked-account lookup is
 * permitted as a fallback here.
 */
export function getTrustedWindsorYoutubeConnectionAccountId(connection: SocialConnectionRecord) {
  if (connection.platform !== 'youtube' || connection.provider !== 'windsor') {
    throw createSyncError(
      'unsupported_connection',
      'Esta conexão ainda não possui sincronização YouTube disponível.'
    );
  }

  if (connection.status !== 'active') {
    throw createSyncError('connection_not_active', 'Esta conexão do YouTube não está ativa.');
  }

  const accountId =
    typeof connection.external_account_id === 'string'
      ? connection.external_account_id.trim()
      : '';

  if (!accountId) {
    throw createSyncError(
      'youtube_connection_identity_missing',
      'A conexão do YouTube não possui uma identidade de canal confiável.',
      422
    );
  }

  return accountId;
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined;
}

function isValidIsoDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sumKnownValues(values: Array<number | null>) {
  if (values.length === 0 || values.some((value) => !hasValue(value))) {
    return null;
  }

  return values.reduce<number>((total, value) => total + (value as number), 0);
}

function mergeDefinedValues(
  existing: Record<string, unknown> | null | undefined,
  updates: Record<string, unknown>
) {
  return {
    ...(existing ?? {}),
    ...Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [
        key,
        hasValue(value) ? value : existing?.[key] ?? null,
      ])
    ),
  };
}

function getExistingFiniteNumber(metrics: Record<string, unknown> | null, key: string) {
  const value = metrics?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function scopeWindsorYoutubeRows<T extends { datasource: string | null; accountId: string | null }>(
  rows: T[],
  accountId: string
) {
  return rows.filter(
    (row) => row.datasource === WINDSOR_YOUTUBE_DATASOURCE && row.accountId === accountId
  );
}

function getYoutubeSnapshotSignature(row: WindsorYoutubeChannelSnapshotRow) {
  return JSON.stringify({
    datasource: row.datasource,
    accountId: row.accountId,
    accountName: row.accountName,
    channelImage: row.channelImage,
    subscriberCount: row.subscriberCount,
  });
}

/**
 * Windsor may return duplicate snapshot rows. Rows are collapsed only after
 * every allowlisted snapshot field is identical; any disagreement is unsafe
 * to resolve heuristically and fails the sync instead.
 */
export function collapseWindsorYoutubeChannelSnapshotRows(
  rows: WindsorYoutubeChannelSnapshotRow[]
) {
  const rowsBySignature = new Map<string, WindsorYoutubeChannelSnapshotRow>();

  for (const row of rows) {
    const signature = getYoutubeSnapshotSignature(row);
    if (!rowsBySignature.has(signature)) {
      rowsBySignature.set(signature, row);
    }
  }

  const distinctRows = Array.from(rowsBySignature.values());
  if (distinctRows.length > 1) {
    throw createSyncError(
      'windsor_youtube_snapshot_ambiguous',
      'Windsor returned conflicting YouTube channel snapshots.',
      502
    );
  }

  return distinctRows;
}

export async function fetchWindsorYoutubeAccountMetrics(params: {
  accountId: string;
  dateFrom: string;
  dateTo: string;
}) {
  const [snapshotRows, dailyRows] = await Promise.all([
    fetchWindsorYoutubeChannelSnapshot({ accountId: params.accountId }),
    fetchWindsorYoutubeDailyMetrics(params),
  ]);

  return {
    snapshotRows: collapseWindsorYoutubeChannelSnapshotRows(
      scopeWindsorYoutubeRows(snapshotRows, params.accountId)
    ),
    dailyRows: scopeWindsorYoutubeRows(dailyRows, params.accountId).filter((row) =>
      isValidIsoDate(row.date)
    ),
    recordsReceived: snapshotRows.length + dailyRows.length,
  };
}

export function buildYoutubeSnapshotStorageRow(params: {
  profileId: string;
  connectionId: string;
  syncDate: string;
  fetchedAt: string;
  row: WindsorYoutubeChannelSnapshotRow;
  existing?: Partial<YoutubeAccountMetricsStorageRow> | null;
}): YoutubeAccountMetricsStorageRow {
  const existingPlatformMetrics = params.existing?.platform_metrics ?? null;
  const existingRawData = params.existing?.raw_data ?? null;

  return {
    profile_id: params.profileId,
    connection_id: params.connectionId,
    datasource: WINDSOR_YOUTUBE_DATASOURCE,
    metric_date: params.syncDate,
    followers: hasValue(params.row.subscriberCount)
      ? params.row.subscriberCount
      : params.existing?.followers ?? null,
    followers_count: hasValue(params.row.subscriberCount)
      ? params.row.subscriberCount
      : params.existing?.followers_count ?? null,
    followers_gained: params.existing?.followers_gained ?? null,
    views: params.existing?.views ?? null,
    likes: params.existing?.likes ?? null,
    comments: params.existing?.comments ?? null,
    shares: params.existing?.shares ?? null,
    platform_metrics: mergeDefinedValues(existingPlatformMetrics, {
      platform: 'youtube',
      subscriber_count: params.row.subscriberCount,
      snapshot_observed_at: params.fetchedAt,
    }),
    raw_data: mergeDefinedValues(existingRawData, {
      youtube_channel_snapshot: params.row.rawData,
    }),
    fetched_at: params.fetchedAt,
    updated_at: params.fetchedAt,
  };
}

export function buildYoutubeDailyStorageRow(params: {
  profileId: string;
  connectionId: string;
  fetchedAt: string;
  row: WindsorYoutubeDailyMetricsRow;
  existing?: Partial<YoutubeAccountMetricsStorageRow> | null;
}): YoutubeAccountMetricsStorageRow | null {
  if (!isValidIsoDate(params.row.date)) return null;

  const existingPlatformMetrics = params.existing?.platform_metrics ?? null;
  const existingRawData = params.existing?.raw_data ?? null;
  const effectiveGained =
    params.row.subscribersGainedChannel ??
    getExistingFiniteNumber(existingPlatformMetrics, 'subscribers_gained_channel');
  const effectiveLost =
    params.row.subscribersLostChannel ??
    getExistingFiniteNumber(existingPlatformMetrics, 'subscribers_lost_channel');
  const effectiveNet =
    effectiveGained !== null && effectiveLost !== null
      ? effectiveGained - effectiveLost
      : null;

  return {
    profile_id: params.profileId,
    connection_id: params.connectionId,
    datasource: WINDSOR_YOUTUBE_DATASOURCE,
    metric_date: params.row.date,
    followers: params.existing?.followers ?? null,
    followers_count: params.existing?.followers_count ?? null,
    followers_gained: hasValue(params.row.subscribersGainedChannel)
      ? params.row.subscribersGainedChannel
      : params.existing?.followers_gained ?? null,
    views: hasValue(params.row.views) ? params.row.views : params.existing?.views ?? null,
    likes: hasValue(params.row.likes) ? params.row.likes : params.existing?.likes ?? null,
    comments: hasValue(params.row.comments) ? params.row.comments : params.existing?.comments ?? null,
    shares: hasValue(params.row.shares) ? params.row.shares : params.existing?.shares ?? null,
    // Materialized metrics preserve the last known provider value when the
    // latest daily response is null; raw_data below retains that null exactly.
    platform_metrics: mergeDefinedValues(existingPlatformMetrics, {
      platform: 'youtube',
      subscribers_gained_channel: effectiveGained,
      subscribers_lost_channel: effectiveLost,
      net_subscribers: effectiveNet,
      estimated_minutes_watched: params.row.estimatedMinutesWatched,
      average_view_duration: params.row.averageViewDuration,
      average_view_percentage: params.row.averageViewPercentage,
      likes: params.row.likes,
      comments: params.row.comments,
      shares: params.row.shares,
    }),
    raw_data: {
      ...(existingRawData ?? {}),
      youtube_daily_metrics: params.row.rawData,
    },
    fetched_at: params.fetchedAt,
    updated_at: params.fetchedAt,
  };
}

export function aggregateYoutubeDailyMetrics(rows: WindsorYoutubeDailyMetricsRow[]): YoutubeMetricsAggregate {
  const views = sumKnownValues(rows.map((row) => row.views));
  const estimatedMinutesWatched = sumKnownValues(rows.map((row) => row.estimatedMinutesWatched));
  const subscribersGainedChannel = sumKnownValues(rows.map((row) => row.subscribersGainedChannel));
  const subscribersLostChannel = sumKnownValues(rows.map((row) => row.subscribersLostChannel));
  const likes = sumKnownValues(rows.map((row) => row.likes));
  const comments = sumKnownValues(rows.map((row) => row.comments));
  const shares = sumKnownValues(rows.map((row) => row.shares));
  const rowsWithPositiveViews = rows.filter((row) => row.views !== null && row.views > 0);
  const retentionIsComplete =
    views !== null &&
    rowsWithPositiveViews.every((row) => row.averageViewPercentage !== null);
  const retentionWeight = retentionIsComplete
    ? sumKnownValues(rowsWithPositiveViews.map((row) => row.views))
    : null;

  return {
    views,
    estimatedMinutesWatched,
    subscribersGainedChannel,
    subscribersLostChannel,
    netSubscribers:
      subscribersGainedChannel !== null && subscribersLostChannel !== null
        ? subscribersGainedChannel - subscribersLostChannel
        : null,
    likes,
    comments,
    shares,
    averageViewPercentageDerived:
      retentionWeight !== null && retentionWeight > 0
        ? rowsWithPositiveViews.reduce(
            (total, row) => total + (row.averageViewPercentage ?? 0) * (row.views ?? 0),
            0
          ) / retentionWeight
        : null,
    averageViewPercentageSource: 'derived_from_daily_rows',
    averageViewDurationApproximateSeconds:
      views !== null && views > 0 && estimatedMinutesWatched !== null
        ? (estimatedMinutesWatched * 60) / views
        : null,
    averageViewDurationIsApproximate: true,
    averageViewDurationSource: 'derived_from_daily_rows',
  };
}

export async function syncWindsorYoutubeAccountMetrics(params: {
  adminClient: SocialAdminClient;
  connection: SocialConnectionRecord;
  syncType: SocialAccountMetricsSyncType;
  dateFrom: string;
  dateTo: string;
  snapshotMetricDate: string;
  loggerLabel?: string;
}): Promise<SocialAccountMetricsSyncResult> {
  const loggerLabel = params.loggerLabel ?? '[social-sync-account-metrics]';
  let syncRunId: string | null = null;

  try {
    const accountId = getTrustedWindsorYoutubeConnectionAccountId(params.connection);

    syncRunId = await createSyncRun(params.adminClient, {
      profileId: params.connection.profile_id,
      connectionId: params.connection.id,
      provider: params.connection.provider,
      platform: params.connection.platform,
      syncType: params.syncType,
      periodStart: params.dateFrom,
      periodEnd: params.snapshotMetricDate,
    });

    const { snapshotRows, dailyRows, recordsReceived } = await fetchWindsorYoutubeAccountMetrics({
      accountId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    const fetchedAt = new Date().toISOString();

    if (snapshotRows.length === 0 && dailyRows.length === 0) {
      const noRowsCode =
        recordsReceived === 0
          ? 'windsor_no_rows_returned'
          : 'windsor_no_rows_for_connection';
      const noRowsMessage =
        recordsReceived === 0
          ? 'Windsor returned no rows for the requested YouTube metrics window.'
          : 'Windsor returned rows, but none matched the configured YouTube channel and datasource.';

      await finishSyncRun(params.adminClient, syncRunId, {
        status: 'partial',
        records_received: recordsReceived,
        records_created: null,
        records_updated: 0,
        error_code: noRowsCode,
        error_message: noRowsMessage,
        metadata: {
          metrics_scope: 'account',
          snapshot_rows_received: snapshotRows.length,
          daily_rows_received: dailyRows.length,
          upserted_rows: 0,
        },
      });

      await updateConnectionSyncStatus(params.adminClient, {
        connectionId: params.connection.id,
        success: false,
        errorMessage: noRowsMessage,
      });

      return {
        status: 'partial',
        connectionId: params.connection.id,
        profileId: params.connection.profile_id,
        periodStart: params.dateFrom,
        periodEnd: params.snapshotMetricDate,
        recordsReceived,
        recordsProcessed: 0,
      };
    }

    const rowsByMetricDate = new Map<string, YoutubeAccountMetricsStorageRow>();

    for (const row of snapshotRows) {
      const existing = await loadExistingMetricRow(params.adminClient, {
        connectionId: params.connection.id,
        metricDate: params.snapshotMetricDate,
      });
      rowsByMetricDate.set(
        params.snapshotMetricDate,
        buildYoutubeSnapshotStorageRow({
          profileId: params.connection.profile_id,
          connectionId: params.connection.id,
          syncDate: params.snapshotMetricDate,
          fetchedAt,
          row,
          existing: existing as Partial<YoutubeAccountMetricsStorageRow> | null,
        })
      );
    }

    for (const row of dailyRows) {
      if (!isValidIsoDate(row.date)) continue;

      const existing =
        rowsByMetricDate.get(row.date) ??
        ((await loadExistingMetricRow(params.adminClient, {
          connectionId: params.connection.id,
          metricDate: row.date,
        })) as Partial<YoutubeAccountMetricsStorageRow> | null);
      const storageRow = buildYoutubeDailyStorageRow({
        profileId: params.connection.profile_id,
        connectionId: params.connection.id,
        fetchedAt,
        row,
        existing,
      });

      if (storageRow) rowsByMetricDate.set(storageRow.metric_date, storageRow);
    }

    const rowsToUpsert = Array.from(rowsByMetricDate.values());

    if (rowsToUpsert.length > 0) {
      const { error } = await params.adminClient.from('social_account_metrics').upsert(rowsToUpsert, {
        onConflict: 'connection_id,metric_date',
      });

      if (error) {
        throw createSyncError(
          'metrics_persistence_failed',
          'Não foi possível salvar as métricas do YouTube.'
        );
      }
    }

    await finishSyncRun(params.adminClient, syncRunId, {
      status: 'success',
      records_received: recordsReceived,
      records_created: null,
      records_updated: rowsToUpsert.length,
      error_code: null,
      error_message: null,
      metadata: {
        metrics_scope: 'account',
        snapshot_rows_received: snapshotRows.length,
        daily_rows_received: dailyRows.length,
        upserted_rows: rowsToUpsert.length,
      },
    });

    await updateConnectionSyncStatus(params.adminClient, {
      connectionId: params.connection.id,
      success: true,
    });

    return {
      status: 'success',
      connectionId: params.connection.id,
      profileId: params.connection.profile_id,
      periodStart: params.dateFrom,
      periodEnd: params.snapshotMetricDate,
      recordsReceived,
      recordsProcessed: rowsToUpsert.length,
    };
  } catch (error) {
    const syncError = toSyncError(error, 'youtube');
    const safeErrorMessage = syncError.publicMessage;

    console.error(`${loggerLabel} error:`, {
      code: syncError.code,
      message: safeErrorMessage,
      profileId: params.connection.profile_id,
      connectionId: params.connection.id,
    });

    if (syncRunId) {
      await finishSyncRun(params.adminClient, syncRunId, {
        status: 'failed',
        records_received: 0,
        records_created: null,
        records_updated: null,
        error_code: syncError.code,
        error_message: safeErrorMessage,
        ...(syncError.diagnosticMetadata
          ? {
              metadata: {
                metrics_scope: 'account',
                ...syncError.diagnosticMetadata,
              },
            }
          : {}),
      }).catch((syncRunError) => {
        console.error(`${loggerLabel} failed to update sync run:`, {
          code: toSyncError(syncRunError, 'youtube').code,
        });
      });
    }

    await updateConnectionSyncStatus(params.adminClient, {
      connectionId: params.connection.id,
      success: false,
      errorMessage: safeErrorMessage,
    }).catch((connectionUpdateError) => {
      console.error(`${loggerLabel} failed to update connection sync status:`, {
        code: toSyncError(connectionUpdateError, 'youtube').code,
      });
    });

    throw syncError;
  }
}
