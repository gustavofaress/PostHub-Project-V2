import * as React from 'react';
import {
  CheckCircle,
  Plus,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  MoreVertical,
  MessageSquare,
  History,
  Instagram,
  Youtube,
  Send,
  ExternalLink,
  Check,
  X,
  Clock,
  Trash,
  Edit2,
  Eye,
  Play,
  Layers,
  Smartphone,
  MonitorPlay,
} from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';
import { Modal } from '../../shared/components/Modal';
import { Avatar } from '../../shared/components/Avatar';
import { Dropdown, DropdownItem } from '../../shared/components/Dropdown';
import { cn } from '../../shared/utils/cn';
import { useProfile } from '../../app/context/ProfileContext';
import { useAuth } from '../../app/context/AuthContext';
import { approvalService } from './services/approvalService';
import { InternalPreview } from './InternalPreview';

export interface MediaState {
  id?: string;
  type: 'image' | 'video';
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewUrl: string;
  persistedPreview?: string;
  uploadStatus:
    | 'selected'
    | 'validating'
    | 'queued_for_processing'
    | 'processing'
    | 'ready'
    | 'failed';
  processingStatus?: string;
  originalFileReference?: string;
  optimizedUrlIfAny?: string;
  order?: number;
}

export interface ApprovalPost {
  id: string;
  title: string;
  caption: string;
  platform: 'Instagram' | 'TikTok' | 'YouTube';
  contentType: 'static' | 'carousel' | 'vertical_video' | 'horizontal_video';
  status: 'pending' | 'approved' | 'changes_requested' | 'rejected';
  thumbnail: string;
  media?: string | MediaState;
  mediaItems?: MediaState[];
  publicToken?: string;
  createdAt: string;
  updatedAt: string;
  feedbackCount: number;
}

export interface ApprovalComment {
  id: string;
  approvalItemId: string;
  authorType: 'internal' | 'external';
  authorName: string;
  content: string;
  createdAt: string;
}

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
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
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

        let cType = post.contentType;
        if (!cType) {
          if (post.postType === 'carousel') cType = 'carousel';
          else if (post.postType === 'video')
            cType = post.platform === 'YouTube' ? 'horizontal_video' : 'vertical_video';
          else cType = 'static';
        }

        return {
          ...post,
          contentType: cType,
          mediaItems: items,
          thumbnail:
            post.thumbnail && post.thumbnail.startsWith('blob:')
              ? items[0]?.persistedPreview ||
                `https://picsum.photos/seed/${post.id}/400/600`
              : post.thumbnail,
        };
      });
    }
  } catch (e) {
    console.error('Failed to load approvals from localStorage:', e);
  }
  return INITIAL_APPROVALS;
};

export const loadComments = (): ApprovalComment[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COMMENTS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load comments from localStorage:', e);
  }
  return INITIAL_COMMENTS;
};

export const ApprovalModule = () => {
  const { activeProfile } = useProfile();
  const { user } = useAuth();

  const [view, setView] = React.useState<'list' | 'create' | 'edit' | 'preview'>('list');
  const [approvals, setApprovals] = React.useState<ApprovalPost[]>([]);
  const [comments, setComments] = React.useState<ApprovalComment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [generatedLink, setGeneratedLink] = React.useState<string | null>(null);
  const [selectedPostHistory, setSelectedPostHistory] = React.useState<ApprovalPost | null>(null);
  const [editingPostId, setEditingPostId] = React.useState<string | null>(null);
  const [previewPostId, setPreviewPostId] = React.useState<string | null>(null);

  const [newTitle, setNewTitle] = React.useState('');
  const [newCaption, setNewCaption] = React.useState('');
  const [selectedPlatform, setSelectedPlatform] = React.useState<
    'Instagram' | 'TikTok' | 'YouTube'
  >('Instagram');
  const [newContentType, setNewContentType] = React.useState<
    'static' | 'carousel' | 'vertical_video' | 'horizontal_video'
  >('static');
  const [newMediaItems, setNewMediaItems] = React.useState<MediaState[]>([]);
  const [internalComment, setInternalComment] = React.useState('');
  const [postToDelete, setPostToDelete] = React.useState<string | null>(null);
  const [alertMessage, setAlertMessage] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const activeProfileId = activeProfile?.id ?? null;

  const ensureActiveProfile = React.useCallback(() => {
    if (!activeProfileId) {
      setAlertMessage(
        'Nenhum perfil ativo foi encontrado. Recarregue a página ou selecione um perfil antes de continuar.'
      );
      return false;
    }
    return true;
  }, [activeProfileId]);

  const normalizePostsMedia = React.useCallback((posts: ApprovalPost[]) => {
    return posts.map((post) => {
      let items = post.mediaItems || [];
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
      return { ...post, mediaItems: items };
    });
  }, []);

  const applyFeedbackCountToPosts = React.useCallback(
    (posts: ApprovalPost[], allComments: ApprovalComment[]) => {
      return posts.map((post) => ({
        ...post,
        feedbackCount: allComments.filter((comment) => comment.approvalItemId === post.id)
          .length,
      }));
    },
    []
  );

  const refreshApprovals = React.useCallback(async (): Promise<ApprovalPost[]> => {
    if (!activeProfileId) {
      setApprovals([]);
      return [];
    }

    try {
      const posts = await approvalService.listApprovalPosts(activeProfileId);
      const processedPosts = normalizePostsMedia(posts);

      const commentsByPost = await Promise.all(
        processedPosts.map(async (post) => {
          try {
            return await approvalService.listApprovalFeedback(post.id);
          } catch {
            return [];
          }
        })
      );

      const allComments = commentsByPost.flat();
      const postsWithCounts = applyFeedbackCountToPosts(processedPosts, allComments);
      setApprovals(postsWithCounts);
      return postsWithCounts;
    } catch (e) {
      console.error('Failed to load approvals from Supabase:', e);
      const fallbackPosts = normalizePostsMedia(loadApprovals());
      const fallbackComments = loadComments();
      const postsWithCounts = applyFeedbackCountToPosts(fallbackPosts, fallbackComments);
      setApprovals(postsWithCounts);
      return postsWithCounts;
    }
  }, [activeProfileId, normalizePostsMedia, applyFeedbackCountToPosts]);

  const refreshCommentsForPost = React.useCallback(
    async (postId: string): Promise<ApprovalComment[]> => {
      try {
        const feedback = await approvalService.listApprovalFeedback(postId);
        setComments(feedback);

        setApprovals((prev) =>
          prev.map((post) =>
            post.id === postId ? { ...post, feedbackCount: feedback.length } : post
          )
        );

        setSelectedPostHistory((prev) =>
          prev && prev.id === postId ? { ...prev, feedbackCount: feedback.length } : prev
        );

        return feedback;
      } catch (e) {
        console.error('Failed to load comments from Supabase:', e);
        const fallback = loadComments().filter((c) => c.approvalItemId === postId);
        setComments(fallback);

        setApprovals((prev) =>
          prev.map((post) =>
            post.id === postId ? { ...post, feedbackCount: fallback.length } : post
          )
        );

        setSelectedPostHistory((prev) =>
          prev && prev.id === postId ? { ...prev, feedbackCount: fallback.length } : prev
        );

        return fallback;
      }
    },
    []
  );

  const openHistoryModal = React.useCallback(
    async (postId: string) => {
      const refreshedPosts = await refreshApprovals();
      const refreshedPost =
        refreshedPosts.find((post) => post.id === postId) ||
        approvals.find((post) => post.id === postId) ||
        null;

      setSelectedPostHistory(refreshedPost);

      if (refreshedPost) {
        await refreshCommentsForPost(refreshedPost.id);
      }
    },
    [approvals, refreshApprovals, refreshCommentsForPost]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const MAX_SIZE = 1.5 * 1024 * 1024 * 1024;
    const validFiles = files.filter(
      (f) => f.size <= MAX_SIZE && (f.type.startsWith('image/') || f.type.startsWith('video/'))
    );

    if (validFiles.length === 0) {
      setAlertMessage('Arquivos inválidos ou tamanho excedido.');
      return;
    }

    const filesToProcess = newContentType === 'carousel' ? validFiles : [validFiles[0]];

    const newItems: MediaState[] = await Promise.all(
      filesToProcess.map(async (file, index) => {
        const isVideo = file.type.startsWith('video/');
        const previewUrl = URL.createObjectURL(file);
        let persistedPreview = '';

        if (!isVideo) {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.src = previewUrl;

            await new Promise((resolve) => {
              img.onload = resolve;
            });

            const MAX_DIM = 800;
            let width = img.width;
            let height = img.height;

            if (width > height && width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            } else if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }

            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            persistedPreview = canvas.toDataURL('image/jpeg', 0.7);
          } catch (err) {
            console.error('Failed to generate persisted preview', err);
          }
        } else {
          try {
            const video = document.createElement('video');
            video.src = previewUrl;
            video.muted = true;
            video.playsInline = true;

            await new Promise((resolve, reject) => {
              video.onloadeddata = () => {
                video.currentTime = Math.min(1, video.duration / 2 || 1);
              };
              video.onseeked = resolve;
              video.onerror = reject;
              setTimeout(resolve, 3000);
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_DIM = 800;
            let width = video.videoWidth || 800;
            let height = video.videoHeight || 600;

            if (width > height && width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            } else if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }

            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(video, 0, 0, width, height);
            persistedPreview = canvas.toDataURL('image/jpeg', 0.7);
          } catch (err) {
            console.error('Failed to generate video persisted preview', err);
          }
        }

        return {
          id: Math.random().toString(36).substring(7),
          type: isVideo ? 'video' : 'image',
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          previewUrl,
          persistedPreview,
          uploadStatus: 'ready',
          order: newMediaItems.length + index,
        };
      })
    );

    setNewMediaItems((prev) =>
      newContentType === 'carousel' ? [...prev, ...newItems] : newItems
    );
  };

  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (!activeProfileId) {
          setApprovals([]);
          return;
        }
        await refreshApprovals();
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [activeProfileId, refreshApprovals]);

  React.useEffect(() => {
    if (!selectedPostHistory?.id) return;
    void refreshCommentsForPost(selectedPostHistory.id);
  }, [selectedPostHistory?.id, refreshCommentsForPost]);

  const generateLink = async (id: string) => {
    if (!ensureActiveProfile()) return;

    const profileId = activeProfileId!;
    const postIndex = approvals.findIndex((p) => p.id === id);
    if (postIndex === -1) return;

    let token = approvals[postIndex].publicToken;
    if (!token) {
      token = `mock-token-${id}-${Date.now()}`;
      const previousApprovals = [...approvals];
      const updatedApprovals = [...approvals];
      updatedApprovals[postIndex] = { ...updatedApprovals[postIndex], publicToken: token };
      setApprovals(updatedApprovals);

      try {
        await approvalService.updateApprovalPost(id, { publicToken: token }, profileId);
      } catch (e) {
        console.error('Failed to save token to Supabase:', e);
        setApprovals(previousApprovals);
        setAlertMessage('Não foi possível gerar o link. Tente novamente.');
        return;
      }
    }

    setGeneratedLink(`${window.location.origin}/aprovacao/${token}`);
  };

  const resetForm = () => {
    setNewTitle('');
    setNewCaption('');
    setSelectedPlatform('Instagram');
    setNewContentType('static');
    setNewMediaItems([]);
    setEditingPostId(null);
  };

  const handleSaveRequest = async () => {
    if (isSubmitting) return;

    if (!newTitle.trim()) {
      setAlertMessage('Informe um título para a solicitação.');
      return;
    }

    if (!ensureActiveProfile()) return;
    const profileId = activeProfileId!;

    console.log('Approval create debug:', {
      userId: user?.id,
      activeProfileId: profileId,
      newTitle,
      selectedPlatform,
      newContentType,
      mediaItemsCount: newMediaItems.length,
    });

    setIsSubmitting(true);

    try {
      if (view === 'edit' && editingPostId) {
        const updatedData: Partial<ApprovalPost> = {
          title: newTitle,
          caption: newCaption,
          platform: selectedPlatform,
          contentType: newContentType,
          mediaItems: newMediaItems,
          thumbnail:
            newMediaItems.length > 0
              ? newMediaItems[0].persistedPreview || newMediaItems[0].previewUrl
              : '',
        };

        await approvalService.updateApprovalPost(editingPostId, updatedData, profileId);
        await refreshApprovals();
        setView('list');
        resetForm();
        setAlertMessage('Solicitação atualizada com sucesso.');
        return;
      }

      const newPostData: Partial<ApprovalPost> = {
        title: newTitle,
        caption: newCaption,
        platform: selectedPlatform,
        contentType: newContentType,
        status: 'pending',
        thumbnail:
          newMediaItems.length > 0
            ? newMediaItems[0].persistedPreview || newMediaItems[0].previewUrl
            : `https://picsum.photos/seed/${Date.now()}/400/600`,
        mediaItems: newMediaItems,
      };

      const createdPost = await approvalService.createApprovalPost(newPostData, profileId);

      console.log('Approval created successfully:', createdPost);

      await refreshApprovals();
      setView('list');
      resetForm();
      setAlertMessage('Solicitação criada com sucesso.');
    } catch (e: any) {
      console.error('Failed to create/update post in Supabase:', e);
      setAlertMessage(
        e?.message || 'Não foi possível salvar a solicitação. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (post: ApprovalPost) => {
    setNewTitle(post.title);
    setNewCaption(post.caption);
    setSelectedPlatform(post.platform);
    setNewContentType(post.contentType);
    setNewMediaItems(post.mediaItems || []);
    setEditingPostId(post.id);
    setView('edit');
  };

  const handleDelete = (id: string) => {
    setPostToDelete(id);
  };

  const confirmDelete = async () => {
    if (!postToDelete || isDeleting) return;
    if (!ensureActiveProfile()) return;

    setIsDeleting(true);

    try {
      await approvalService.deleteApprovalPost(postToDelete, activeProfileId!);
      if (selectedPostHistory?.id === postToDelete) setSelectedPostHistory(null);
      if (previewPostId === postToDelete) {
        setPreviewPostId(null);
        setView('list');
      }
      await refreshApprovals();
      setPostToDelete(null);
      setAlertMessage('Solicitação excluída com sucesso.');
    } catch (e: any) {
      console.error('Failed to delete post in Supabase:', e);
      setAlertMessage(
        e?.message || 'Não foi possível excluir a solicitação. Tente novamente.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendInternalComment = async () => {
    if (!internalComment.trim() || !selectedPostHistory || !user?.id) return;
    if (!ensureActiveProfile()) return;

    const previousComments = [...comments];
    const previousApprovals = [...approvals];
    const commentText = internalComment;

    const newCommentData: Partial<ApprovalComment> = {
      approvalItemId: selectedPostHistory.id,
      authorType: 'internal',
      authorName: 'Você',
      content: internalComment,
    };

    const tempId = Date.now().toString();
    const optimisticComment: ApprovalComment = {
      ...(newCommentData as ApprovalComment),
      id: tempId,
      createdAt: new Date().toISOString(),
    };

    const nextComments = [...comments, optimisticComment];
    setComments(nextComments);

    setApprovals((prev) =>
      prev.map((p) =>
        p.id === selectedPostHistory.id
          ? { ...p, feedbackCount: nextComments.filter((c) => c.approvalItemId === p.id).length }
          : p
      )
    );

    setSelectedPostHistory((prev) =>
      prev
        ? { ...prev, feedbackCount: nextComments.filter((c) => c.approvalItemId === prev.id).length }
        : prev
    );

    setInternalComment('');

    try {
      const createdComment = await approvalService.addApprovalFeedback(newCommentData, {
        profileId: activeProfileId!,
        userId: user.id,
      });

      setComments((current) => current.map((c) => (c.id === tempId ? createdComment : c)));
      await refreshCommentsForPost(selectedPostHistory.id);
      await refreshApprovals();
    } catch (e) {
      console.error('Failed to add comment to Supabase:', e);
      setComments(previousComments);
      setApprovals(previousApprovals);
      setInternalComment(commentText);
      setAlertMessage('Não foi possível enviar o comentário. Tente novamente.');
    }
  };

  const renderAlertModal = (
    <Modal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} title="Aviso">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">{alertMessage}</p>
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setAlertMessage(null)}>
            OK
          </Button>
        </div>
      </div>
    </Modal>
  );

  if (view === 'create' || view === 'edit') {
    return (
      <>
        <div className="mx-auto max-w-3xl space-y-6 pb-12">
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={() => {
                setView('list');
                resetForm();
              }}
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {view === 'edit'
                  ? 'Editar solicitação de aprovação'
                  : 'Criar solicitação de aprovação'}
              </h1>
              <p className="text-text-secondary">
                {view === 'edit'
                  ? 'Atualize o conteúdo para revisão do cliente.'
                  : 'Configure um novo post para revisão do cliente.'}
              </p>
            </div>
          </div>

          {!activeProfileId && (
            <Card className="border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-700">
                Nenhum perfil ativo foi encontrado. Recarregue a página ou selecione um perfil antes
                de criar solicitações de aprovação.
              </p>
            </Card>
          )}

          <Card className="space-y-8 p-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-primary">Título do conteúdo</label>
              <Input
                placeholder="Ex.: Reel da coleção de verão"
                className="py-6 text-lg"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-text-primary">Tipo de conteúdo</label>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { id: 'static', label: 'Imagem estática', icon: ImageIcon },
                  { id: 'carousel', label: 'Carrossel', icon: Layers },
                  { id: 'vertical_video', label: 'Vídeo vertical', icon: Smartphone },
                  { id: 'horizontal_video', label: 'Vídeo horizontal', icon: MonitorPlay },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setNewContentType(type.id as any);
                      setNewMediaItems([]);
                    }}
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all',
                      newContentType === type.id
                        ? 'border-brand bg-brand/5 text-brand'
                        : 'border-gray-200 text-gray-600 hover:border-brand/50 hover:bg-gray-50'
                    )}
                  >
                    <type.icon className="h-6 w-6" />
                    <span className="text-sm font-bold">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-text-primary">Plataforma</label>
              <div className="grid grid-cols-3 gap-4">
                {(['Instagram', 'TikTok', 'YouTube'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPlatform(p)}
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all',
                      selectedPlatform === p
                        ? 'border-brand bg-brand/5 text-brand'
                        : 'border-gray-200 text-gray-600 hover:border-brand/50 hover:bg-gray-50'
                    )}
                  >
                    {p === 'Instagram' && <Instagram className="h-6 w-6" />}
                    {p === 'TikTok' && <Video className="h-6 w-6" />}
                    {p === 'YouTube' && <Youtube className="h-6 w-6" />}
                    <span className="text-sm font-bold">{p}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-text-primary">
                Upload de mídia {newContentType === 'carousel' ? '(Selecione múltiplos arquivos)' : ''}
              </label>
              <div
                className="group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 transition-all hover:border-brand/50 hover:bg-gray-100"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept={newContentType.includes('video') ? 'video/*' : 'image/*'}
                  multiple={newContentType === 'carousel'}
                  onChange={handleFileChange}
                />
                {newMediaItems.length > 0 ? (
                  <>
                    {newMediaItems[0].type === 'image' ? (
                      <img
                        src={newMediaItems[0].previewUrl}
                        alt="Mídia selecionada"
                        className="absolute inset-0 h-full w-full object-cover opacity-50"
                      />
                    ) : (
                      <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gray-900 opacity-50">
                        <Video className="h-16 w-16 text-white" />
                      </div>
                    )}
                    <div className="relative z-10 mb-4 rounded-full bg-white p-4 shadow-sm transition-transform group-hover:scale-110">
                      <Check className="h-8 w-8 text-green-500" />
                    </div>
                    <p className="relative z-10 rounded-full bg-white/80 px-4 py-1 text-base font-bold text-text-primary">
                      {newMediaItems.length}{' '}
                      {newMediaItems.length === 1 ? 'arquivo anexado' : 'arquivos anexados'} (clique
                      para adicionar/trocar)
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-4 rounded-full bg-white p-4 shadow-sm transition-transform group-hover:scale-110">
                      <Plus className="h-8 w-8 text-brand" />
                    </div>
                    <p className="text-base font-bold text-text-primary">
                      Clique para enviar ou arraste e solte
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      MP4, MOV, JPG ou PNG (máx. 1,5 GB)
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-text-primary">Legenda</label>
              <textarea
                className="min-h-[150px] w-full resize-y rounded-xl border-2 border-gray-200 p-4 text-base transition-all focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
                placeholder="Escreva a legenda do post aqui... Inclua hashtags e menções."
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-4 border-t border-gray-100 pt-6">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setView('list');
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                size="lg"
                onClick={handleSaveRequest}
                className="px-8"
                disabled={!newTitle.trim() || isSubmitting}
                isLoading={isSubmitting}
              >
                {view === 'edit' ? 'Salvar alterações' : 'Criar solicitação'}
              </Button>
            </div>
          </Card>
        </div>
        {renderAlertModal}
      </>
    );
  }

  if (view === 'preview' && previewPostId) {
    const post = approvals.find((p) => p.id === previewPostId);
    if (post) {
      return (
        <>
          <InternalPreview
            key={post.id}
            post={post}
            comments={comments.filter((c) => c.approvalItemId === post.id)}
            onBack={() => {
              setView('list');
              setPreviewPostId(null);
            }}
            onStatusChange={async (status, comment) => {
              if (!user?.id) {
                setAlertMessage('Usuário não identificado.');
                return;
              }
              if (!ensureActiveProfile()) return;

              const previousApprovals = [...approvals];
              const previousComments = [...comments];

              let updatedApprovals = approvals.map((p) =>
                p.id === post.id ? { ...p, status, updatedAt: new Date().toISOString() } : p
              );

              setApprovals(updatedApprovals);

              try {
                await approvalService.updateApprovalStatus(post.id, status, activeProfileId!);

                if (comment.trim()) {
                  const newCommentData: Partial<ApprovalComment> = {
                    approvalItemId: post.id,
                    authorType: 'internal',
                    authorName: 'Você',
                    content: comment,
                  };

                  const tempId = Date.now().toString();
                  const optimisticComment: ApprovalComment = {
                    ...(newCommentData as ApprovalComment),
                    id: tempId,
                    createdAt: new Date().toISOString(),
                  };

                  const nextComments = [...comments, optimisticComment];
                  setComments(nextComments);

                  updatedApprovals = updatedApprovals.map((p) =>
                    p.id === post.id
                      ? {
                          ...p,
                          feedbackCount: nextComments.filter(
                            (c) => c.approvalItemId === p.id
                          ).length,
                        }
                      : p
                  );
                  setApprovals(updatedApprovals);

                  const createdComment = await approvalService.addApprovalFeedback(newCommentData, {
                    profileId: activeProfileId!,
                    userId: user.id,
                  });

                  setComments((current) =>
                    current.map((c) => (c.id === tempId ? createdComment : c))
                  );
                }

                await refreshCommentsForPost(post.id);
                await refreshApprovals();
              } catch (e) {
                console.error('Failed to update status in Supabase:', e);
                setApprovals(previousApprovals);
                setComments(previousComments);
                setAlertMessage('Não foi possível atualizar o status. Tente novamente.');
              }
            }}
            onCommentSubmit={async (comment) => {
              if (!user?.id) {
                setAlertMessage('Usuário não identificado.');
                return;
              }
              if (!ensureActiveProfile()) return;

              const previousComments = [...comments];
              const previousApprovals = [...approvals];

              const newCommentData: Partial<ApprovalComment> = {
                approvalItemId: post.id,
                authorType: 'internal',
                authorName: 'Você',
                content: comment,
              };

              const tempId = Date.now().toString();
              const optimisticComment: ApprovalComment = {
                ...(newCommentData as ApprovalComment),
                id: tempId,
                createdAt: new Date().toISOString(),
              };

              const nextComments = [...comments, optimisticComment];
              setComments(nextComments);

              const updatedApprovals = approvals.map((p) =>
                p.id === post.id
                  ? {
                      ...p,
                      feedbackCount: nextComments.filter((c) => c.approvalItemId === p.id).length,
                    }
                  : p
              );
              setApprovals(updatedApprovals);

              try {
                const createdComment = await approvalService.addApprovalFeedback(newCommentData, {
                  profileId: activeProfileId!,
                  userId: user.id,
                });

                setComments((current) =>
                  current.map((c) => (c.id === tempId ? createdComment : c))
                );
                await refreshCommentsForPost(post.id);
                await refreshApprovals();
              } catch (e) {
                console.error('Failed to submit comment to Supabase:', e);
                setComments(previousComments);
                setApprovals(previousApprovals);
                setAlertMessage('Não foi possível enviar o comentário. Tente novamente.');
              }
            }}
          />
          {renderAlertModal}
        </>
      );
    }
  }

  const renderCardCover = (post: ApprovalPost) => {
    let url = post.thumbnail;
    let isVideo = false;
    const isCarousel = post.contentType === 'carousel' && (post.mediaItems?.length || 0) > 1;
    let isLostVideo = false;

    if (post.mediaItems && post.mediaItems.length > 0) {
      const item = post.mediaItems[0];
      url = item.previewUrl || item.persistedPreview || post.thumbnail;
      isVideo = item.type === 'video' && !!item.previewUrl && !url.includes('picsum.photos');
      isLostVideo = item.type === 'video' && !item.previewUrl;
    } else if (typeof post.media === 'object' && post.media !== null) {
      url = post.media.previewUrl || post.thumbnail;
      isVideo = post.media.type === 'video' && !url.includes('picsum.photos');
    } else if (typeof post.media === 'string' && post.media) {
      url = post.media;
      isVideo = !!post.media.match(/\.(mp4|webm|ogg)$/i);
    }

    if (!url) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-400">
          {isLostVideo ? (
            <Video className="h-8 w-8 opacity-50" />
          ) : (
            <ImageIcon className="h-8 w-8 opacity-50" />
          )}
        </div>
      );
    }

    return (
      <>
        {isVideo ? (
          <video
            src={url}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            muted
            playsInline
          />
        ) : (
          <img
            src={url}
            alt={post.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        )}
        {(isVideo || isLostVideo || post.contentType?.includes('video')) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/40 p-3 text-white backdrop-blur-sm">
              <Play className="ml-1 h-6 w-6" />
            </div>
          </div>
        )}
        {isCarousel && (
          <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
            {post.mediaItems?.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  'h-1.5 rounded-full shadow-sm',
                  idx === 0 ? 'w-4 bg-white' : 'w-1.5 bg-white/70'
                )}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  if (isLoading) {
    return (
      <>
        <div className="space-y-8">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
              <CheckCircle className="h-6 w-6 text-brand" />
              Aprovações de Conteúdo
            </h1>
            <p className="text-text-secondary">
              Gerencie revisões de conteúdo e feedbacks dos clientes.
            </p>
          </div>

          <Card className="p-8">
            <p className="text-sm text-text-secondary">
              Carregando solicitações de aprovação...
            </p>
          </Card>
        </div>
        {renderAlertModal}
      </>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {!activeProfileId && (
          <Card className="border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-700">
              Nenhum perfil ativo foi encontrado. Alguns recursos de aprovação podem não funcionar
              até que um perfil seja carregado ou selecionado.
            </p>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
              <CheckCircle className="h-6 w-6 text-brand" />
              Aprovações de Conteúdo
            </h1>
            <p className="text-text-secondary">
              Gerencie revisões de conteúdo e feedbacks dos clientes.
            </p>
          </div>
          <Button onClick={() => setView('create')} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar solicitação de aprovação
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {approvals.map((post) => (
            <Card key={post.id} padding="none" className="group flex flex-col overflow-hidden">
              <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                {renderCardCover(post)}
                <div className="absolute left-3 top-3">
                  <Badge
                    variant={
                      post.status === 'approved'
                        ? 'success'
                        : post.status === 'changes_requested'
                          ? 'warning'
                          : post.status === 'rejected'
                            ? 'error'
                            : 'default'
                    }
                    className="shadow-sm"
                  >
                    {post.status === 'approved'
                      ? 'APROVADO'
                      : post.status === 'changes_requested'
                        ? 'AJUSTES SOLICITADOS'
                        : post.status === 'rejected'
                          ? 'REJEITADO'
                          : 'PENDENTE'}
                  </Badge>
                </div>
                <div className="absolute right-3 top-3">
                  <div className="rounded-full bg-white/90 p-1.5 text-text-primary shadow-sm backdrop-blur-sm">
                    {post.platform === 'Instagram' && <Instagram className="h-4 w-4" />}
                    {post.platform === 'TikTok' && <Video className="h-4 w-4" />}
                    {post.platform === 'YouTube' && <Youtube className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="line-clamp-1 font-bold text-text-primary">{post.title}</h3>
                  <Dropdown
                    trigger={
                      <button className="text-gray-400 hover:text-text-primary">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    }
                  >
                    <DropdownItem
                      onClick={async () => {
                        await refreshCommentsForPost(post.id);
                        setPreviewPostId(post.id);
                        setView('preview');
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      Visualizar
                    </DropdownItem>
                    <DropdownItem onClick={() => handleEdit(post)}>
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => handleDelete(post.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash className="h-4 w-4" />
                      Excluir
                    </DropdownItem>
                  </Dropdown>
                </div>

                <div className="mb-4 flex items-center gap-4 text-xs text-text-secondary">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {post.feedbackCount} comentários
                  </div>
                </div>

                <div className="mt-auto flex gap-2 border-t border-gray-100 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => generateLink(post.id)}
                  >
                    <LinkIcon className="h-3 w-3" />
                    Obter link
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => void openHistoryModal(post.id)}
                  >
                    <History className="h-3 w-3" />
                    Histórico
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Modal
          isOpen={!!generatedLink}
          onClose={() => setGeneratedLink(null)}
          title="Link de aprovação gerado"
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Compartilhe este link com seu cliente ou revisor. Ele não precisa de uma conta PostHub
              para visualizar e aprovar.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <code className="flex-1 truncate text-xs">{generatedLink}</code>
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink!);
                  setAlertMessage('Link copiado para a área de transferência!');
                }}
              >
                Copiar
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.open(generatedLink!, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Abrir link público
              </Button>
              <Button
                variant="primary"
                className="gap-2"
                onClick={async () => {
                  const token = generatedLink?.split('/').pop();
                  const post = approvals.find((p) => p.publicToken === token);
                  if (post) {
                    await refreshCommentsForPost(post.id);
                    setPreviewPostId(post.id);
                    setView('preview');
                    setGeneratedLink(null);
                  }
                }}
              >
                <Eye className="h-4 w-4" />
                Visualização interna
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={!!selectedPostHistory}
          onClose={() => setSelectedPostHistory(null)}
          title="Histórico de revisão"
        >
          {selectedPostHistory && approvals.find((p) => p.id === selectedPostHistory.id) && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <img
                  src={approvals.find((p) => p.id === selectedPostHistory.id)!.thumbnail}
                  alt="Miniatura"
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <div>
                  <h3 className="font-bold text-text-primary">
                    {approvals.find((p) => p.id === selectedPostHistory.id)!.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                    <span>{approvals.find((p) => p.id === selectedPostHistory.id)!.platform}</span>
                    <span>•</span>
                    <Badge
                      variant={
                        approvals.find((p) => p.id === selectedPostHistory.id)!.status === 'approved'
                          ? 'success'
                          : approvals.find((p) => p.id === selectedPostHistory.id)!.status ===
                              'changes_requested'
                            ? 'warning'
                            : approvals.find((p) => p.id === selectedPostHistory.id)!.status ===
                                'rejected'
                              ? 'error'
                              : 'default'
                      }
                      className="py-0 text-[10px]"
                    >
                      {approvals.find((p) => p.id === selectedPostHistory.id)!.status === 'approved'
                        ? 'APROVADO'
                        : approvals.find((p) => p.id === selectedPostHistory.id)!.status ===
                            'changes_requested'
                          ? 'AJUSTES SOLICITADOS'
                          : approvals.find((p) => p.id === selectedPostHistory.id)!.status ===
                              'rejected'
                            ? 'REJEITADO'
                            : 'PENDENTE'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="custom-scrollbar max-h-[400px] space-y-6 overflow-y-auto pr-2">
                {comments.filter((c) => c.approvalItemId === selectedPostHistory.id).length > 0 ? (
                  comments
                    .filter((c) => c.approvalItemId === selectedPostHistory.id)
                    .sort(
                      (a, b) =>
                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    )
                    .map((comment) => (
                      <div
                        key={comment.id}
                        className={cn(
                          'flex gap-3',
                          comment.authorType === 'internal' ? 'flex-row-reverse' : ''
                        )}
                      >
                        <Avatar
                          fallback={comment.authorName.substring(0, 2).toUpperCase()}
                          size="sm"
                          className={comment.authorType === 'internal' ? 'bg-brand text-white' : ''}
                        />
                        <div
                          className={cn(
                            'flex flex-col',
                            comment.authorType === 'internal' ? 'items-end' : 'items-start'
                          )}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            {comment.authorType === 'internal' ? (
                              <>
                                <span className="text-[10px] text-text-secondary">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </span>
                                <span className="text-sm font-bold text-text-primary">
                                  {comment.authorName}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-sm font-bold text-text-primary">
                                  {comment.authorName}
                                </span>
                                <span className="text-[10px] text-text-secondary">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </span>
                              </>
                            )}
                          </div>
                          <p
                            className={cn(
                              'rounded-xl p-3 text-sm',
                              comment.authorType === 'internal'
                                ? 'rounded-tr-none bg-brand text-white'
                                : 'rounded-tl-none bg-gray-50 text-text-secondary'
                            )}
                          >
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="py-8 text-center text-sm text-text-secondary">
                    Ainda não há feedbacks ou comentários.
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t border-gray-100 pt-4">
                <Input
                  placeholder="Responder ao feedback..."
                  className="flex-1"
                  value={internalComment}
                  onChange={(e) => setInternalComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSendInternalComment();
                  }}
                />
                <Button
                  className="shrink-0 gap-2"
                  onClick={() => void handleSendInternalComment()}
                  disabled={!internalComment.trim()}
                >
                  <Send className="h-4 w-4" />
                  Enviar
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={!!postToDelete}
          onClose={() => setPostToDelete(null)}
          title="Excluir solicitação de aprovação"
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Tem certeza de que deseja excluir esta solicitação de aprovação? Esta ação não pode ser
              desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPostToDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                isLoading={isDeleting}
              >
                Excluir
              </Button>
            </div>
          </div>
        </Modal>
      </div>

      {renderAlertModal}
    </>
  );
};
