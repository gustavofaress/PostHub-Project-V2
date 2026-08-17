export type SocialPlatform = 'instagram' | 'youtube' | 'tiktok' | 'linkedin';

export type SocialProvider = 'windsor';

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

export interface SocialConnection {
  id: string;
  profileId: string;
  provider: SocialProvider;
  platform: SocialPlatform;
  providerDatasource: string | null;
  externalAccountId: string;
  externalAccountName: string | null;
  externalAccountHandle: string | null;
  externalAccountAvatarUrl: string | null;
  status: SocialConnectionStatus;
  connectedAt: string;
  disconnectedAt: string | null;
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastSyncError: string | null;
}

export interface SocialConnectionAttemptAccount {
  externalAccountId: string;
  accountName: string | null;
  accountHandle: string | null;
  accountAvatarUrl: string | null;
}

export interface CreateSocialConnectionResult {
  attemptId: string;
  status: SocialConnectionAttemptStatus;
  expiresAt: string | null;
  authorizationUrl: string;
}

export interface CheckSocialConnectionResult {
  status: SocialConnectionAttemptStatus;
  message?: string;
  accounts?: SocialConnectionAttemptAccount[];
  connection?: SocialConnection;
}

export interface SocialAccountMetric {
  id: string;
  profileId: string;
  connectionId: string;
  datasource: string | null;
  metricDate: string;
  followersCount: number | null;
  followerCount1d: number | null;
  reach1d: number | null;
  impressions1d: number | null;
  accountsEngaged: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  platformMetrics: Record<string, unknown> | null;
  rawData: Record<string, unknown> | null;
  fetchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
