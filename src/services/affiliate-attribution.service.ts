import { supabase } from '../shared/utils/supabase';

export interface AffiliateAttributionSnapshot {
  affiliateCode?: string;
  capturedAt?: string;
}

export interface ApplyAffiliateAttributionResult {
  applied: boolean;
  locked: boolean;
  reason: string;
  affiliateUserId: string | null;
  affiliateCode: string | null;
}

const STORAGE_KEY = 'posthub_affiliate_attribution';

const isBrowser = () => typeof window !== 'undefined';

const readStorage = (): AffiliateAttributionSnapshot => {
  if (!isBrowser()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AffiliateAttributionSnapshot;
  } catch (error) {
    console.error('[affiliate-attribution] failed to read storage:', error);
    return {};
  }
};

const writeStorage = (snapshot: AffiliateAttributionSnapshot) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error('[affiliate-attribution] failed to persist storage:', error);
  }
};

const buildPathWithAffiliateCode = (path: string, affiliateCode?: string) => {
  const normalizedCode = normalizeAffiliateCode(affiliateCode);
  if (!normalizedCode) return path;

  try {
    const url = new URL(path, 'https://www.posthub.com.br');
    url.searchParams.set('ref', normalizedCode);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return path;
  }
};

export const normalizeAffiliateCode = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '');
  return normalized ? normalized : undefined;
};

const readQueryAffiliateCode = () => {
  if (!isBrowser()) return undefined;

  const searchParams = new URLSearchParams(window.location.search);
  return normalizeAffiliateCode(
    searchParams.get('ref') ?? searchParams.get('affiliate') ?? searchParams.get('partner')
  );
};

export const affiliateAttributionService = {
  captureFromCurrentLocation() {
    const affiliateCode = readQueryAffiliateCode();

    if (!affiliateCode) {
      return this.getSnapshot();
    }

    const snapshot: AffiliateAttributionSnapshot = {
      affiliateCode,
      capturedAt: new Date().toISOString(),
    };

    writeStorage(snapshot);
    return snapshot;
  },

  rememberAffiliateCode(affiliateCode?: string | null) {
    const normalizedCode = normalizeAffiliateCode(affiliateCode);
    if (!normalizedCode) return this.getSnapshot();

    const snapshot: AffiliateAttributionSnapshot = {
      affiliateCode: normalizedCode,
      capturedAt: new Date().toISOString(),
    };

    writeStorage(snapshot);
    return snapshot;
  },

  getSnapshot() {
    const snapshot = readStorage();
    const affiliateCode = normalizeAffiliateCode(snapshot.affiliateCode);

    if (!affiliateCode) return {};

    return {
      affiliateCode,
      capturedAt: snapshot.capturedAt,
    };
  },

  clear() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(STORAGE_KEY);
  },

  buildPath(path: string, affiliateCode?: string | null) {
    const normalizedCode =
      normalizeAffiliateCode(affiliateCode) ?? normalizeAffiliateCode(this.getSnapshot().affiliateCode);

    return buildPathWithAffiliateCode(path, normalizedCode);
  },

  buildReferralPath(affiliateCode?: string | null) {
    const normalizedCode = normalizeAffiliateCode(affiliateCode);
    return normalizedCode ? `/r/${normalizedCode}` : '/signup';
  },

  async applyToCurrentUser(affiliateCode?: string | null): Promise<ApplyAffiliateAttributionResult | null> {
    if (!supabase) {
      return null;
    }

    const normalizedCode = normalizeAffiliateCode(affiliateCode ?? this.getSnapshot().affiliateCode);
    if (!normalizedCode) {
      return null;
    }

    const { data, error } = await supabase.rpc('apply_affiliate_referral', {
      p_affiliate_code: normalizedCode,
    });

    if (error) {
      throw error;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      return null;
    }

    return {
      applied: !!result.applied,
      locked: !!result.locked,
      reason: `${result.reason || 'unknown'}`,
      affiliateUserId: result.affiliate_user_id ?? null,
      affiliateCode: result.affiliate_code ?? null,
    };
  },
};
