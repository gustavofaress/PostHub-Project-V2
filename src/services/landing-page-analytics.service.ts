import { supabase } from '../shared/utils/supabase';

export interface LandingPageVisitPayload {
  visitId: string;
  landingPath: string;
  pageVariant: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  fbclid?: string | null;
}

export interface LandingPageVideoProgressPayload {
  visitId: string;
  videoPercent: number;
  videoSeconds: number;
  videoDurationSeconds?: number | null;
  landingPath: string;
  pageVariant: string;
}

const safeTrim = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const buildFallbackId = () => `lp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createVisitId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return buildFallbackId();
};

const logLandingAnalyticsError = (scope: string, error: unknown) => {
  console.error(`[landing-page-analytics] failed to ${scope}:`, error);
};

export const landingPageAnalyticsService = {
  createVisitId() {
    return createVisitId();
  },

  buildVisitPayload(landingPath: string, pageVariant: string): LandingPageVisitPayload {
    if (typeof window === 'undefined') {
      return {
        visitId: buildFallbackId(),
        landingPath,
        pageVariant,
      };
    }

    const searchParams = new URLSearchParams(window.location.search);

    return {
      visitId: createVisitId(),
      landingPath,
      pageVariant,
      referrer: safeTrim(document.referrer),
      utmSource: safeTrim(searchParams.get('utm_source')),
      utmMedium: safeTrim(searchParams.get('utm_medium')),
      utmCampaign: safeTrim(searchParams.get('utm_campaign')),
      utmContent: safeTrim(searchParams.get('utm_content')),
      utmTerm: safeTrim(searchParams.get('utm_term')),
      fbclid: safeTrim(searchParams.get('fbclid')),
    };
  },

  async recordVisit(payload: LandingPageVisitPayload) {
    if (!supabase) return;

    const { error } = await supabase.rpc('record_landing_page_visit', {
      p_visit_id: payload.visitId,
      p_landing_path: payload.landingPath,
      p_page_variant: payload.pageVariant,
      p_referrer: payload.referrer ?? null,
      p_utm_source: payload.utmSource ?? null,
      p_utm_medium: payload.utmMedium ?? null,
      p_utm_campaign: payload.utmCampaign ?? null,
      p_utm_content: payload.utmContent ?? null,
      p_utm_term: payload.utmTerm ?? null,
      p_fbclid: payload.fbclid ?? null,
    });

    if (error) {
      logLandingAnalyticsError('record visit', error);
    }
  },

  async recordVideoProgress(payload: LandingPageVideoProgressPayload) {
    if (!supabase) return;

    const { error } = await supabase.rpc('record_landing_page_video_progress', {
      p_visit_id: payload.visitId,
      p_video_percent: clamp(payload.videoPercent, 0, 100),
      p_video_seconds: Math.max(payload.videoSeconds, 0),
      p_video_duration_seconds:
        typeof payload.videoDurationSeconds === 'number' && payload.videoDurationSeconds > 0
          ? payload.videoDurationSeconds
          : null,
      p_landing_path: payload.landingPath,
      p_page_variant: payload.pageVariant,
    });

    if (error) {
      logLandingAnalyticsError('record video progress', error);
    }
  },
};
