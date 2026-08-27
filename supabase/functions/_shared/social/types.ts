export type SocialProvider = 'windsor';

export type SocialPlatform = 'instagram' | 'youtube' | 'tiktok' | 'linkedin';

export type SocialConnectionStatus =
  | 'active'
  | 'disconnected'
  | 'error'
  | 'reauthorization_required';

export type SocialConnectionAttemptStatus =
  | 'pending'
  | 'awaiting_account_selection'
  | 'completed'
  | 'expired'
  | 'failed'
  | 'cancelled';

export interface SocialPlatformConfig {
  provider: SocialProvider;
  platform: SocialPlatform;
  windsorConnector: string;
  windsorDatasource: string;
  available: boolean;
}

export interface SocialConnectionAttemptRecord {
  id: string;
  profile_id: string;
  provider: SocialProvider;
  platform: SocialPlatform;
  requested_by: string | null;
  status: SocialConnectionAttemptStatus;
  provider_correlation_secret_encrypted: string | null;
  expires_at: string | null;
  last_checked_at: string | null;
  completed_at: string | null;
  error_code: string | null;
  error_message: string | null;
}

export interface SocialConnectionRecord {
  id: string;
  profile_id: string;
  provider: SocialProvider;
  platform: SocialPlatform;
  provider_datasource: string | null;
  external_account_id: string;
  external_account_name: string | null;
  external_account_handle: string | null;
  external_account_avatar_url: string | null;
  status: SocialConnectionStatus;
  connected_by: string | null;
  provider_metadata: Record<string, unknown>;
  connected_at: string;
  disconnected_at: string | null;
  last_sync_at: string | null;
  last_successful_sync_at: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface WindsorAuthorizationLink {
  authorizationUrl: string;
  accessToken: string;
}

export interface WindsorLinkedAccount {
  datasource: string;
  accountId: string;
  accountName: string | null;
  accountHandle: string | null;
  accountAvatarUrl: string | null;
  accessToken: string | null;
  status: string | null;
  metadata: Record<string, unknown>;
}

export interface SanitizedLinkedAccount {
  externalAccountId: string;
  accountName: string | null;
  accountHandle: string | null;
  accountAvatarUrl: string | null;
}

export interface WindsorInstagramAccountMetricsRow {
  date: string | null;
  datasource: string | null;
  accountId: string | null;
  followersCount: number | null;
  followerCount1d: number | null;
  reach1d: number | null;
  impressions1d: number | null;
  accountsEngaged: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  rawData: Record<string, unknown>;
}

export interface WindsorYoutubeChannelSnapshotRow {
  datasource: string | null;
  accountId: string | null;
  accountName: string | null;
  channelImage: string | null;
  subscriberCount: number | null;
  rawData: Record<string, unknown>;
}

export interface WindsorYoutubeDailyMetricsRow {
  date: string | null;
  datasource: string | null;
  accountId: string | null;
  subscribersGainedChannel: number | null;
  subscribersLostChannel: number | null;
  views: number | null;
  estimatedMinutesWatched: number | null;
  averageViewDuration: number | null;
  averageViewPercentage: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  rawData: Record<string, unknown>;
}
