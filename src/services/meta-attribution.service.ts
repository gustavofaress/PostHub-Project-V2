export interface MetaAttributionSnapshot {
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

const STORAGE_KEY = 'posthub_meta_attribution';
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

const safeTrim = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const getCookie = (name: string) => {
  if (!isBrowser()) return undefined;

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : undefined;
};

const getCookieDomain = () => {
  if (!isBrowser()) return undefined;

  const hostname = window.location.hostname.toLowerCase();

  if (hostname === 'posthub.com.br' || hostname.endsWith('.posthub.com.br')) {
    return '.posthub.com.br';
  }

  return undefined;
};

const setCookie = (name: string, value?: string) => {
  if (!isBrowser() || !value) return;

  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'path=/',
    `max-age=${COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
  ];

  const domain = getCookieDomain();
  if (domain) {
    parts.push(`domain=${domain}`);
  }

  if (window.location.protocol === 'https:') {
    parts.push('Secure');
  }

  document.cookie = parts.join('; ');
};

const buildFbc = (fbclid: string) => `fb.1.${Date.now()}.${fbclid}`;

const extractFbclidFromFbc = (fbc?: string) => {
  if (!fbc) return undefined;

  const parts = fbc.split('.');
  if (parts.length < 4) return undefined;

  return safeTrim(parts.slice(3).join('.'));
};

const readStorage = (): MetaAttributionSnapshot => {
  if (!isBrowser()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    return JSON.parse(raw) as MetaAttributionSnapshot;
  } catch (error) {
    console.error('[meta-attribution] failed to read storage:', error);
    return {};
  }
};

const writeStorage = (snapshot: MetaAttributionSnapshot) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error('[meta-attribution] failed to persist storage:', error);
  }
};

const mergeSnapshots = (...snapshots: Array<MetaAttributionSnapshot | undefined>) => {
  return snapshots.reduce<MetaAttributionSnapshot>((result, snapshot) => {
    if (!snapshot) return result;

    Object.entries(snapshot).forEach(([key, value]) => {
      if (value) {
        (result as Record<string, string>)[key] = value;
      }
    });

    return result;
  }, {});
};

const readCookieSnapshot = (): MetaAttributionSnapshot => {
  const fbp = safeTrim(getCookie('_fbp'));
  const fbc = safeTrim(getCookie('_fbc'));

  return {
    fbp,
    fbc,
    fbclid: extractFbclidFromFbc(fbc),
  };
};

const readQuerySnapshot = (): MetaAttributionSnapshot => {
  if (!isBrowser()) return {};

  const searchParams = new URLSearchParams(window.location.search);
  const fbclid = safeTrim(searchParams.get('fbclid'));
  const fbc = safeTrim(searchParams.get('fbc') ?? searchParams.get('_fbc'));

  return {
    fbclid,
    fbc,
    fbp: safeTrim(searchParams.get('fbp') ?? searchParams.get('_fbp')),
    utmSource: safeTrim(searchParams.get('utm_source')),
    utmMedium: safeTrim(searchParams.get('utm_medium')),
    utmCampaign: safeTrim(searchParams.get('utm_campaign')),
    utmContent: safeTrim(searchParams.get('utm_content')),
    utmTerm: safeTrim(searchParams.get('utm_term')),
  };
};

const persistSnapshot = (snapshot: MetaAttributionSnapshot) => {
  const nextSnapshot = mergeSnapshots(readStorage(), readCookieSnapshot(), snapshot);

  if (nextSnapshot.fbclid && !nextSnapshot.fbc) {
    nextSnapshot.fbc = buildFbc(nextSnapshot.fbclid);
  }

  writeStorage(nextSnapshot);
  setCookie('_fbp', nextSnapshot.fbp);
  setCookie('_fbc', nextSnapshot.fbc);

  return nextSnapshot;
};

export const metaAttributionService = {
  captureFromCurrentLocation() {
    if (!isBrowser()) return {};

    return persistSnapshot(readQuerySnapshot());
  },

  getSnapshot() {
    if (!isBrowser()) return {};

    return mergeSnapshots(readStorage(), readCookieSnapshot());
  },
};
