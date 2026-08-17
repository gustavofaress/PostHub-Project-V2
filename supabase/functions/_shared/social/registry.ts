import type { SocialPlatform, SocialPlatformConfig } from './types.ts';

const SOCIAL_PLATFORM_REGISTRY: Record<SocialPlatform, SocialPlatformConfig> = {
  instagram: {
    provider: 'windsor',
    platform: 'instagram',
    windsorConnector: 'instagram',
    windsorDatasource: 'instagram',
    available: true,
  },
  youtube: {
    provider: 'windsor',
    platform: 'youtube',
    windsorConnector: 'youtube',
    windsorDatasource: 'youtube',
    available: false,
  },
  tiktok: {
    provider: 'windsor',
    platform: 'tiktok',
    windsorConnector: 'tiktok',
    windsorDatasource: 'tiktok',
    available: false,
  },
  linkedin: {
    provider: 'windsor',
    platform: 'linkedin',
    windsorConnector: 'linkedin',
    windsorDatasource: 'linkedin',
    available: false,
  },
};

export function isSocialPlatform(value: string): value is SocialPlatform {
  return value in SOCIAL_PLATFORM_REGISTRY;
}

export function getSocialPlatformConfig(platform: string): SocialPlatformConfig | null {
  return isSocialPlatform(platform) ? SOCIAL_PLATFORM_REGISTRY[platform] : null;
}
