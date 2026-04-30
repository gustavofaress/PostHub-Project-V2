import * as React from 'react';
import {
  ArrowLeft,
  Bookmark,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Plus,
  Share,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Avatar } from '../../shared/components/Avatar';
import { cn } from '../../shared/utils/cn';
import type { ApprovalPost } from './approval.types';

interface ApprovalContentMockupProps {
  post: ApprovalPost;
  profileName?: string | null;
  profileAvatarUrl?: string | null;
}

export interface ApprovalMockupProfile {
  name: string;
  avatarUrl?: string;
  handle: string;
  audioLabel: string;
}

const FALLBACK_PROFILE_NAME = 'Perfil';

const normalizeProfileName = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed || FALLBACK_PROFILE_NAME;
};

const buildProfileHandle = (profileName: string) => {
  const sanitizedHandle = profileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `@${sanitizedHandle || 'perfil'}`;
};

export const getApprovalMockupProfile = (
  post: ApprovalPost,
  options?: {
    profileName?: string | null;
    profileAvatarUrl?: string | null;
  }
): ApprovalMockupProfile => {
  const name = normalizeProfileName(options?.profileName ?? post.profileName);

  return {
    name,
    avatarUrl: options?.profileAvatarUrl ?? post.profileAvatarUrl ?? undefined,
    handle: buildProfileHandle(name),
    audioLabel: `Áudio original - ${name}`,
  };
};

export const ApprovalContentMockup: React.FC<ApprovalContentMockupProps> = ({
  post,
  profileName,
  profileAvatarUrl,
}) => {
  const displayProfile = getApprovalMockupProfile(post, {
    profileName,
    profileAvatarUrl,
  });

  const [carouselIndex, setCarouselIndex] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(true);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    setCarouselIndex(0);
    setIsMuted(true);
  }, [post.id]);

  React.useEffect(() => {
    setIsMuted(true);
  }, [carouselIndex]);

  const getMediaItem = () => {
    if (post.contentType === 'carousel' && post.mediaItems && post.mediaItems.length > 0) {
      return post.mediaItems[carouselIndex];
    }

    if (post.mediaItems && post.mediaItems.length > 0) {
      return post.mediaItems[0];
    }

    return null;
  };

  const mediaItem = getMediaItem();
  const url = mediaItem?.previewUrl || mediaItem?.persistedPreview || post.thumbnail || '';
  const isVideo = mediaItem?.type === 'video' && !!mediaItem?.previewUrl && !url.includes('picsum.photos');
  const isLostVideo = mediaItem?.type === 'video' && !mediaItem?.previewUrl;
  const hasVideoAudioToggle = isVideo && !!url;

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, url]);

  const renderAudioToggle = (className?: string) => {
    if (!hasVideoAudioToggle) return null;

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsMuted((previous) => {
            const nextMuted = !previous;
            const currentVideo = videoRef.current;

            if (currentVideo) {
              currentVideo.muted = nextMuted;

              if (!nextMuted && currentVideo.paused) {
                void currentVideo.play().catch(() => {});
              }
            }

            return nextMuted;
          });
        }}
        className={cn(
          'absolute right-3 top-3 z-30 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80',
          className
        )}
        aria-label={isMuted ? 'Ativar áudio do vídeo' : 'Desativar áudio do vídeo'}
      >
        {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        <span>{isMuted ? 'Ativar áudio' : 'Desativar áudio'}</span>
      </button>
    );
  };

  const renderMedia = (className: string) => {
    if (!url) {
      return (
        <div className={cn(className, 'bg-gray-800 flex items-center justify-center text-gray-500')}>
          {isLostVideo ? <Video className="h-8 w-8 opacity-50" /> : <ImageIcon className="h-8 w-8 opacity-50" />}
        </div>
      );
    }

    const mediaElement = isVideo ? (
      <video
        ref={videoRef}
        src={url}
        className={className}
        controls
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
      >
        <p>Seu navegador não suporta vídeo em HTML.</p>
      </video>
    ) : (
      <div className="relative h-full w-full">
        <img
          src={url}
          alt="Pré-visualização"
          className={className}
          referrerPolicy="no-referrer"
        />
        {isLostVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-4 text-center text-white">
            <Video className="mb-2 h-12 w-12 opacity-80" />
            <p className="text-sm font-medium">Prévia do vídeo indisponível após atualizar a página.</p>
            <p className="mt-1 text-xs opacity-70">Anexe o arquivo novamente para reproduzi-lo.</p>
          </div>
        )}
      </div>
    );

    if (post.contentType === 'carousel' && post.mediaItems && post.mediaItems.length > 1) {
      return (
        <div className="group relative h-full w-full">
          {mediaElement}
          <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setCarouselIndex((previous) => Math.max(0, previous - 1));
              }}
              disabled={carouselIndex === 0}
              className="rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70 disabled:opacity-30"
              aria-label="Voltar no carrossel"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setCarouselIndex((previous) =>
                  Math.min((post.mediaItems?.length || 1) - 1, previous + 1)
                );
              }}
              disabled={carouselIndex === (post.mediaItems?.length || 1) - 1}
              className="rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70 disabled:opacity-30"
              aria-label="Avançar no carrossel"
            >
              <ArrowLeft className="h-5 w-5 rotate-180" />
            </button>
          </div>
          <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-1.5">
            {post.mediaItems.map((item, index) => (
              <div
                key={item.id || index}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  index === carouselIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                )}
              />
            ))}
          </div>
        </div>
      );
    }

    return mediaElement;
  };

  const renderFeedMockup = () => (
    <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-100 p-3">
        <div className="flex items-center gap-2">
          <Avatar src={displayProfile.avatarUrl} fallback={displayProfile.name} size="sm" />
          <span className="text-sm font-bold text-gray-900">{displayProfile.handle}</span>
        </div>
        <MoreHorizontal className="h-5 w-5 text-gray-500" />
      </div>

      <div className={cn('relative bg-gray-100', post.contentType === 'carousel' ? 'aspect-[4/5]' : 'aspect-square')}>
        {renderMedia('absolute inset-0 h-full w-full object-cover')}
        {renderAudioToggle()}
      </div>

      <div className="p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Heart className="h-6 w-6 text-gray-900" />
            <MessageCircle className="h-6 w-6 text-gray-900" />
            <Share className="h-6 w-6 text-gray-900" />
          </div>
          <Bookmark className="h-6 w-6 text-gray-900" />
        </div>
        <p className="mb-1 text-sm font-bold text-gray-900">1.234 curtidas</p>
        <p className="text-sm text-gray-900">
          <span className="mr-2 font-bold">{displayProfile.handle}</span>
          {post.caption}
        </p>
      </div>
    </div>
  );

  const renderTikTokMockup = () => (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[400px] overflow-hidden rounded-[3rem] border-[8px] border-gray-900 bg-black shadow-2xl">
      <div className="absolute left-0 right-0 top-0 z-20 flex h-10 items-center justify-between px-8 pt-4 text-white">
        <span className="text-xs font-bold">9:41</span>
        <div className="flex gap-1">
          <div className="h-1 w-4 rounded-full bg-white" />
          <div className="h-1 w-4 rounded-full bg-white/50" />
        </div>
      </div>
      {renderMedia('h-full w-full object-cover')}
      {renderAudioToggle('top-12')}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      <div className="absolute bottom-0 left-0 right-16 z-10 p-4 text-white">
        <span className="mb-2 block text-sm font-bold">{displayProfile.handle}</span>
        <p className="mb-3 line-clamp-3 text-sm">{post.caption}</p>
        <div className="flex items-center gap-2 text-xs font-medium">
          <Music2 className="h-3 w-3" />
          <span className="truncate">{displayProfile.audioLabel}</span>
        </div>
      </div>
      <div className="absolute bottom-4 right-2 z-10 flex flex-col items-center gap-6 text-white">
        <div className="relative">
          <Avatar
            src={displayProfile.avatarUrl}
            fallback={displayProfile.name}
            size="md"
            className="border-2 border-white"
          />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-red-500 p-0.5">
            <Plus className="h-3 w-3" />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <Heart className="h-8 w-8" />
          <span className="text-xs font-medium">1,2 mil</span>
        </div>
        <div className="flex flex-col items-center">
          <MessageCircle className="h-8 w-8" />
          <span className="text-xs font-medium">84</span>
        </div>
        <div className="flex flex-col items-center">
          <Bookmark className="h-8 w-8" />
          <span className="text-xs font-medium">12</span>
        </div>
        <div className="flex flex-col items-center">
          <Share className="h-8 w-8" />
          <span className="text-xs font-medium">Compartilhar</span>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-[10px] border-gray-900 bg-gray-800">
          <Music2 className="h-3 w-3" />
        </div>
      </div>
    </div>
  );

  const renderYouTubeMockup = () => (
    <div className="relative mx-auto w-full max-w-[600px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
      <div className="relative aspect-video bg-black">
        {renderMedia('h-full w-full object-cover opacity-90')}
        {renderAudioToggle()}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600/30">
          <div className="h-full w-1/3 bg-red-600" />
        </div>
      </div>
      <div className="p-4">
        <h3 className="mb-2 text-lg font-bold text-gray-900">{post.title}</h3>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar src={displayProfile.avatarUrl} fallback={displayProfile.name} size="md" />
            <div>
              <p className="text-sm font-bold text-gray-900">{displayProfile.name}</p>
              <p className="text-xs text-gray-500">1,2 mi inscritos</p>
            </div>
            <button type="button" className="ml-2 rounded-full bg-black px-4 py-2 text-sm font-bold text-white">
              Inscrever-se
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full bg-gray-100">
              <button
                type="button"
                className="flex items-center gap-2 rounded-l-full border-r border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-200"
              >
                <ThumbsUp className="h-4 w-4" /> 12 mil
              </button>
              <button type="button" className="rounded-r-full px-4 py-2 hover:bg-gray-200">
                <ThumbsDown className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
            >
              <Share2 className="h-4 w-4" /> Compartilhar
            </button>
          </div>
        </div>
        <div className="rounded-xl bg-gray-100 p-3 text-sm">
          <p className="mb-1 font-medium">124 mil visualizações  •  há 2 horas</p>
          <p className="whitespace-pre-wrap text-gray-800">{post.caption}</p>
        </div>
      </div>
    </div>
  );

  switch (post.contentType) {
    case 'vertical_video':
      return renderTikTokMockup();
    case 'horizontal_video':
      return renderYouTubeMockup();
    case 'carousel':
    case 'static':
    default:
      return renderFeedMockup();
  }
};
