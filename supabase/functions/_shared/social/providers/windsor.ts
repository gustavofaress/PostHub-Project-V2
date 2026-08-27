import type {
  SanitizedLinkedAccount,
  WindsorAuthorizationLink,
  WindsorInstagramAccountMetricsRow,
  WindsorLinkedAccount,
  WindsorYoutubeChannelSnapshotRow,
  WindsorYoutubeDailyMetricsRow,
} from '../types.ts';

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

const WINDSOR_API_KEY = Deno.env.get('WINDSOR_API_KEY') ?? '';
const WINDSOR_ONBOARD_BASE_URL = 'https://onboard.windsor.ai';
const WINDSOR_CONNECTORS_BASE_URL = 'https://connectors.windsor.ai';
const WINDSOR_INSTAGRAM_ACCOUNT_METRIC_FIELDS = [
  'date',
  'datasource',
  'account_id',
  'followers_count',
  'follower_count_1d',
  'reach_1d',
  'impressions_1d',
  'accounts_engaged',
  'likes',
  'comments',
  'saves',
  'shares',
];
const WINDSOR_YOUTUBE_CHANNEL_SNAPSHOT_FIELDS = [
  'datasource',
  'account_id',
  'account_name',
  'channel_image',
  'subscriber_count',
];
const WINDSOR_YOUTUBE_DAILY_METRIC_FIELDS = [
  'date',
  'datasource',
  'account_id',
  'subscribers_gained_channel',
  'subscribers_lost_channel',
  'views',
  'estimated_minutes_watched',
  'average_view_duration',
  'average_view_percentage',
  'likes',
  'comments',
  'shares',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getOptionalString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function getNullableNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback;

  const directError = payload.error;
  if (typeof directError === 'string' && directError.trim()) {
    return directError;
  }

  if (isRecord(directError)) {
    const message = getOptionalString(directError, 'message');
    if (message) return message;
  }

  const message = getOptionalString(payload, 'message');
  if (message) return message;

  return fallback;
}

async function requestWindsor(path: string, init?: RequestInit) {
  if (!WINDSOR_API_KEY) {
    throw new Error('WINDSOR_API_KEY is missing.');
  }

  const url = new URL(path, WINDSOR_ONBOARD_BASE_URL);
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Windsor request failed (${response.status}).`));
  }

  return payload;
}

async function requestWindsorConnector(path: string, init?: RequestInit) {
  if (!WINDSOR_API_KEY) {
    throw new Error('WINDSOR_API_KEY is missing.');
  }

  const url = new URL(path, WINDSOR_CONNECTORS_BASE_URL);
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'PostHub/1.0 Windsor/1.0',
      ...(init?.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const error = new Error(getErrorMessage(payload, `Windsor connector request failed (${response.status}).`));
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return payload;
}

function getRowsFromConnectorPayload(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    const error = new Error('Windsor returned an unexpected account metrics payload.');
    (error as Error & { status?: number; code?: string }).status = 502;
    (error as Error & { status?: number; code?: string }).code = 'windsor_invalid_response';
    throw error;
  }

  const data = payload.data;
  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }

  const error = new Error('Windsor returned an unexpected account metrics payload.');
  (error as Error & { status?: number; code?: string }).status = 502;
  (error as Error & { status?: number; code?: string }).code = 'windsor_invalid_response';
  throw error;
}

function sanitizeInstagramMetricsRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    WINDSOR_INSTAGRAM_ACCOUNT_METRIC_FIELDS.map((field) => [field, row[field]])
  );
}

function normalizeInstagramMetricsRow(row: Record<string, unknown>): WindsorInstagramAccountMetricsRow {
  return {
    date: getOptionalString(row, 'date'),
    datasource: getOptionalString(row, 'datasource'),
    accountId: getOptionalString(row, 'account_id'),
    followersCount: getNullableNumber(row, 'followers_count'),
    followerCount1d: getNullableNumber(row, 'follower_count_1d'),
    reach1d: getNullableNumber(row, 'reach_1d'),
    impressions1d: getNullableNumber(row, 'impressions_1d'),
    accountsEngaged: getNullableNumber(row, 'accounts_engaged'),
    likes: getNullableNumber(row, 'likes'),
    comments: getNullableNumber(row, 'comments'),
    saves: getNullableNumber(row, 'saves'),
    shares: getNullableNumber(row, 'shares'),
    rawData: sanitizeInstagramMetricsRow(row),
  };
}

function sanitizeYoutubeConnectorRow(
  row: Record<string, unknown>,
  fields: readonly string[]
): Record<string, unknown> {
  return Object.fromEntries(
    fields.map((field) => {
      const value = row[field];
      const isPrimitive =
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean';

      return [field, isPrimitive ? value : null];
    })
  );
}

export function normalizeWindsorYoutubeChannelSnapshotRow(
  row: Record<string, unknown>
): WindsorYoutubeChannelSnapshotRow {
  return {
    datasource: getOptionalString(row, 'datasource'),
    accountId: getOptionalString(row, 'account_id'),
    accountName: getOptionalString(row, 'account_name'),
    channelImage: getOptionalString(row, 'channel_image'),
    subscriberCount: getNullableNumber(row, 'subscriber_count'),
    rawData: sanitizeYoutubeConnectorRow(row, WINDSOR_YOUTUBE_CHANNEL_SNAPSHOT_FIELDS),
  };
}

export function normalizeWindsorYoutubeDailyMetricsRow(
  row: Record<string, unknown>
): WindsorYoutubeDailyMetricsRow {
  return {
    date: getOptionalString(row, 'date'),
    datasource: getOptionalString(row, 'datasource'),
    accountId: getOptionalString(row, 'account_id'),
    subscribersGainedChannel: getNullableNumber(row, 'subscribers_gained_channel'),
    subscribersLostChannel: getNullableNumber(row, 'subscribers_lost_channel'),
    views: getNullableNumber(row, 'views'),
    estimatedMinutesWatched: getNullableNumber(row, 'estimated_minutes_watched'),
    averageViewDuration: getNullableNumber(row, 'average_view_duration'),
    averageViewPercentage: getNullableNumber(row, 'average_view_percentage'),
    likes: getNullableNumber(row, 'likes'),
    comments: getNullableNumber(row, 'comments'),
    shares: getNullableNumber(row, 'shares'),
    rawData: sanitizeYoutubeConnectorRow(row, WINDSOR_YOUTUBE_DAILY_METRIC_FIELDS),
  };
}

function normalizeInstagramDiagnosticRow(row: Record<string, unknown>) {
  return {
    date: getOptionalString(row, 'date'),
    datasource: getOptionalString(row, 'datasource'),
    accountId: getOptionalString(row, 'account_id'),
  };
}

function normalizeInstagramConnectorAccountCandidate(row: Record<string, unknown>) {
  return {
    datasource: getOptionalString(row, 'datasource'),
    accountId: getOptionalString(row, 'account_id'),
    accountName: getOptionalString(row, 'account_name'),
    userName: getOptionalString(row, 'user_name'),
    username: getOptionalString(row, 'username'),
  };
}

function extractUrlFromUnknownPayload(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (!isRecord(payload)) return null;

  const candidate =
    getOptionalString(payload, 'url') ??
    getOptionalString(payload, 'authorization_url') ??
    getOptionalString(payload, 'authorizationUrl') ??
    getOptionalString(payload, 'connect_url');

  return candidate;
}

function parseUnknownPayload(rawBody: string): unknown {
  if (!rawBody.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
}

function ensureWindsorUrl(rawUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl, WINDSOR_ONBOARD_BASE_URL);
  } catch {
    throw new Error('Windsor returned an invalid authorization URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Windsor returned a non-HTTPS authorization URL.');
  }

  if (!isTrustedWindsorAuthorizationUrl(parsed)) {
    throw new Error('Windsor returned an unexpected authorization host.');
  }

  return parsed;
}

export function isTrustedWindsorAuthorizationUrl(parsed: URL) {
  const isWindsorHostname =
    parsed.hostname === 'windsor.ai' || parsed.hostname.endsWith('.windsor.ai');

  return parsed.protocol === 'https:' && isWindsorHostname;
}

export async function createWindsorAuthorizationLink(
  allowedSource: string
): Promise<WindsorAuthorizationLink> {
  if (!WINDSOR_API_KEY) {
    throw new Error('WINDSOR_API_KEY is missing.');
  }

  const requestUrl = new URL('/api/team/generate-co-user-url/', WINDSOR_ONBOARD_BASE_URL);
  requestUrl.searchParams.set('allowed_sources', allowedSource);
  requestUrl.searchParams.set('api_key', WINDSOR_API_KEY);

  const response = await fetch(requestUrl, {
    redirect: 'manual',
    headers: {
      Accept: 'application/json, text/plain, text/html',
    },
  });

  const rawBody = await response.text().catch(() => '');
  const responsePayload = parseUnknownPayload(rawBody);

  if (response.status >= 400) {
    throw new Error(getErrorMessage(responsePayload, `Windsor request failed (${response.status}).`));
  }

  const redirectedUrl =
    response.headers.get('location') ??
    extractUrlFromUnknownPayload(responsePayload) ??
    (response.url && response.url !== requestUrl.toString() ? response.url : null);

  if (!redirectedUrl) {
    throw new Error('Windsor did not return a usable co-user authorization link.');
  }

  const authorizationUrl = ensureWindsorUrl(redirectedUrl);
  const accessToken = authorizationUrl.searchParams.get('access_token');

  if (!accessToken) {
    throw new Error('Windsor authorization link is missing its access token.');
  }

  return {
    authorizationUrl: authorizationUrl.toString(),
    accessToken,
  };
}

interface WindsorLinkedAccountsQueryParams {
  datasourceId?: string | null;
  accessToken?: string | null;
}

export interface WindsorLinkedAccountsDiagnostic {
  isArray: boolean;
  wrapperCount: number;
  accountItemCount: number;
  accountItemKeys: string[];
  itemCount: number;
  itemKeys: string[];
  datasources: string[];
  hasAccountId: boolean;
  hasAccessToken: boolean;
  statuses: string[];
}

export function normalizeWindsorLinkedAccountsPayload(payload: unknown): {
  rawAccountItems: Record<string, unknown>[];
  wrapperCount: number;
  isArray: boolean;
} {
  if (!Array.isArray(payload)) {
    return {
      rawAccountItems: [],
      wrapperCount: 0,
      isArray: false,
    };
  }

  const rawAccountItems: Record<string, unknown>[] = [];

  for (const item of payload) {
    if (!isRecord(item)) {
      continue;
    }

    if ('accounts' in item) {
      if (!Array.isArray(item.accounts)) {
        continue;
      }

      for (const accountItem of item.accounts) {
        if (isRecord(accountItem)) {
          rawAccountItems.push(accountItem);
        }
      }

      continue;
    }

    rawAccountItems.push(item);
  }

  return {
    rawAccountItems,
    wrapperCount: payload.length,
    isArray: true,
  };
}

function buildWindsorLinkedAccountsDiagnostic(params: {
  rawAccountItems: Record<string, unknown>[];
  wrapperCount: number;
  isArray: boolean;
}): WindsorLinkedAccountsDiagnostic {
  if (!params.isArray) {
    return {
      isArray: false,
      wrapperCount: 0,
      accountItemCount: 0,
      accountItemKeys: [],
      itemCount: 0,
      itemKeys: [],
      datasources: [],
      hasAccountId: false,
      hasAccessToken: false,
      statuses: [],
    };
  }

  const itemKeys = new Set<string>();
  const datasources = new Set<string>();
  const statuses = new Set<string>();
  let hasAccountId = false;
  let hasAccessToken = false;

  for (const item of params.rawAccountItems) {
    for (const key of Object.keys(item)) {
      itemKeys.add(key);
    }

    const datasource =
      getOptionalString(item, 'datasource') ??
      getOptionalString(item, 'ds_id') ??
      getOptionalString(item, 'source');

    if (datasource) {
      datasources.add(datasource);
    }

    if (typeof item.account_id === 'string' && item.account_id.trim()) {
      hasAccountId = true;
    }

    if (typeof item.access_token === 'string' && item.access_token.trim()) {
      hasAccessToken = true;
    }

    const status = getOptionalString(item, 'status');
    if (status) {
      statuses.add(status);
    }
  }

  return {
    isArray: true,
    wrapperCount: params.wrapperCount,
    accountItemCount: params.rawAccountItems.length,
    accountItemKeys: Array.from(itemKeys).sort(),
    itemCount: params.rawAccountItems.length,
    itemKeys: Array.from(itemKeys).sort(),
    datasources: Array.from(datasources).sort(),
    hasAccountId,
    hasAccessToken,
    statuses: Array.from(statuses).sort(),
  };
}

async function fetchWindsorLinkedAccounts(params: WindsorLinkedAccountsQueryParams): Promise<{
  accounts: WindsorLinkedAccount[];
  diagnostic: WindsorLinkedAccountsDiagnostic;
}> {
  const url = new URL('/api/team/co-user-linked-accounts/', WINDSOR_ONBOARD_BASE_URL);
  url.searchParams.set('api_key', WINDSOR_API_KEY);

  if (params.datasourceId) {
    url.searchParams.set('ds_id', params.datasourceId);
  }

  if (params.accessToken) {
    url.searchParams.set('access_token', params.accessToken);
  }

  const payload = await requestWindsor(url.pathname + url.search);
  const normalizedPayload = normalizeWindsorLinkedAccountsPayload(payload);
  const diagnostic = buildWindsorLinkedAccountsDiagnostic({
    rawAccountItems: normalizedPayload.rawAccountItems,
    wrapperCount: normalizedPayload.wrapperCount,
    isArray: normalizedPayload.isArray,
  });

  if (!Array.isArray(payload)) {
    throw new Error('Windsor returned an unexpected linked accounts payload.');
  }

  const accounts = normalizedPayload.rawAccountItems
    .map((item) => {
      const datasource =
        getOptionalString(item, 'datasource') ??
        getOptionalString(item, 'ds_id') ??
        getOptionalString(item, 'source');
      const accountId = getOptionalString(item, 'account_id');

      if (!datasource || !accountId) {
        return null;
      }

      const accountName =
        getOptionalString(item, 'account_name') ??
        getOptionalString(item, 'user_name') ??
        getOptionalString(item, 'name') ??
        getOptionalString(item, 'co_user_member_name');
      const accountHandle =
        getOptionalString(item, 'account_handle') ??
        getOptionalString(item, 'account_username') ??
        getOptionalString(item, 'username') ??
        getOptionalString(item, 'handle');
      const accountAvatarUrl =
        getOptionalString(item, 'account_avatar_url') ??
        getOptionalString(item, 'profile_picture_url') ??
        getOptionalString(item, 'avatar_url');
      const accessToken = getOptionalString(item, 'access_token');
      const status = getOptionalString(item, 'status');

      const metadata = Object.fromEntries(
        Object.entries(item).filter(([key]) =>
          [
            'datasource',
            'ds_id',
            'account_id',
            'account_name',
            'user_name',
            'name',
            'co_user_member_name',
            'account_handle',
            'account_username',
            'username',
            'handle',
            'account_avatar_url',
            'profile_picture_url',
            'avatar_url',
            'status',
          ].includes(key)
        )
      );

      return {
        datasource,
        accountId,
        accountName,
        accountHandle,
        accountAvatarUrl,
        accessToken,
        status,
        metadata,
      } satisfies WindsorLinkedAccount;
    })
    .filter((item): item is WindsorLinkedAccount => item !== null);

  return {
    accounts,
    diagnostic,
  };
}

export async function listWindsorLinkedAccounts(params: WindsorLinkedAccountsQueryParams): Promise<{
  accounts: WindsorLinkedAccount[];
  diagnostic: WindsorLinkedAccountsDiagnostic;
}> {
  return fetchWindsorLinkedAccounts(params);
}

export async function unlinkWindsorLinkedAccount(params: {
  datasourceId: string;
  accountId: string;
  accessToken?: string | null;
}) {
  const url = new URL('/api/team/co-user-linked-accounts/', WINDSOR_ONBOARD_BASE_URL);
  url.searchParams.set('api_key', WINDSOR_API_KEY);
  url.searchParams.set('ds_id', params.datasourceId);
  url.searchParams.set('account_id', params.accountId);

  if (params.accessToken) {
    url.searchParams.set('access_token', params.accessToken);
  }

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const error = new Error(getErrorMessage(payload, `Windsor unlink failed (${response.status}).`));
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return payload;
}

export async function fetchWindsorInstagramAccountMetrics(params: {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  fields?: string[];
}): Promise<WindsorInstagramAccountMetricsRow[]> {
  const fields = params.fields ?? WINDSOR_INSTAGRAM_ACCOUNT_METRIC_FIELDS;
  const requestUrl = new URL('/instagram', WINDSOR_CONNECTORS_BASE_URL);
  requestUrl.searchParams.set('api_key', WINDSOR_API_KEY);
  requestUrl.searchParams.set('fields', fields.join(','));

  if (params.dateFrom) {
    requestUrl.searchParams.set('date_from', params.dateFrom);
  }

  if (params.dateTo) {
    requestUrl.searchParams.set('date_to', params.dateTo);
  }

  requestUrl.searchParams.set('_renderer', 'json');
  requestUrl.searchParams.set('_max_rows', '100');

  if (params.accountId) {
    requestUrl.searchParams.set('filter', JSON.stringify([['account_id', 'eq', params.accountId]]));
  }

  const payload = await requestWindsorConnector(requestUrl.pathname + requestUrl.search);
  return getRowsFromConnectorPayload(payload).map(normalizeInstagramMetricsRow);
}

export async function fetchWindsorYoutubeChannelSnapshot(params: {
  accountId: string;
}): Promise<WindsorYoutubeChannelSnapshotRow[]> {
  const requestUrl = new URL('/youtube', WINDSOR_CONNECTORS_BASE_URL);
  requestUrl.searchParams.set('api_key', WINDSOR_API_KEY);
  requestUrl.searchParams.set('fields', WINDSOR_YOUTUBE_CHANNEL_SNAPSHOT_FIELDS.join(','));
  requestUrl.searchParams.set('_renderer', 'json');
  requestUrl.searchParams.set('_max_rows', '25');
  requestUrl.searchParams.set('filter', JSON.stringify([['account_id', 'eq', params.accountId]]));

  const payload = await requestWindsorConnector(requestUrl.pathname + requestUrl.search);
  return getRowsFromConnectorPayload(payload).map(normalizeWindsorYoutubeChannelSnapshotRow);
}

export async function fetchWindsorYoutubeDailyMetrics(params: {
  accountId: string;
  dateFrom: string;
  dateTo: string;
}): Promise<WindsorYoutubeDailyMetricsRow[]> {
  const requestUrl = new URL('/youtube', WINDSOR_CONNECTORS_BASE_URL);
  requestUrl.searchParams.set('api_key', WINDSOR_API_KEY);
  requestUrl.searchParams.set('fields', WINDSOR_YOUTUBE_DAILY_METRIC_FIELDS.join(','));
  requestUrl.searchParams.set('date_from', params.dateFrom);
  requestUrl.searchParams.set('date_to', params.dateTo);
  requestUrl.searchParams.set('_renderer', 'json');
  requestUrl.searchParams.set('_max_rows', '100');
  requestUrl.searchParams.set('filter', JSON.stringify([['account_id', 'eq', params.accountId]]));

  const payload = await requestWindsorConnector(requestUrl.pathname + requestUrl.search);
  return getRowsFromConnectorPayload(payload).map(normalizeWindsorYoutubeDailyMetricsRow);
}

export async function fetchWindsorInstagramConnectorAccountCandidates() {
  const requestUrl = new URL('/instagram', WINDSOR_CONNECTORS_BASE_URL);
  requestUrl.searchParams.set('api_key', WINDSOR_API_KEY);
  requestUrl.searchParams.set(
    'fields',
    ['datasource', 'account_id', 'account_name', 'user_name', 'username', 'followers_count'].join(',')
  );
  requestUrl.searchParams.set('_renderer', 'json');
  requestUrl.searchParams.set('_max_rows', '100');

  const payload = await requestWindsorConnector(requestUrl.pathname + requestUrl.search);
  return getRowsFromConnectorPayload(payload).map(normalizeInstagramConnectorAccountCandidate);
}

export async function fetchWindsorInstagramSnapshotDiagnosticRows() {
  const requestUrl = new URL('/instagram', WINDSOR_CONNECTORS_BASE_URL);
  requestUrl.searchParams.set('api_key', WINDSOR_API_KEY);
  requestUrl.searchParams.set(
    'fields',
    ['datasource', 'account_id', 'account_name', 'followers_count'].join(',')
  );
  requestUrl.searchParams.set('_renderer', 'json');
  requestUrl.searchParams.set('_max_rows', '100');

  const payload = await requestWindsorConnector(requestUrl.pathname + requestUrl.search);
  return getRowsFromConnectorPayload(payload).map(normalizeInstagramDiagnosticRow);
}

export async function fetchWindsorInstagramDailyDiagnosticRows() {
  const requestUrl = new URL('/instagram', WINDSOR_CONNECTORS_BASE_URL);
  requestUrl.searchParams.set('api_key', WINDSOR_API_KEY);
  requestUrl.searchParams.set(
    'fields',
    ['date', 'datasource', 'account_id', 'follower_count_1d', 'reach_1d'].join(',')
  );
  requestUrl.searchParams.set('date_preset', 'last_7d');
  requestUrl.searchParams.set('_renderer', 'json');
  requestUrl.searchParams.set('_max_rows', '100');

  const payload = await requestWindsorConnector(requestUrl.pathname + requestUrl.search);
  return getRowsFromConnectorPayload(payload).map(normalizeInstagramDiagnosticRow);
}

export function sanitizeLinkedAccount(account: WindsorLinkedAccount): SanitizedLinkedAccount {
  return {
    externalAccountId: account.accountId,
    accountName: account.accountName,
    accountHandle: account.accountHandle,
    accountAvatarUrl: account.accountAvatarUrl,
  };
}
