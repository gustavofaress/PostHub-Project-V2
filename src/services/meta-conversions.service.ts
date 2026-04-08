import { supabase } from '../shared/utils/supabase';

type MetaEventName = 'PageView' | 'InitiateCheckout' | 'CompleteRegistration' | 'Purchase';

interface MetaEventPayload {
  eventName: MetaEventName;
  eventId?: string;
  eventSourceUrl?: string;
  userData?: {
    em?: string;
    external_id?: string;
  };
  customData?: Record<string, unknown>;
}

interface MetaFbq {
  (command: 'track', eventName: string, customData?: Record<string, unknown>, options?: { eventID?: string }): void;
}

declare global {
  interface Window {
    fbq?: MetaFbq;
  }
}

const getSupabaseConfig = () => ({
  url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
});

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return undefined;

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : undefined;
};

const getFbc = () => {
  const fbc = getCookie('_fbc');
  if (fbc) return fbc;

  if (typeof window === 'undefined') return undefined;

  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
};

const createEventId = (eventName: MetaEventName) => {
  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${eventName}-${randomId}`;
};

const sendConversionsEvent = (payload: MetaEventPayload & { eventId: string }) => {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) return;

  const body = JSON.stringify({
    eventName: payload.eventName,
    eventId: payload.eventId,
    eventTime: Math.floor(Date.now() / 1000),
    eventSourceUrl: payload.eventSourceUrl,
    userData: {
      ...payload.userData,
      fbp: getCookie('_fbp'),
      fbc: getFbc(),
    },
    customData: payload.customData,
  });

  void fetch(`${url}/functions/v1/meta-conversions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body,
    keepalive: true,
  }).catch((error) => {
    console.error('[meta-conversions] failed to send event:', error);
  });
};

export const trackMetaEvent = (payload: MetaEventPayload) => {
  if (typeof window === 'undefined') return payload.eventId ?? '';

  const eventId = payload.eventId ?? createEventId(payload.eventName);
  const eventSourceUrl = payload.eventSourceUrl ?? window.location.href;
  const customData = payload.customData ?? {};

  window.fbq?.('track', payload.eventName, customData, { eventID: eventId });

  if (supabase) {
    sendConversionsEvent({
      ...payload,
      eventId,
      eventSourceUrl,
      customData,
    });
  }

  return eventId;
};
