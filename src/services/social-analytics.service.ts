import { supabase } from '../shared/utils/supabase';
import type {
  CheckSocialConnectionResult,
  CreateSocialConnectionResult,
  SocialAccountMetric,
  SocialConnection,
  SocialPlatform,
} from '../types/social-analytics';

interface SocialConnectionRow {
  id: string;
  profile_id: string;
  provider: 'windsor';
  platform: SocialPlatform;
  provider_datasource: string | null;
  external_account_id: string;
  external_account_name: string | null;
  external_account_handle: string | null;
  external_account_avatar_url: string | null;
  status: SocialConnection['status'];
  connected_at: string;
  disconnected_at: string | null;
  last_sync_at: string | null;
  last_successful_sync_at: string | null;
  last_sync_error: string | null;
}

interface SyncConnectionResult {
  status: 'success' | 'partial';
  connectionId: string;
  profileId: string;
  periodStart: string;
  periodEnd: string;
  recordsReceived: number;
  recordsProcessed: number;
}

interface SocialAccountMetricRow {
  id: string;
  profile_id: string;
  connection_id: string;
  datasource: string | null;
  metric_date: string | null;
  followers_count: number | null;
  follower_count_1d: number | null;
  reach_1d: number | null;
  impressions_1d: number | null;
  accounts_engaged: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  platform_metrics: Record<string, unknown> | null;
  raw_data: Record<string, unknown> | null;
  fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapConnection(row: SocialConnectionRow): SocialConnection {
  return {
    id: row.id,
    profileId: row.profile_id,
    provider: row.provider,
    platform: row.platform,
    providerDatasource: row.provider_datasource,
    externalAccountId: row.external_account_id,
    externalAccountName: row.external_account_name,
    externalAccountHandle: row.external_account_handle,
    externalAccountAvatarUrl: row.external_account_avatar_url,
    status: row.status,
    connectedAt: row.connected_at,
    disconnectedAt: row.disconnected_at,
    lastSyncAt: row.last_sync_at,
    lastSuccessfulSyncAt: row.last_successful_sync_at,
    lastSyncError: row.last_sync_error,
  };
}

function mapAccountMetric(row: SocialAccountMetricRow): SocialAccountMetric {
  if (!row.metric_date) {
    throw new Error('social_account_metrics.metric_date is required for Performance.');
  }

  return {
    id: row.id,
    profileId: row.profile_id,
    connectionId: row.connection_id,
    datasource: row.datasource,
    metricDate: row.metric_date,
    followersCount: row.followers_count,
    followerCount1d: row.follower_count_1d,
    reach1d: row.reach_1d,
    impressions1d: row.impressions_1d,
    accountsEngaged: row.accounts_engaged,
    likes: row.likes,
    comments: row.comments,
    saves: row.saves,
    shares: row.shares,
    platformMetrics: row.platform_metrics,
    rawData: row.raw_data,
    fetchedAt: row.fetched_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function invokeFunction<T>(functionName: string, body: Record<string, unknown>) {
  if (!supabase) {
    throw new Error('Supabase não está configurado.');
  }

  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) {
    throw error;
  }

  return data as T;
}

function isSyncConnectionResult(value: unknown): value is SyncConnectionResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as Record<string, unknown>;

  return (
    (result.status === 'success' || result.status === 'partial') &&
    typeof result.connectionId === 'string' &&
    typeof result.profileId === 'string' &&
    typeof result.periodStart === 'string' &&
    typeof result.periodEnd === 'string' &&
    typeof result.recordsReceived === 'number' &&
    typeof result.recordsProcessed === 'number'
  );
}

export const socialAnalyticsService = {
  async listConnections(profileId: string): Promise<SocialConnection[]> {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('social_connections')
      .select(
        'id, profile_id, provider, platform, provider_datasource, external_account_id, external_account_name, external_account_handle, external_account_avatar_url, status, connected_at, disconnected_at, last_sync_at, last_successful_sync_at, last_sync_error'
      )
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as SocialConnectionRow[]).map(mapConnection);
  },

  async getActiveInstagramConnection(profileId: string): Promise<SocialConnection | null> {
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from('social_connections')
      .select(
        'id, profile_id, provider, platform, provider_datasource, external_account_id, external_account_name, external_account_handle, external_account_avatar_url, status, connected_at, disconnected_at, last_sync_at, last_successful_sync_at, last_sync_error'
      )
      .eq('profile_id', profileId)
      .eq('provider', 'windsor')
      .eq('platform', 'instagram')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapConnection(data as SocialConnectionRow) : null;
  },

  async listAccountMetrics(params: {
    profileId: string;
    connectionId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<SocialAccountMetric[]> {
    if (!supabase) {
      return [];
    }

    let query = supabase
      .from('social_account_metrics')
      .select(
        'id, profile_id, connection_id, datasource, metric_date, followers_count, follower_count_1d, reach_1d, impressions_1d, accounts_engaged, likes, comments, saves, shares, platform_metrics, raw_data, fetched_at, created_at, updated_at'
      )
      .eq('profile_id', params.profileId)
      .eq('connection_id', params.connectionId)
      .not('metric_date', 'is', null)
      .order('metric_date', { ascending: true });

    if (params.startDate) {
      query = query.gte('metric_date', params.startDate);
    }

    if (params.endDate) {
      query = query.lte('metric_date', params.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return ((data ?? []) as SocialAccountMetricRow[]).map(mapAccountMetric);
  },

  async createConnection(profileId: string, platform: SocialPlatform) {
    return invokeFunction<CreateSocialConnectionResult>('social-create-connection', {
      profileId,
      platform,
    });
  },

  async checkConnection(attemptId: string, externalAccountId?: string | null) {
    return invokeFunction<CheckSocialConnectionResult>('social-check-connection', {
      attemptId,
      externalAccountId: externalAccountId || undefined,
    });
  },

  async syncConnection(profileId: string, connectionId: string): Promise<SyncConnectionResult> {
    console.info('[socialAnalyticsService] social-sync-connection invoke start:', {
      profileId,
      connectionId,
    });

    const result = await invokeFunction<unknown>('social-sync-connection', {
      profileId,
      connectionId,
    });

    console.info('[socialAnalyticsService] social-sync-connection invoke result:', {
      profileId,
      connectionId,
      status: isSyncConnectionResult(result) ? result.status : 'invalid_payload',
    });

    if (!isSyncConnectionResult(result)) {
      throw new Error('A Edge Function retornou uma resposta inesperada.');
    }

    if (result.profileId !== profileId || result.connectionId !== connectionId) {
      throw new Error('A Edge Function retornou uma conexão diferente da solicitada.');
    }

    return result;
  },

  async disconnect(connectionId: string) {
    return invokeFunction<{ status: string; connectionId: string }>('social-disconnect', {
      connectionId,
    });
  },
};
