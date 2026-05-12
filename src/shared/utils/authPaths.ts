import { affiliateAttributionService } from '../../services/affiliate-attribution.service';

export type ProductContext = 'metric-hub';

export const METRIC_HUB_APP_PATH = '/metric-hub/app';

export const normalizeInternalRedirectPath = (value?: string | null) => {
  const normalized = value?.trim();

  if (!normalized || !normalized.startsWith('/') || normalized.startsWith('//')) {
    return null;
  }

  return normalized;
};

export const normalizeProductContext = (value?: string | null): ProductContext | null => {
  return value === 'metric-hub' ? value : null;
};

interface BuildAuthPathOptions {
  redirectTo?: string | null;
  product?: string | null;
  affiliateCode?: string | null;
}

export const buildAuthPath = (path: string, options?: BuildAuthPathOptions) => {
  const basePath = affiliateAttributionService.buildPath(path, options?.affiliateCode);
  const redirectTo = normalizeInternalRedirectPath(options?.redirectTo);
  const product = normalizeProductContext(options?.product);

  try {
    const url = new URL(basePath, 'https://www.posthub.com.br');

    if (redirectTo) {
      url.searchParams.set('redirect', redirectTo);
    }

    if (product) {
      url.searchParams.set('product', product);
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return basePath;
  }
};
