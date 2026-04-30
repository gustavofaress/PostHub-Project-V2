import type { ApprovalComment, ApprovalPost } from './approval.types';

export { CalendarApprovalModule as ApprovalModule } from './CalendarApprovalModule';

const INITIAL_APPROVALS: ApprovalPost[] = [
  {
    id: '1',
    title: 'Reel de lançamento do produto',
    caption:
      'Vem coisa grande por aí! 🚀 Nossa nova coleção chega nesta sexta. Quem está pronto? #lancamento #novacolecao #acme',
    platform: 'Instagram',
    contentType: 'vertical_video',
    status: 'pending',
    thumbnail: 'https://picsum.photos/seed/post1/400/600',
    media: 'https://picsum.photos/seed/post1/800/1200',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    feedbackCount: 2,
    publicToken: 'mock-token-1',
  },
  {
    id: '2',
    title: 'Vlog de bastidores',
    caption: 'Uma prévia da nossa rotina diária.',
    platform: 'TikTok',
    contentType: 'vertical_video',
    status: 'approved',
    thumbnail: 'https://picsum.photos/seed/post2/400/600',
    media: 'https://picsum.photos/seed/post2/800/1200',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    feedbackCount: 0,
    publicToken: 'mock-token-2',
  },
  {
    id: '3',
    title: 'Tutorial: como usar o PostHub',
    caption: 'Aprenda a dominar o PostHub em 5 minutos.',
    platform: 'YouTube',
    contentType: 'horizontal_video',
    status: 'changes_requested',
    thumbnail: 'https://picsum.photos/seed/post3/600/400',
    media: 'https://picsum.photos/seed/post3/800/1200',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    feedbackCount: 5,
    publicToken: 'mock-token-3',
  },
  {
    id: '4',
    title: 'Carrossel da coleção de verão',
    caption: 'Arraste para ver nossa nova coleção de verão! ☀️🌴',
    platform: 'Instagram',
    contentType: 'carousel',
    status: 'pending',
    thumbnail: 'https://picsum.photos/seed/carousel1/400/600',
    mediaItems: [
      {
        id: 'm1',
        type: 'image',
        fileName: 'summer1.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        previewUrl: 'https://picsum.photos/seed/carousel1/800/1200',
        persistedPreview: 'https://picsum.photos/seed/carousel1/800/1200',
        uploadStatus: 'ready',
        order: 0,
      },
      {
        id: 'm2',
        type: 'image',
        fileName: 'summer2.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        previewUrl: 'https://picsum.photos/seed/carousel2/800/1200',
        persistedPreview: 'https://picsum.photos/seed/carousel2/800/1200',
        uploadStatus: 'ready',
        order: 1,
      },
      {
        id: 'm3',
        type: 'image',
        fileName: 'summer3.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        previewUrl: 'https://picsum.photos/seed/carousel3/800/1200',
        persistedPreview: 'https://picsum.photos/seed/carousel3/800/1200',
        uploadStatus: 'ready',
        order: 2,
      },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    feedbackCount: 0,
    publicToken: 'mock-token-4',
  },
];

const INITIAL_COMMENTS: ApprovalComment[] = [
  {
    id: 'c1',
    approvalItemId: '1',
    authorType: 'external',
    authorName: 'John Doe (Cliente)',
    content:
      'Podemos deixar o logo um pouco maior nos 3 primeiros segundos? Além disso, a música parece um pouco lenta demais.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'c2',
    approvalItemId: '1',
    authorType: 'internal',
    authorName: 'Você',
    content: 'Claro, vou atualizar o vídeo e enviar uma nova versão para aprovação.',
    createdAt: new Date(Date.now() - 82800000).toISOString(),
  },
];

export const STORAGE_KEY_ITEMS = 'mockApprovalItems';
export const STORAGE_KEY_COMMENTS = 'mockApprovalComments';

export const loadApprovals = (): ApprovalPost[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ITEMS);

    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((post: any) => {
        let items = post.mediaItems || [];

        if (items.length === 0 && post.media) {
          items = [
            {
              id: 'legacy',
              type:
                post.postType === 'video' || post.contentType?.includes('video')
                  ? 'video'
                  : 'image',
              previewUrl:
                typeof post.media === 'string' ? post.media : post.media.previewUrl,
              fileName: 'legacy_media',
              mimeType:
                post.postType === 'video' || post.contentType?.includes('video')
                  ? 'video/mp4'
                  : 'image/jpeg',
              uploadStatus: 'ready',
              order: 0,
            },
          ];
        }

        items = items.map((item: any) => {
          if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
            if (item.type === 'video') {
              item.previewUrl = '';
            } else {
              item.previewUrl =
                item.persistedPreview || `https://picsum.photos/seed/${post.id}/800/1200`;
            }
          } else if (
            item.type === 'video' &&
            item.previewUrl &&
            item.previewUrl.includes('picsum.photos')
          ) {
            item.previewUrl =
              'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
          }

          return item;
        });

        let contentType = post.contentType;
        if (!contentType) {
          if (post.postType === 'carousel') contentType = 'carousel';
          else if (post.postType === 'video') {
            contentType =
              post.platform === 'YouTube' ? 'horizontal_video' : 'vertical_video';
          } else {
            contentType = 'static';
          }
        }

        return {
          ...post,
          contentType,
          mediaItems: items,
          thumbnail:
            post.thumbnail && post.thumbnail.startsWith('blob:')
              ? items[0]?.persistedPreview ||
                `https://picsum.photos/seed/${post.id}/400/600`
              : post.thumbnail,
        };
      });
    }
  } catch (error) {
    console.error('Failed to load approvals from localStorage:', error);
  }

  return INITIAL_APPROVALS;
};

export const loadComments = (): ApprovalComment[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COMMENTS);

    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load comments from localStorage:', error);
  }

  return INITIAL_COMMENTS;
};
