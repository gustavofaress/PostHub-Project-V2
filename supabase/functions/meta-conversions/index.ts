import { corsHeaders } from '../_shared/cors.ts';
import { META_API_VERSION, corsJsonHeaders } from '../_shared/meta.ts';

type MetaEventName =
  | 'PageView'
  | 'Lead'
  | 'StartTrial'
  | 'InitiateCheckout'
  | 'CompleteRegistration'
  | 'Purchase';

interface MetaConversionsPayload {
  eventName?: MetaEventName;
  eventId?: string;
  eventTime?: number;
  eventSourceUrl?: string;
  actionSource?: 'website';
  userData?: {
    fbp?: string;
    fbc?: string;
    em?: string;
    external_id?: string;
  };
  customData?: Record<string, unknown>;
}

interface MetaConversionsResponse {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

const META_PIXEL_ID = Deno.env.get('META_PIXEL_ID') ?? '991022887210539';
const META_CONVERSIONS_ACCESS_TOKEN = Deno.env.get('META_CONVERSIONS_ACCESS_TOKEN') ?? '';
const META_TEST_EVENT_CODE = Deno.env.get('META_TEST_EVENT_CODE') ?? '';

const allowedEvents: MetaEventName[] = [
  'PageView',
  'Lead',
  'StartTrial',
  'InitiateCheckout',
  'CompleteRegistration',
  'Purchase',
];

const textEncoder = new TextEncoder();

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...corsJsonHeaders,
    },
  });

const isAllowedEventName = (eventName?: string): eventName is MetaEventName =>
  Boolean(eventName && allowedEvents.includes(eventName as MetaEventName));

const normalizeHashInput = (value: string) => value.trim().toLowerCase();

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(normalizeHashInput(value)));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const hashUserData = async (userData: MetaConversionsPayload['userData'] = {}) => {
  const hashedUserData: Record<string, string> = {};

  if (userData.fbp) hashedUserData.fbp = userData.fbp;
  if (userData.fbc) hashedUserData.fbc = userData.fbc;
  if (userData.em) hashedUserData.em = await sha256Hex(userData.em);
  if (userData.external_id) hashedUserData.external_id = await sha256Hex(userData.external_id);

  return hashedUserData;
};

const getClientIpAddress = (request: Request) =>
  request.headers.get('cf-connecting-ip') ??
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
  request.headers.get('x-real-ip') ??
  undefined;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed.' }, 405);
    }

    if (!META_PIXEL_ID || !META_CONVERSIONS_ACCESS_TOKEN) {
      throw new Error('Meta Conversions API environment variables are missing.');
    }

    const payload = (await request.json().catch(() => ({}))) as MetaConversionsPayload;

    if (!isAllowedEventName(payload.eventName)) {
      return jsonResponse({ error: 'Invalid or unsupported Meta event name.' }, 400);
    }

    const eventId = payload.eventId?.trim();
    const eventSourceUrl = payload.eventSourceUrl?.trim();

    if (!eventId || !eventSourceUrl) {
      return jsonResponse({ error: 'eventId and eventSourceUrl are required.' }, 400);
    }

    const userData = await hashUserData(payload.userData);
    const clientIpAddress = getClientIpAddress(request);
    const clientUserAgent = request.headers.get('user-agent') ?? undefined;

    if (clientIpAddress) userData.client_ip_address = clientIpAddress;
    if (clientUserAgent) userData.client_user_agent = clientUserAgent;

    const event = {
      event_name: payload.eventName,
      event_time: payload.eventTime ?? Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: eventSourceUrl,
      action_source: payload.actionSource ?? 'website',
      user_data: userData,
      custom_data: payload.customData ?? {},
    };

    const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`);
    url.searchParams.set('access_token', META_CONVERSIONS_ACCESS_TOKEN);

    const body: Record<string, unknown> = {
      data: [event],
    };

    if (META_TEST_EVENT_CODE) {
      body.test_event_code = META_TEST_EVENT_CODE;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as MetaConversionsResponse;

    if (!response.ok || json.error) {
      const message = json.error?.message ?? `Meta Conversions API request failed (${response.status}).`;
      throw new Error(message);
    }

    return jsonResponse({
      received: true,
      eventId,
      meta: json,
    });
  } catch (error) {
    console.error('[meta-conversions] error:', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    );
  }
});
