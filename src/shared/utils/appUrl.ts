const DEFAULT_APP_URL = 'https://www.posthub.com.br';
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

const normalizeOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return DEFAULT_APP_URL;
  }
};

export const getAppBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_APP_URL?.trim();

  if (configuredUrl) {
    return normalizeOrigin(configuredUrl);
  }

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;

    if (LOCALHOST_HOSTNAMES.has(hostname)) {
      return origin;
    }
  }

  return DEFAULT_APP_URL;
};

export const buildAppUrl = (path = '/') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, `${getAppBaseUrl()}/`).toString();
};
