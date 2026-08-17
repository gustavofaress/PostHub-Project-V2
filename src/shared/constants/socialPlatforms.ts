import { Instagram, Linkedin, Music2, Youtube } from 'lucide-react';
import type { SocialPlatform } from '../../types/social-analytics';

export interface SocialPlatformDefinition {
  id: SocialPlatform;
  label: string;
  description: string;
  available: boolean;
  availabilityLabel: string;
  icon: typeof Instagram;
}

export const SOCIAL_PLATFORM_REGISTRY: Record<SocialPlatform, SocialPlatformDefinition> = {
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    description: 'Conecte sua conta do Instagram para acompanhar seus resultados dentro do PostHub.',
    available: true,
    availabilityLabel: 'Disponível',
    icon: Instagram,
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    description: 'Acompanhe vídeos, audiência e desempenho do canal.',
    available: false,
    availabilityLabel: 'Em breve',
    icon: Youtube,
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    description: 'Conecte sua conta para analisar seus vídeos e desempenho orgânico.',
    available: false,
    availabilityLabel: 'Em breve',
    icon: Music2,
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Acompanhe o desempenho dos conteúdos da sua página.',
    available: false,
    availabilityLabel: 'Em breve',
    icon: Linkedin,
  },
};

export const SOCIAL_PLATFORM_LIST = Object.values(SOCIAL_PLATFORM_REGISTRY);
