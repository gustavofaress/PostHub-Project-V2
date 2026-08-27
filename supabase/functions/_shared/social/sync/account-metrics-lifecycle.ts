import type { SocialAdminClient } from '../security.ts';

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

export function toSyncError(error: unknown, platform: 'instagram' | 'youtube' = 'instagram'): SyncError {
  const platformLabel = platform === 'youtube' ? 'YouTube' : 'Instagram';

  if (error instanceof Error && (error as Error & { code?: string }).code === 'windsor_invalid_response') {
    return createSyncError(
      'windsor_invalid_response',
      `Não foi possível interpretar a resposta do ${platformLabel} agora.`,
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
      `Não foi possível sincronizar o ${platformLabel} agora.`,
      502
    );
  }

  if (status === 429) {
    return createSyncError(
      'windsor_rate_limited',
      `O ${platformLabel} está temporariamente indisponível para sincronização. Tente novamente em alguns minutos.`,
      429
    );
  }

  if (typeof status === 'number' && status >= 500) {
    return createSyncError(
      'windsor_unavailable',
      `Não foi possível sincronizar o ${platformLabel} agora. Tente novamente em alguns minutos.`,
      502
    );
  }

  return createSyncError(
    'sync_failed',
    `Não foi possível sincronizar o ${platformLabel} agora.`,
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

export async function createSyncRun(
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

export async function finishSyncRun(
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

export async function updateConnectionSyncStatus(
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

export async function loadExistingMetricRow(
  adminClient: SocialAdminClient,
  params: { connectionId: string; metricDate: string }
) {
  const { data, error } = await adminClient
    .from('social_account_metrics')
    .select(
      'followers, followers_gained, reach, views, impressions, followers_count, follower_count_1d, reach_1d, impressions_1d, accounts_engaged, likes, comments, saves, shares, platform_metrics, raw_data'
    )
    .eq('connection_id', params.connectionId)
    .eq('metric_date', params.metricDate)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Record<string, unknown> | null;
}
