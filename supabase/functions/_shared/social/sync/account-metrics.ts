import {
  fetchWindsorInstagramAccountMetrics,
  fetchWindsorInstagramConnectorAccountCandidates,
  fetchWindsorInstagramDailyDiagnosticRows,
  fetchWindsorInstagramSnapshotDiagnosticRows,
  listWindsorLinkedAccounts,
} from '../providers/windsor.ts';
import { getSocialPlatformConfig } from '../registry.ts';
import type { SocialAdminClient } from '../security.ts';
import type {
  SocialConnectionRecord,
  WindsorInstagramAccountMetricsRow,
} from '../types.ts';

export const SOCIAL_CONNECTION_SYNC_SELECT =
  'id, profile_id, provider, platform, provider_datasource, external_account_id, external_account_name, external_account_handle, external_account_avatar_url, status, connected_by, provider_metadata, connected_at, disconnected_at, last_sync_at, last_successful_sync_at, last_sync_error, created_at, updated_at';

export type SocialAccountMetricsSyncType =
  | 'manual_account_metrics'
  | 'scheduled_account_metrics';

export interface SocialAccountMetricsSyncResult {
  status: 'success' | 'partial';
  connectionId: string;
  profileId: string;
  periodStart: string;
  periodEnd: string;
  recordsReceived: number;
  recordsProcessed: number;
}

export interface SyncError extends Error {
  code: string;
  status: number;
  publicMessage: string;
  diagnosticMetadata?: Record<string, unknown>;
}

interface WindsorNoRowsDiagnostic {
  linkedAccountFound: boolean;
  snapshotRowsReceived: number;
  snapshotExpectedAccountFound: boolean;
  dailyRowsReceived: number;
  dailyExpectedAccountFound: boolean;
  distinctSnapshotAccounts: number;
  distinctDailyAccounts: number;
  returnedDatasourceValues: string[];
  diagnosticErrorCode: string | null;
}

function getIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDailySyncWindow() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);

  return {
    today: getIsoDate(today),
    yesterday: getIsoDate(yesterday),
  };
}

function isValidIsoDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildPlatformMetrics(row: WindsorInstagramAccountMetricsRow) {
  return {
    platform: 'instagram',
    followers_count: row.followersCount,
    follower_count_1d: row.followerCount1d,
    reach_1d: row.reach1d,
    impressions_1d: row.impressions1d,
    accounts_engaged: row.accountsEngaged,
    likes: row.likes,
    comments: row.comments,
    saves: row.saves,
    shares: row.shares,
  };
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined;
}

function mergeDefinedMetrics(
  existing: Record<string, unknown> | null,
  updates: Record<string, unknown>
) {
  return Object.fromEntries(
    Object.entries(updates).map(([key, value]) => [
      key,
      hasValue(value) ? value : existing?.[key] ?? null,
    ])
  );
}

function getDistinctValues(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function normalizeAccountIdentity(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase().replace(/^@+/, '');
  return normalized || null;
}

function getProviderMetadata(connection: SocialConnectionRecord) {
  return connection.provider_metadata &&
    typeof connection.provider_metadata === 'object' &&
    !Array.isArray(connection.provider_metadata)
    ? connection.provider_metadata
    : {};
}

function getCachedConnectorAccountId(connection: SocialConnectionRecord) {
  const metadata = getProviderMetadata(connection);
  const connectorAccountId = metadata.connector_account_id;

  return typeof connectorAccountId === 'string' && connectorAccountId.trim()
    ? connectorAccountId.trim()
    : null;
}

function buildEmptyDiagnostic(errorCode: string | null = null): WindsorNoRowsDiagnostic {
  return {
    linkedAccountFound: false,
    snapshotRowsReceived: 0,
    snapshotExpectedAccountFound: false,
    dailyRowsReceived: 0,
    dailyExpectedAccountFound: false,
    distinctSnapshotAccounts: 0,
    distinctDailyAccounts: 0,
    returnedDatasourceValues: [],
    diagnosticErrorCode: errorCode,
  };
}

export function createSyncError(
  code: string,
  publicMessage: string,
  status = 400,
  diagnosticMetadata?: Record<string, unknown>
) {
  const error = new Error(publicMessage) as SyncError;
  error.code = code;
  error.status = status;
  error.publicMessage = publicMessage;
  error.diagnosticMetadata = diagnosticMetadata;
  return error;
}

export function toSyncError(error: unknown): SyncError {
  if (error instanceof Error && (error as Error & { code?: string }).code === 'windsor_invalid_response') {
    return createSyncError(
      'windsor_invalid_response',
      'Não foi possível interpretar a resposta do Instagram agora.',
      502
    );
  }

  if (
    error instanceof Error &&
    'code' in error &&
    typeof (error as SyncError).code === 'string' &&
    typeof (error as SyncError).status === 'number' &&
    typeof (error as SyncError).publicMessage === 'string'
  ) {
    return error as SyncError;
  }

  const status = (error as Error & { status?: number })?.status;

  if (status === 401 || status === 403) {
    return createSyncError(
      'windsor_auth_failed',
      'Não foi possível sincronizar o Instagram agora.',
      502
    );
  }

  if (status === 429) {
    return createSyncError(
      'windsor_rate_limited',
      'O Instagram está temporariamente indisponível para sincronização. Tente novamente em alguns minutos.',
      429
    );
  }

  if (typeof status === 'number' && status >= 500) {
    return createSyncError(
      'windsor_unavailable',
      'Não foi possível sincronizar o Instagram agora. Tente novamente em alguns minutos.',
      502
    );
  }

  return createSyncError(
    'sync_failed',
    'Não foi possível sincronizar o Instagram agora.',
    400
  );
}

export function sanitizeErrorMessage(error: unknown) {
  if (!(error instanceof Error) || !error.message.trim()) {
    return 'Unknown sync error.';
  }

  return error.message
    .replace(/api_key=[^&\s]+/gi, 'api_key=[redacted]')
    .replace(/access_token=[^&\s]+/gi, 'access_token=[redacted]')
    .replace(/account_id=[^&\s]+/gi, 'account_id=[redacted]')
    .replace(/filter=[^&\s]+/gi, 'filter=[redacted]')
    .slice(0, 500);
}

function canSyncConnectionAccountMetrics(connection: SocialConnectionRecord) {
  const platformConfig = getSocialPlatformConfig(connection.platform);

  return Boolean(
    platformConfig &&
      platformConfig.available &&
      platformConfig.provider === connection.provider &&
      connection.provider === 'windsor' &&
      connection.platform === 'instagram'
  );
}

function assertConnectionCanSyncAccountMetrics(connection: SocialConnectionRecord) {
  if (!canSyncConnectionAccountMetrics(connection)) {
    throw createSyncError(
      'unsupported_connection',
      'Esta conexão ainda não possui sincronização disponível.'
    );
  }

  if (connection.status !== 'active') {
    throw createSyncError(
      'connection_not_active',
      'Esta conexão do Instagram não está ativa.'
    );
  }
}

async function createSyncRun(
  adminClient: SocialAdminClient,
  params: {
    profileId: string;
    connectionId: string;
    provider: string;
    platform: string;
    syncType: SocialAccountMetricsSyncType;
    periodStart: string;
    periodEnd: string;
  }
) {
  const { data, error } = await adminClient
    .from('social_sync_runs')
    .insert({
      profile_id: params.profileId,
      connection_id: params.connectionId,
      provider: params.provider,
      platform: params.platform,
      sync_type: params.syncType,
      status: 'running',
      period_start: params.periodStart,
      period_end: params.periodEnd,
      started_at: new Date().toISOString(),
      metadata: {
        metrics_scope: 'account',
      },
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

async function finishSyncRun(
  adminClient: SocialAdminClient,
  syncRunId: string,
  updates: Record<string, unknown>
) {
  const { error } = await adminClient
    .from('social_sync_runs')
    .update({
      ...updates,
      finished_at: new Date().toISOString(),
    })
    .eq('id', syncRunId);

  if (error) throw error;
}

async function updateConnectionSyncStatus(
  adminClient: SocialAdminClient,
  params: {
    connectionId: string;
    success: boolean;
    errorMessage?: string | null;
  }
) {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    last_sync_at: now,
    last_sync_error: params.success ? null : params.errorMessage ?? 'Falha na sincronização.',
    updated_at: now,
  };

  if (params.success) {
    updates.last_successful_sync_at = now;
  }

  const { error } = await adminClient.from('social_connections').update(updates).eq('id', params.connectionId);

  if (error) throw error;
}

async function persistConnectorAccountId(
  adminClient: SocialAdminClient,
  params: {
    connection: SocialConnectionRecord;
    connectorAccountId: string;
  }
) {
  const now = new Date().toISOString();
  const providerMetadata = {
    ...getProviderMetadata(params.connection),
    connector_account_id: params.connectorAccountId,
  };

  const { error } = await adminClient
    .from('social_connections')
    .update({
      provider_metadata: providerMetadata,
      updated_at: now,
    })
    .eq('id', params.connection.id)
    .eq('profile_id', params.connection.profile_id);

  if (error) throw error;

  params.connection.provider_metadata = providerMetadata;
}

async function resolveConnectorAccountId(
  adminClient: SocialAdminClient,
  params: {
    connection: SocialConnectionRecord;
    expectedDatasource: string;
  }
) {
  const cachedConnectorAccountId = getCachedConnectorAccountId(params.connection);
  if (cachedConnectorAccountId) {
    return {
      connectorAccountId: cachedConnectorAccountId,
      resolvedFromCache: true,
    };
  }

  const expectedUsername = normalizeAccountIdentity(params.connection.external_account_name);
  if (!expectedUsername) {
    throw createSyncError(
      'windsor_connector_account_identity_missing',
      'Não foi possível identificar a conta do Instagram para sincronização.',
      422,
      {
        connector_account_resolution: {
          reason: 'missing_external_account_name',
        },
      }
    );
  }

  const candidates = await fetchWindsorInstagramConnectorAccountCandidates();
  const datasourceCandidates = candidates.filter(
    (candidate) => candidate.datasource === params.expectedDatasource
  );
  const matches = datasourceCandidates.filter((candidate) =>
    [candidate.accountName, candidate.userName, candidate.username]
      .map(normalizeAccountIdentity)
      .some((value) => value === expectedUsername)
  );
  const returnedDatasourceValues = getDistinctValues(candidates.map((candidate) => candidate.datasource));
  const diagnosticMetadata = {
    connector_account_resolution: {
      candidatesReceived: candidates.length,
      matchingCandidates: matches.length,
      expectedDatasource: params.expectedDatasource,
      returnedDatasourceValues,
    },
  };

  if (matches.length !== 1 || !matches[0].accountId) {
    throw createSyncError(
      matches.length === 0
        ? 'windsor_connector_account_not_found'
        : 'windsor_connector_account_ambiguous',
      'Não foi possível identificar a conta do Instagram para sincronização.',
      422,
      diagnosticMetadata
    );
  }

  await persistConnectorAccountId(adminClient, {
    connection: params.connection,
    connectorAccountId: matches[0].accountId,
  });

  return {
    connectorAccountId: matches[0].accountId,
    resolvedFromCache: false,
  };
}

async function buildNoRowsDiagnostic(
  params: {
    connection: SocialConnectionRecord;
    expectedDatasource: string;
    expectedConnectorAccountId: string;
  },
  loggerLabel: string
): Promise<WindsorNoRowsDiagnostic> {
  try {
    const [linkedAccountsResult, snapshotRows, dailyRows] = await Promise.all([
      listWindsorLinkedAccounts({
        datasourceId: params.expectedDatasource,
      }),
      fetchWindsorInstagramSnapshotDiagnosticRows(),
      fetchWindsorInstagramDailyDiagnosticRows(),
    ]);

    const linkedAccountFound = linkedAccountsResult.accounts.some(
      (account) =>
        account.datasource === params.expectedDatasource &&
        account.accountId === params.connection.external_account_id
    );
    const snapshotExpectedAccountFound = snapshotRows.some(
      (row) =>
        row.datasource === params.expectedDatasource &&
        row.accountId === params.expectedConnectorAccountId
    );
    const dailyExpectedAccountFound = dailyRows.some(
      (row) =>
        row.datasource === params.expectedDatasource &&
        row.accountId === params.expectedConnectorAccountId
    );
    const returnedDatasourceValues = getDistinctValues([
      ...linkedAccountsResult.accounts.map((account) => account.datasource),
      ...snapshotRows.map((row) => row.datasource),
      ...dailyRows.map((row) => row.datasource),
    ]);

    return {
      linkedAccountFound,
      snapshotRowsReceived: snapshotRows.length,
      snapshotExpectedAccountFound,
      dailyRowsReceived: dailyRows.length,
      dailyExpectedAccountFound,
      distinctSnapshotAccounts: getDistinctValues(snapshotRows.map((row) => row.accountId)).length,
      distinctDailyAccounts: getDistinctValues(dailyRows.map((row) => row.accountId)).length,
      returnedDatasourceValues,
      diagnosticErrorCode: null,
    };
  } catch (error) {
    console.error(`${loggerLabel} Windsor no rows diagnostic failed:`, {
      message: sanitizeErrorMessage(error),
    });

    return buildEmptyDiagnostic('windsor_no_rows_diagnostic_failed');
  }
}

async function loadExistingMetricRow(
  adminClient: SocialAdminClient,
  params: { connectionId: string; metricDate: string }
) {
  const { data, error } = await adminClient
    .from('social_account_metrics')
    .select(
      'followers, followers_gained, reach, impressions, followers_count, follower_count_1d, reach_1d, impressions_1d, accounts_engaged, likes, comments, saves, shares, platform_metrics, raw_data'
    )
    .eq('connection_id', params.connectionId)
    .eq('metric_date', params.metricDate)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Record<string, unknown> | null;
}

async function buildSnapshotMetricUpsertRow(params: {
  adminClient: SocialAdminClient;
  connection: SocialConnectionRecord;
  datasource: string;
  metricDate: string;
  fetchedAt: string;
  row: WindsorInstagramAccountMetricsRow;
}) {
  const existing = await loadExistingMetricRow(params.adminClient, {
    connectionId: params.connection.id,
    metricDate: params.metricDate,
  });
  const existingPlatformMetrics =
    existing?.platform_metrics && typeof existing.platform_metrics === 'object'
      ? (existing.platform_metrics as Record<string, unknown>)
      : null;
  const existingRawData =
    existing?.raw_data && typeof existing.raw_data === 'object'
      ? (existing.raw_data as Record<string, unknown>)
      : null;

  return {
    profile_id: params.connection.profile_id,
    connection_id: params.connection.id,
    datasource: params.datasource,
    metric_date: params.metricDate,
    followers: hasValue(params.row.followersCount)
      ? params.row.followersCount
      : existing?.followers ?? null,
    followers_count: hasValue(params.row.followersCount)
      ? params.row.followersCount
      : existing?.followers_count ?? null,
    platform_metrics: mergeDefinedMetrics(existingPlatformMetrics, {
      ...buildPlatformMetrics({
        ...params.row,
        followerCount1d: null,
        reach1d: null,
        impressions1d: null,
        accountsEngaged: null,
        likes: null,
        comments: null,
        saves: null,
        shares: null,
      }),
      sync_kind: 'snapshot',
    }),
    raw_data: mergeDefinedMetrics(existingRawData, {
      followers_count: params.row.rawData.followers_count,
      snapshot_raw_data: params.row.rawData,
    }),
    fetched_at: params.fetchedAt,
    updated_at: params.fetchedAt,
  };
}

async function buildDailyMetricsUpsertRow(params: {
  adminClient: SocialAdminClient;
  connection: SocialConnectionRecord;
  datasource: string;
  metricDate: string;
  fetchedAt: string;
  row: WindsorInstagramAccountMetricsRow;
}) {
  const existing = await loadExistingMetricRow(params.adminClient, {
    connectionId: params.connection.id,
    metricDate: params.metricDate,
  });
  const existingPlatformMetrics =
    existing?.platform_metrics && typeof existing.platform_metrics === 'object'
      ? (existing.platform_metrics as Record<string, unknown>)
      : null;
  const existingRawData =
    existing?.raw_data && typeof existing.raw_data === 'object'
      ? (existing.raw_data as Record<string, unknown>)
      : null;

  return {
    profile_id: params.connection.profile_id,
    connection_id: params.connection.id,
    datasource: params.datasource,
    metric_date: params.metricDate,
    followers_gained: hasValue(params.row.followerCount1d)
      ? params.row.followerCount1d
      : existing?.followers_gained ?? null,
    reach: hasValue(params.row.reach1d) ? params.row.reach1d : existing?.reach ?? null,
    impressions: hasValue(params.row.impressions1d)
      ? params.row.impressions1d
      : existing?.impressions ?? null,
    follower_count_1d: hasValue(params.row.followerCount1d)
      ? params.row.followerCount1d
      : existing?.follower_count_1d ?? null,
    reach_1d: hasValue(params.row.reach1d) ? params.row.reach1d : existing?.reach_1d ?? null,
    impressions_1d: hasValue(params.row.impressions1d)
      ? params.row.impressions1d
      : existing?.impressions_1d ?? null,
    accounts_engaged: hasValue(params.row.accountsEngaged)
      ? params.row.accountsEngaged
      : existing?.accounts_engaged ?? null,
    likes: hasValue(params.row.likes) ? params.row.likes : existing?.likes ?? null,
    comments: hasValue(params.row.comments) ? params.row.comments : existing?.comments ?? null,
    saves: hasValue(params.row.saves) ? params.row.saves : existing?.saves ?? null,
    shares: hasValue(params.row.shares) ? params.row.shares : existing?.shares ?? null,
    platform_metrics: mergeDefinedMetrics(existingPlatformMetrics, {
      ...buildPlatformMetrics({
        ...params.row,
        followersCount: null,
      }),
      sync_kind: 'daily_metrics',
    }),
    raw_data: mergeDefinedMetrics(existingRawData, {
      daily_metrics_raw_data: {
        ...params.row.rawData,
        followers_count: null,
      },
    }),
    fetched_at: params.fetchedAt,
    updated_at: params.fetchedAt,
  };
}

function mergeMetricValue(currentValue: number | null, incomingValue: number | null) {
  return hasValue(incomingValue) ? incomingValue : currentValue;
}

function mergeDailyMetricRow(
  currentRow: WindsorInstagramAccountMetricsRow | null,
  incomingRow: WindsorInstagramAccountMetricsRow,
  rawDataKey: 'daily_profile_raw_data' | 'daily_total_value_raw_data'
): WindsorInstagramAccountMetricsRow {
  return {
    date: currentRow?.date ?? incomingRow.date,
    datasource: currentRow?.datasource ?? incomingRow.datasource,
    accountId: currentRow?.accountId ?? incomingRow.accountId,
    followersCount: null,
    followerCount1d: mergeMetricValue(currentRow?.followerCount1d ?? null, incomingRow.followerCount1d),
    reach1d: mergeMetricValue(currentRow?.reach1d ?? null, incomingRow.reach1d),
    impressions1d: mergeMetricValue(currentRow?.impressions1d ?? null, incomingRow.impressions1d),
    accountsEngaged: mergeMetricValue(currentRow?.accountsEngaged ?? null, incomingRow.accountsEngaged),
    likes: mergeMetricValue(currentRow?.likes ?? null, incomingRow.likes),
    comments: mergeMetricValue(currentRow?.comments ?? null, incomingRow.comments),
    saves: mergeMetricValue(currentRow?.saves ?? null, incomingRow.saves),
    shares: mergeMetricValue(currentRow?.shares ?? null, incomingRow.shares),
    rawData: {
      ...(currentRow?.rawData ?? {}),
      [rawDataKey]: incomingRow.rawData,
    },
  };
}

function mergeDailyMetricRows(params: {
  profileRows: WindsorInstagramAccountMetricsRow[];
  totalValueRows: WindsorInstagramAccountMetricsRow[];
}) {
  const rowsByKey = new Map<string, WindsorInstagramAccountMetricsRow>();

  for (const row of params.profileRows) {
    if (!row.accountId || !row.date) continue;

    const key = `${row.accountId}:${row.date}`;
    rowsByKey.set(
      key,
      mergeDailyMetricRow(rowsByKey.get(key) ?? null, row, 'daily_profile_raw_data')
    );
  }

  for (const row of params.totalValueRows) {
    if (!row.accountId || !row.date) continue;

    const key = `${row.accountId}:${row.date}`;
    rowsByKey.set(
      key,
      mergeDailyMetricRow(rowsByKey.get(key) ?? null, row, 'daily_total_value_raw_data')
    );
  }

  return Array.from(rowsByKey.values());
}

export async function loadSocialConnectionById(
  adminClient: SocialAdminClient,
  params: { profileId: string; connectionId: string }
) {
  const { data, error } = await adminClient
    .from('social_connections')
    .select(SOCIAL_CONNECTION_SYNC_SELECT)
    .eq('id', params.connectionId)
    .eq('profile_id', params.profileId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw createSyncError(
      'connection_not_found',
      'A conexão do Instagram não foi encontrada.',
      404
    );
  }

  return data as SocialConnectionRecord;
}

export async function listScheduledSocialConnections(adminClient: SocialAdminClient) {
  const { data, error } = await adminClient
    .from('social_connections')
    .select(SOCIAL_CONNECTION_SYNC_SELECT)
    .eq('provider', 'windsor')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as SocialConnectionRecord[]).filter(canSyncConnectionAccountMetrics);
}

export async function syncSocialConnectionAccountMetrics(params: {
  adminClient: SocialAdminClient;
  connection: SocialConnectionRecord;
  syncType: SocialAccountMetricsSyncType;
  loggerLabel?: string;
}): Promise<SocialAccountMetricsSyncResult> {
  const loggerLabel = params.loggerLabel ?? '[social-sync-account-metrics]';
  let syncRunId: string | null = null;

  try {
    assertConnectionCanSyncAccountMetrics(params.connection);

    const platformConfig = getSocialPlatformConfig(params.connection.platform);
    const datasource =
      params.connection.provider_datasource || platformConfig?.windsorDatasource || 'instagram';
    const { today, yesterday } = getDailySyncWindow();

    syncRunId = await createSyncRun(params.adminClient, {
      profileId: params.connection.profile_id,
      connectionId: params.connection.id,
      provider: params.connection.provider,
      platform: params.connection.platform,
      syncType: params.syncType,
      periodStart: yesterday,
      periodEnd: today,
    });

    const connectorAccountResolution = await resolveConnectorAccountId(params.adminClient, {
      connection: params.connection,
      expectedDatasource: datasource,
    });
    const connectorAccountId = connectorAccountResolution.connectorAccountId;

    const snapshotRows = await fetchWindsorInstagramAccountMetrics({
      fields: ['datasource', 'account_id', 'followers_count'],
    });
    const dailyProfileRows = await fetchWindsorInstagramAccountMetrics({
      dateFrom: yesterday,
      dateTo: yesterday,
      fields: [
        'date',
        'datasource',
        'account_id',
        'follower_count_1d',
        'reach_1d',
        'impressions_1d',
      ],
    });
    const dailyTotalValueRows = await fetchWindsorInstagramAccountMetrics({
      dateFrom: yesterday,
      dateTo: yesterday,
      fields: [
        'date',
        'datasource',
        'account_id',
        'accounts_engaged',
        'likes',
        'comments',
        'saves',
        'shares',
      ],
    });
    const receivedRows = snapshotRows.length + dailyProfileRows.length + dailyTotalValueRows.length;

    const scopedSnapshotRows = snapshotRows.filter(
      (row) => row.accountId === connectorAccountId && row.datasource === datasource
    );
    const scopedDailyProfileRows = dailyProfileRows.filter(
      (row) =>
        row.accountId === connectorAccountId &&
        row.datasource === datasource &&
        isValidIsoDate(row.date)
    );
    const scopedDailyTotalValueRows = dailyTotalValueRows.filter(
      (row) =>
        row.accountId === connectorAccountId &&
        row.datasource === datasource &&
        isValidIsoDate(row.date)
    );
    const scopedDailyMetricRows = mergeDailyMetricRows({
      profileRows: scopedDailyProfileRows,
      totalValueRows: scopedDailyTotalValueRows,
    });
    const fetchedAt = new Date().toISOString();

    if (scopedSnapshotRows.length === 0 && scopedDailyMetricRows.length === 0) {
      const noRowsCode =
        receivedRows === 0
          ? 'windsor_no_rows_returned'
          : 'windsor_no_rows_for_connection';
      const noRowsMessage =
        receivedRows === 0
          ? 'Windsor returned no rows for the requested account metrics window.'
          : 'Windsor returned rows, but none matched the expected account and datasource.';
      const diagnostic = await buildNoRowsDiagnostic(
        {
          connection: params.connection,
          expectedDatasource: datasource,
          expectedConnectorAccountId: connectorAccountId,
        },
        loggerLabel
      );

      await finishSyncRun(params.adminClient, syncRunId, {
        status: 'partial',
        records_received: receivedRows,
        records_created: null,
        records_updated: 0,
        error_code: noRowsCode,
        error_message: noRowsMessage,
        metadata: {
          metrics_scope: 'account',
          connector_account_id_resolved_from_cache: connectorAccountResolution.resolvedFromCache,
          snapshot_rows_received: snapshotRows.length,
          daily_profile_rows_received: dailyProfileRows.length,
          daily_total_value_rows_received: dailyTotalValueRows.length,
          scoped_snapshot_rows: scopedSnapshotRows.length,
          scoped_daily_profile_rows: scopedDailyProfileRows.length,
          scoped_daily_total_value_rows: scopedDailyTotalValueRows.length,
          upserted_rows: 0,
          diagnostic,
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
        periodStart: yesterday,
        periodEnd: today,
        recordsReceived: receivedRows,
        recordsProcessed: 0,
      };
    }

    const rowsToUpsert = [
      ...(await Promise.all(
        scopedSnapshotRows.map((row) =>
          buildSnapshotMetricUpsertRow({
            adminClient: params.adminClient,
            connection: params.connection,
            datasource,
            metricDate: today,
            fetchedAt,
            row,
          })
        )
      )),
      ...(await Promise.all(
        scopedDailyMetricRows.map((row) =>
          buildDailyMetricsUpsertRow({
            adminClient: params.adminClient,
            connection: params.connection,
            datasource,
            metricDate: yesterday,
            fetchedAt,
            row,
          })
        )
      )),
    ];

    if (rowsToUpsert.length > 0) {
      const { error } = await params.adminClient.from('social_account_metrics').upsert(rowsToUpsert, {
        onConflict: 'connection_id,metric_date',
      });

      if (error) {
        throw createSyncError(
          'metrics_persistence_failed',
          'Não foi possível salvar as métricas do Instagram.'
        );
      }
    }

    await finishSyncRun(params.adminClient, syncRunId, {
      status: 'success',
      records_received: receivedRows,
      records_created: null,
      records_updated: rowsToUpsert.length,
      error_code: null,
      error_message: null,
      metadata: {
        metrics_scope: 'account',
        connector_account_id_resolved_from_cache: connectorAccountResolution.resolvedFromCache,
        snapshot_rows_received: snapshotRows.length,
        daily_profile_rows_received: dailyProfileRows.length,
        daily_total_value_rows_received: dailyTotalValueRows.length,
        scoped_snapshot_rows: scopedSnapshotRows.length,
        scoped_daily_profile_rows: scopedDailyProfileRows.length,
        scoped_daily_total_value_rows: scopedDailyTotalValueRows.length,
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
      periodStart: yesterday,
      periodEnd: today,
      recordsReceived: receivedRows,
      recordsProcessed: rowsToUpsert.length,
    };
  } catch (error) {
    const syncError = toSyncError(error);
    const sanitizedErrorMessage = sanitizeErrorMessage(error);

    console.error(`${loggerLabel} error:`, {
      code: syncError.code,
      message: sanitizedErrorMessage,
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
        error_message: sanitizedErrorMessage,
        ...(syncError.diagnosticMetadata
          ? {
              metadata: {
                metrics_scope: 'account',
                ...syncError.diagnosticMetadata,
              },
            }
          : {}),
      }).catch((syncRunError) => {
        console.error(
          `${loggerLabel} failed to update sync run:`,
          sanitizeErrorMessage(syncRunError)
        );
      });
    }

    await updateConnectionSyncStatus(params.adminClient, {
      connectionId: params.connection.id,
      success: false,
      errorMessage: sanitizedErrorMessage,
    }).catch((connectionUpdateError) => {
      console.error(
        `${loggerLabel} failed to update connection sync status:`,
        sanitizeErrorMessage(connectionUpdateError)
      );
    });

    throw syncError;
  }
}
