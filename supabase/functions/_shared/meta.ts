import { createClient } from 'npm:@supabase/supabase-js@2';

export interface MetaOAuthStatePayload {
  userId: string;
  profileId: string;
  redirectTo?: string;
  exp: number;
}

export interface InstagramConnectionRecord {
  id: string;
  user_id: string;
  profile_id: string;
  page_id: string;
  instagram_user_id: string;
  username: string | null;
  profile_picture_url: string | null;
  access_token: string;
  token_expires_at: string | null;
}

interface GraphApiErrorShape {
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const META_API_VERSION = Deno.env.get('META_API_VERSION') ?? 'v18.0';
export const META_APP_ID = Deno.env.get('META_APP_ID') ?? '';
export const META_APP_SECRET = Deno.env.get('META_APP_SECRET') ?? '';
export const META_APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:3000';
export const META_STATE_SECRET = Deno.env.get('META_STATE_SECRET') ?? '';
export const META_TOKEN_SECRET = Deno.env.get('META_TOKEN_ENCRYPTION_KEY') ?? '';
export const META_SYNC_SECRET = Deno.env.get('META_SYNC_SECRET') ?? '';
export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
export const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
export const META_SCOPES =
  Deno.env.get('META_OAUTH_SCOPES') ??
  'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement';

export const corsJsonHeaders = {
  'Content-Type': 'application/json',
};

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64Url(bytes: Uint8Array) {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return fromBase64(padded);
}

function encodeJsonBase64Url(value: unknown) {
  return toBase64Url(textEncoder.encode(JSON.stringify(value)));
}

function decodeJsonBase64Url<T>(value: string): T {
  return JSON.parse(textDecoder.decode(fromBase64Url(value))) as T;
}

async function sha256Bytes(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return new Uint8Array(digest);
}

async function hmacSign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(value));
  return new Uint8Array(signature);
}

function constantTimeEquals(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a[i] ^ b[i];
  }

  return mismatch === 0;
}

async function getAesKey(secret: string) {
  const hash = await sha256Bytes(secret);
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export function createUserClient(authHeader: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export function getMetaRedirectUri() {
  return Deno.env.get('META_REDIRECT_URI') ?? `${SUPABASE_URL}/functions/v1/meta-callback`;
}

export function getFrontendPerformanceUrl(params?: Record<string, string | null | undefined>) {
  const url = new URL('/workspace/performance', META_APP_URL);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

export async function requireAuthenticatedUser(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are missing.');
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing Authorization header.');
  }

  const userClient = createUserClient(authHeader);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new Error('Authenticated user not found.');
  }

  return {
    authHeader,
    user,
    userClient,
    adminClient: createAdminClient(),
  };
}

export async function assertProfileAccess(
  adminClient: ReturnType<typeof createAdminClient>,
  params: { userId: string; profileId: string }
) {
  const { userId, profileId } = params;

  const { data: ownProfile, error: ownProfileError } = await adminClient
    .from('client_profiles')
    .select('id')
    .eq('id', profileId)
    .eq('user_id', userId)
    .maybeSingle();

  if (ownProfileError) {
    throw ownProfileError;
  }

  if (ownProfile) return;

  const { data: membership, error: membershipError } = await adminClient
    .from('workspace_members')
    .select('id')
    .eq('profile_id', profileId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    throw new Error('Você não tem acesso a este perfil.');
  }
}

export async function signOAuthState(payload: Omit<MetaOAuthStatePayload, 'exp'> & { exp?: number }) {
  if (!META_STATE_SECRET) {
    throw new Error('META_STATE_SECRET is missing.');
  }

  const signedPayload: MetaOAuthStatePayload = {
    ...payload,
    exp: payload.exp ?? Date.now() + 15 * 60 * 1000,
  };

  const payloadEncoded = encodeJsonBase64Url(signedPayload);
  const signature = await hmacSign(payloadEncoded, META_STATE_SECRET);
  return `${payloadEncoded}.${toBase64Url(signature)}`;
}

export async function verifyOAuthState(state: string) {
  if (!META_STATE_SECRET) {
    throw new Error('META_STATE_SECRET is missing.');
  }

  const [payloadEncoded, signatureEncoded] = state.split('.');
  if (!payloadEncoded || !signatureEncoded) {
    throw new Error('Invalid OAuth state.');
  }

  const expected = await hmacSign(payloadEncoded, META_STATE_SECRET);
  const received = fromBase64Url(signatureEncoded);

  if (!constantTimeEquals(expected, received)) {
    throw new Error('Invalid OAuth state signature.');
  }

  const payload = decodeJsonBase64Url<MetaOAuthStatePayload>(payloadEncoded);

  if (payload.exp < Date.now()) {
    throw new Error('OAuth state has expired.');
  }

  return payload;
}

export async function encryptSecret(plainText: string) {
  if (!META_TOKEN_SECRET) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY is missing.');
  }

  const key = await getAesKey(META_TOKEN_SECRET);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plainText)
  );

  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipherBuffer))}`;
}

export async function decryptSecret(cipherText: string) {
  if (!META_TOKEN_SECRET) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY is missing.');
  }

  const [ivEncoded, payloadEncoded] = cipherText.split('.');
  if (!ivEncoded || !payloadEncoded) {
    throw new Error('Invalid encrypted token payload.');
  }

  const key = await getAesKey(META_TOKEN_SECRET);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64Url(ivEncoded) },
    key,
    fromBase64Url(payloadEncoded)
  );

  return textDecoder.decode(plainBuffer);
}

export async function graphRequest<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
  options?: RequestInit
) {
  const url = path.startsWith('http')
    ? new URL(path)
    : new URL(`https://graph.facebook.com/${META_API_VERSION}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, options);
  const json = (await response.json()) as T & GraphApiErrorShape;

  if (!response.ok || json.error) {
    const message = json.error?.message || `Meta Graph API request failed (${response.status}).`;
    throw new Error(message);
  }

  return json as T;
}

export async function safeGraphRequest<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
  options?: RequestInit
) {
  try {
    return await graphRequest<T>(path, params, options);
  } catch (error) {
    console.error('[meta] safeGraphRequest failed:', path, error);
    return null;
  }
}

export async function exchangeCodeForAccessToken(code: string) {
  return graphRequest<{ access_token: string; token_type: string; expires_in?: number }>(
    '/oauth/access_token',
    {
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      redirect_uri: getMetaRedirectUri(),
      code,
    }
  );
}

export async function exchangeForLongLivedToken(shortLivedToken: string) {
  return safeGraphRequest<{ access_token: string; token_type: string; expires_in?: number }>(
    '/oauth/access_token',
    {
      grant_type: 'fb_exchange_token',
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      fb_exchange_token: shortLivedToken,
    }
  );
}

export async function fetchUserPages(userAccessToken: string) {
  return graphRequest<{
    data: Array<{
      id: string;
      name?: string;
      access_token?: string;
    }>;
  }>('/me/accounts', {
    access_token: userAccessToken,
  });
}

export async function fetchInstagramAccountFromPage(pageId: string, accessToken: string) {
  return safeGraphRequest<{
    instagram_business_account?: {
      id: string;
    } | null;
  }>(`/${pageId}`, {
    fields: 'instagram_business_account',
    access_token: accessToken,
  });
}

export async function fetchInstagramUserProfile(igUserId: string, accessToken: string) {
  return safeGraphRequest<{
    id: string;
    name?: string;
    username?: string;
    profile_picture_url?: string;
    followers_count?: number;
  }>(`/${igUserId}`, {
    fields: 'id,name,username,profile_picture_url,followers_count',
    access_token: accessToken,
  });
}

function buildMetricMap(
  metrics: Array<{ name: string; values?: Array<{ value?: number | string | null; end_time?: string | null }> }> | null
) {
  const rows = new Map<string, Record<string, number>>();

  for (const metric of metrics ?? []) {
    for (const value of metric.values ?? []) {
      const endTime = value.end_time ? new Date(value.end_time) : new Date();
      const date = endTime.toISOString().slice(0, 10);

      const current = rows.get(date) ?? {};
      const numericValue =
        typeof value.value === 'number'
          ? value.value
          : typeof value.value === 'string'
          ? Number(value.value)
          : 0;

      current[metric.name] = Number.isFinite(numericValue) ? numericValue : 0;
      rows.set(date, current);
    }
  }

  return rows;
}

export async function syncInstagramConnection(
  adminClient: ReturnType<typeof createAdminClient>,
  connection: InstagramConnectionRecord
) {
  const accessToken = await decryptSecret(connection.access_token);
  const profile = await fetchInstagramUserProfile(connection.instagram_user_id, accessToken);

  const today = new Date();
  const since = new Date(today);
  since.setDate(today.getDate() - 29);

  const accountInsights = await safeGraphRequest<{
    data: Array<{ name: string; values?: Array<{ value?: number | string | null; end_time?: string | null }> }>;
  }>(`/${connection.instagram_user_id}/insights`, {
    metric: 'impressions,reach,profile_views,follower_count',
    period: 'day',
    since: Math.floor(since.getTime() / 1000),
    until: Math.floor(today.getTime() / 1000),
    access_token: accessToken,
  });

  const mediaResponse = await safeGraphRequest<{
    data: Array<{
      id: string;
      caption?: string;
      permalink?: string;
      timestamp?: string;
      like_count?: number;
      comments_count?: number;
    }>;
  }>(`/${connection.instagram_user_id}/media`, {
    fields: 'id,caption,permalink,timestamp,like_count,comments_count',
    limit: 25,
    access_token: accessToken,
  });

  const accountMetricMap = buildMetricMap(accountInsights?.data ?? null);
  const accountRows = Array.from(accountMetricMap.entries()).map(([date, metrics]) => ({
    metric_external_id: `account:${connection.instagram_user_id}:${date}`,
    metric_scope: 'account',
    user_id: connection.user_id,
    customer_id: connection.user_id,
    profile_id: connection.profile_id,
    page_id: connection.page_id,
    instagram_user_id: connection.instagram_user_id,
    media_id: null,
    date,
    data: date,
    likes: 0,
    comments: 0,
    total_interactions: 0,
    accounts_engaged: 0,
    saves: 0,
    shares: 0,
    follows: 0,
    unfollows: 0,
    profile_link_taps: 0,
    website_clicks: 0,
    profile_views: metrics.profile_views ?? 0,
    impressions: metrics.impressions ?? 0,
    reach: metrics.reach ?? 0,
    impressoes: metrics.impressions ?? 0,
    alcance: metrics.reach ?? 0,
    seguidores: metrics.follower_count ?? profile?.followers_count ?? 0,
    caption: null,
    permalink: null,
  }));

  const mediaRows = await Promise.all(
    (mediaResponse?.data ?? []).map(async (media) => {
      const mediaInsights = await safeGraphRequest<{
        data: Array<{ name: string; values?: Array<{ value?: number | string | null }> }>;
      }>(`/${media.id}/insights`, {
        metric: 'impressions,reach,saved,shares',
        access_token: accessToken,
      });

      const mediaMetrics = Object.fromEntries(
        (mediaInsights?.data ?? []).map((item) => {
          const value = item.values?.[0]?.value;
          const numericValue =
            typeof value === 'number'
              ? value
              : typeof value === 'string'
              ? Number(value)
              : 0;

          return [item.name, Number.isFinite(numericValue) ? numericValue : 0];
        })
      );

      const date = (media.timestamp ? new Date(media.timestamp) : new Date()).toISOString().slice(0, 10);
      const likes = media.like_count ?? 0;
      const comments = media.comments_count ?? 0;
      const saves = Number(mediaMetrics.saved ?? 0);
      const shares = Number(mediaMetrics.shares ?? 0);

      return {
        metric_external_id: `media:${media.id}`,
        metric_scope: 'media',
        user_id: connection.user_id,
        customer_id: connection.user_id,
        profile_id: connection.profile_id,
        page_id: connection.page_id,
        instagram_user_id: connection.instagram_user_id,
        media_id: media.id,
        date,
        data: date,
        likes,
        comments,
        total_interactions: likes + comments + saves + shares,
        accounts_engaged: 0,
        saves,
        shares,
        follows: 0,
        unfollows: 0,
        profile_link_taps: 0,
        website_clicks: 0,
        profile_views: 0,
        impressions: Number(mediaMetrics.impressions ?? 0),
        reach: Number(mediaMetrics.reach ?? 0),
        impressoes: Number(mediaMetrics.impressions ?? 0),
        alcance: Number(mediaMetrics.reach ?? 0),
        seguidores: profile?.followers_count ?? 0,
        caption: media.caption ?? null,
        permalink: media.permalink ?? null,
      };
    })
  );

  const allRows = [...accountRows, ...mediaRows];

  if (allRows.length > 0) {
    const { error } = await adminClient.from('instagram_metrics').upsert(allRows, {
      onConflict: 'metric_external_id',
    });

    if (error) {
      throw error;
    }
  }

  const { error: connectionError } = await adminClient
    .from('contas_instagram')
    .update({
      username: profile?.username ?? connection.username,
      profile_picture_url: profile?.profile_picture_url ?? connection.profile_picture_url,
      last_synced_at: new Date().toISOString(),
      last_sync_status: 'success',
      last_sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id);

  if (connectionError) {
    throw connectionError;
  }

  return {
    accountRows: accountRows.length,
    mediaRows: mediaRows.length,
  };
}
