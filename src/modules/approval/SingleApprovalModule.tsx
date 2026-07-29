import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Copy,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Layers,
  Link2,
  MessageSquare,
  MoreVertical,
  Play,
  Plus,
  Trash2,
  Video,
  Youtube,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { Dropdown, DropdownItem } from '../../shared/components/Dropdown';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { cn } from '../../shared/utils/cn';
import { useProfile } from '../../app/context/ProfileContext';
import { useAuth } from '../../app/context/AuthContext';
import { supabase } from '../../shared/utils/supabase';
import { InternalPreview } from './InternalPreview';
import {
  getApprovalStatusBadgeVariant,
  getApprovalStatusLabel,
  type ApprovalComment,
  type ApprovalContentType,
  type ApprovalPost,
} from './approval.types';
import { approvalService } from './services/approvalService';
import { uploadCalendarMediaFiles } from '../calendar/calendarMediaUpload';
import { APPROVAL_PLATFORMS } from '../calendar/calendarApproval.types';
import { kanbanColumnsService } from '../../services/kanban-columns.service';

interface SingleApprovalModuleProps {
  requestedApprovalId?: string | null;
  onApprovalRequestConsumed?: () => void;
}

interface LinkedCalendarRow {
  id: string;
  title: string;
  scheduled_date: string;
  status: string;
}

const formatDateTime = (value: string) =>
  format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

const formatCalendarDate = (value: string) =>
  format(new Date(value), "dd 'de' MMM 'de' yyyy", { locale: ptBR });

const getContentTypeLabel = (contentType: ApprovalContentType) => {
  switch (contentType) {
    case 'carousel':
      return 'Carrossel';
    case 'vertical_video':
      return 'Vídeo vertical';
    case 'horizontal_video':
      return 'Vídeo horizontal';
    case 'static':
    default:
      return 'Imagem';
  }
};

const getContentTypeIcon = (contentType: ApprovalContentType) => {
  switch (contentType) {
    case 'carousel':
      return Layers;
    case 'vertical_video':
    case 'horizontal_video':
      return Play;
    case 'static':
    default:
      return ImageIcon;
  }
};

const renderCardCover = (post: ApprovalPost) => {
  let url = post.thumbnail;
  let isVideo = false;
  let isLostVideo = false;

  if (post.mediaItems && post.mediaItems.length > 0) {
    const item = post.mediaItems[0];
    url = item.previewUrl || item.persistedPreview || post.thumbnail;
    isVideo = item.type === 'video' && !!item.previewUrl && !url.includes('picsum.photos');
    isLostVideo = item.type === 'video' && !item.previewUrl;
  }

  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
        {isLostVideo ? <Video className="h-8 w-8 opacity-60" /> : <ImageIcon className="h-8 w-8 opacity-60" />}
      </div>
    );
  }

  return (
    <>
      {isVideo ? (
        <video src={url} className="h-full w-full object-cover" muted playsInline />
      ) : (
        <img
          src={url}
          alt={post.title}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      {(isVideo || isLostVideo || post.contentType.includes('video')) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/40 p-3 text-white backdrop-blur-sm">
            <Play className="ml-1 h-6 w-6" />
          </div>
        </div>
      )}
      {post.contentType === 'carousel' && (post.mediaItems?.length || 0) > 1 ? (
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
      ) : null}
    </>
  );
};

export const SingleApprovalModule = ({
  requestedApprovalId,
  onApprovalRequestConsumed,
}: SingleApprovalModuleProps) => {
  const navigate = useNavigate();
  const { activeProfile } = useProfile();
  const { user } = useAuth();

  const [items, setItems] = React.useState<ApprovalPost[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const [selectedPreviewPostId, setSelectedPreviewPostId] = React.useState<string | null>(null);
  const [previewComments, setPreviewComments] = React.useState<ApprovalComment[]>([]);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPostId, setEditingPostId] = React.useState<string | null>(null);
  const [postTitle, setPostTitle] = React.useState('');
  const [postCaption, setPostCaption] = React.useState('');
  const [postPlatform, setPostPlatform] = React.useState<'Instagram' | 'TikTok' | 'YouTube'>(
    'Instagram'
  );
  const [contentType, setContentType] = React.useState<ApprovalContentType>('static');
  const [mediaItems, setMediaItems] = React.useState<ApprovalPost['mediaItems']>([]);
  const [isSavingPost, setIsSavingPost] = React.useState(false);
  const [isDeletingPostId, setIsDeletingPostId] = React.useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = React.useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = React.useState(0);
  const [mediaUploadStatus, setMediaUploadStatus] = React.useState('');

  const [isCalendarLinkModalOpen, setIsCalendarLinkModalOpen] = React.useState(false);
  const [calendarLinkApprovalId, setCalendarLinkApprovalId] = React.useState<string | null>(null);
  const [calendarLinkDate, setCalendarLinkDate] = React.useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [calendarLinkStatus, setCalendarLinkStatus] = React.useState('Planned');
  const [isLinkingToCalendar, setIsLinkingToCalendar] = React.useState(false);
  const [copiedLinkForId, setCopiedLinkForId] = React.useState<string | null>(null);
  const [consumedRequestedApprovalId, setConsumedRequestedApprovalId] = React.useState<
    string | null
  >(null);

  const mediaInputRef = React.useRef<HTMLInputElement>(null);

  const selectedPreviewItem = React.useMemo(
    () => items.find((item) => item.id === selectedPreviewPostId) ?? null,
    [items, selectedPreviewPostId]
  );

  const resetForm = React.useCallback(() => {
    setEditingPostId(null);
    setPostTitle('');
    setPostCaption('');
    setPostPlatform('Instagram');
    setContentType('static');
    setMediaItems([]);
    setMediaUploadProgress(0);
    setMediaUploadStatus('');
  }, []);

  const loadItems = React.useCallback(async () => {
    if (!activeProfile?.id) {
      setItems([]);
      setPreviewComments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const approvalPosts = await approvalService.listApprovalPosts(activeProfile.id);
      const calendarPostIds = Array.from(
        new Set(
          approvalPosts
            .map((post) => post.calendarPostId)
            .filter((postId): postId is string => Boolean(postId))
        )
      );

      const [calendarRowsResult, feedbackRowsResult] = await Promise.all([
        supabase && calendarPostIds.length > 0
          ? supabase
              .from('editorial_calendar')
              .select('id, title, scheduled_date, status')
              .in('id', calendarPostIds)
          : Promise.resolve({ data: [] as LinkedCalendarRow[], error: null }),
        supabase && approvalPosts.length > 0
          ? supabase.from('approval_feedback').select('post_id').in(
              'post_id',
              approvalPosts.map((post) => post.id)
            )
          : Promise.resolve({
              data: [] as Array<{ post_id: string }>,
              error: null,
            }),
      ]);

      if (calendarRowsResult.error) throw calendarRowsResult.error;
      if (feedbackRowsResult.error) throw feedbackRowsResult.error;

      const calendarRowsById = ((calendarRowsResult.data ?? []) as LinkedCalendarRow[]).reduce<
        Record<string, LinkedCalendarRow>
      >((accumulator, row) => {
        accumulator[row.id] = row;
        return accumulator;
      }, {});

      const feedbackCountByPostId = ((feedbackRowsResult.data ?? []) as Array<{ post_id: string }>).reduce<
        Record<string, number>
      >((accumulator, row) => {
        accumulator[row.post_id] = (accumulator[row.post_id] ?? 0) + 1;
        return accumulator;
      }, {});

      setItems(
        approvalPosts.map((post) => ({
          ...post,
          feedbackCount: feedbackCountByPostId[post.id] ?? 0,
          linkedCalendarPost: post.calendarPostId
            ? {
                id: post.calendarPostId,
                title: calendarRowsById[post.calendarPostId]?.title || 'Post do calendário',
                scheduledDate:
                  calendarRowsById[post.calendarPostId]?.scheduled_date || post.updatedAt,
                status: calendarRowsById[post.calendarPostId]?.status || 'Planned',
              }
            : undefined,
        }))
      );
    } catch (error: any) {
      console.error('[SingleApprovalModule] Failed to load approval posts:', error);
      setItems([]);
      setErrorMessage(error?.message || 'Não foi possível carregar as aprovações individuais.');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile?.id]);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  React.useEffect(() => {
    if (!selectedPreviewItem) {
      setPreviewComments([]);
      return;
    }

    void approvalService
      .listApprovalFeedback(selectedPreviewItem.id)
      .then((comments) => setPreviewComments(comments))
      .catch((error) => {
        console.error('[SingleApprovalModule] Failed to load approval feedback:', error);
        setPreviewComments([]);
      });
  }, [selectedPreviewItem]);

  React.useEffect(() => {
    if (!requestedApprovalId || requestedApprovalId === consumedRequestedApprovalId) {
      return;
    }

    const requestedItem = items.find((item) => item.id === requestedApprovalId);
    if (!requestedItem) return;

    setSelectedPreviewPostId(requestedItem.id);
    setConsumedRequestedApprovalId(requestedApprovalId);
    onApprovalRequestConsumed?.();
  }, [consumedRequestedApprovalId, items, onApprovalRequestConsumed, requestedApprovalId]);

  React.useEffect(() => {
    if (contentType === 'carousel') return;
    if ((mediaItems?.length || 0) <= 1) return;

    setMediaItems((previous) => previous?.slice(0, 1) || []);
  }, [contentType, mediaItems]);

  const openAddModal = () => {
    resetForm();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (post: ApprovalPost) => {
    setEditingPostId(post.id);
    setPostTitle(post.title);
    setPostCaption(post.caption || '');
    setPostPlatform(post.platform || 'Instagram');
    setContentType(post.contentType || 'static');
    setMediaItems(post.mediaItems || []);
    setMediaUploadProgress(0);
    setMediaUploadStatus('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (!activeProfile?.id) {
      setErrorMessage('Selecione um perfil antes de anexar mídias.');
      return;
    }

    setIsUploadingMedia(true);
    setMediaUploadProgress(2);
    setMediaUploadStatus('Preparando arquivos...');
    setErrorMessage(null);

    try {
      const uploadedItems = await uploadCalendarMediaFiles({
        profileId: activeProfile.id,
        files,
        contentType,
        existingItemsCount: mediaItems?.length || 0,
        onProgress: (progress, status) => {
          setMediaUploadProgress(progress);
          setMediaUploadStatus(status);
        },
      });

      const shouldAutoSwitchToVideoMockup =
        uploadedItems[0]?.type === 'video' && contentType === 'static';
      const shouldAutoSwitchToCarousel =
        uploadedItems.length > 1 && contentType !== 'carousel';

      if (shouldAutoSwitchToCarousel) {
        setContentType('carousel');
      } else if (shouldAutoSwitchToVideoMockup) {
        setContentType(postPlatform === 'YouTube' ? 'horizontal_video' : 'vertical_video');
      }

      setMediaItems((previous) =>
        contentType === 'carousel' ? [...(previous || []), ...uploadedItems] : uploadedItems
      );
      setMediaUploadProgress(100);
      setMediaUploadStatus('Mídia pronta para aprovação.');
    } catch (error: any) {
      console.error('[SingleApprovalModule] Failed to upload approval media:', error);
      setErrorMessage(error?.message || 'Não foi possível enviar a mídia selecionada.');
      setMediaUploadProgress(0);
      setMediaUploadStatus('');
    } finally {
      setIsUploadingMedia(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  };

  const handleRemoveMediaItem = (itemId?: string) => {
    setMediaItems((previous) => previous?.filter((item) => item.id !== itemId) || []);
  };

  const handleSavePost = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!postTitle.trim()) {
      setErrorMessage('O título é obrigatório.');
      return;
    }

    if (!activeProfile?.id) {
      setErrorMessage('Selecione um perfil antes de criar a aprovação.');
      return;
    }

    setIsSavingPost(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const existingPost = items.find((item) => item.id === editingPostId) ?? null;
    const payload: Partial<ApprovalPost> = {
      title: postTitle.trim(),
      caption: postCaption.trim(),
      platform: postPlatform,
      contentType,
      status: existingPost?.status || 'pending',
      mediaItems: mediaItems || [],
      thumbnail:
        mediaItems?.[0]?.persistedPreview || mediaItems?.[0]?.previewUrl || existingPost?.thumbnail || '',
      profileName: activeProfile.name,
      profileAvatarUrl: activeProfile.avatar_url,
      calendarPostId: existingPost?.calendarPostId,
    };

    try {
      const savedPost = editingPostId
        ? await approvalService.updateApprovalPost(editingPostId, payload, activeProfile.id)
        : await approvalService.createApprovalPost(payload, activeProfile.id);

      const mergedPost: ApprovalPost = {
        ...savedPost,
        feedbackCount: existingPost?.feedbackCount ?? 0,
        linkedCalendarPost: existingPost?.linkedCalendarPost,
      };

      setItems((previous) => {
        const nextItems = editingPostId
          ? previous.map((item) => (item.id === editingPostId ? mergedPost : item))
          : [mergedPost, ...previous];

        return [...nextItems].sort(
          (first, second) =>
            new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
        );
      });

      setIsModalOpen(false);
      resetForm();
      setSuccessMessage(
        editingPostId
          ? 'Aprovação individual atualizada com sucesso.'
          : 'Aprovação individual criada com sucesso.'
      );
    } catch (error: any) {
      console.error('[SingleApprovalModule] Failed to save approval post:', error);
      setErrorMessage(error?.message || 'Não foi possível salvar a aprovação.');
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleDeletePost = async (post: ApprovalPost) => {
    if (!activeProfile?.id) return;

    setIsDeletingPostId(post.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await approvalService.deleteApprovalPost(post.id, activeProfile.id);
      setItems((previous) => previous.filter((item) => item.id !== post.id));

      if (selectedPreviewPostId === post.id) {
        setSelectedPreviewPostId(null);
        setPreviewComments([]);
      }

      if (editingPostId === post.id) {
        setIsModalOpen(false);
        resetForm();
      }

      setSuccessMessage('Aprovação individual excluída com sucesso.');
    } catch (error: any) {
      console.error('[SingleApprovalModule] Failed to delete approval post:', error);
      setErrorMessage(error?.message || 'Não foi possível excluir esta aprovação.');
    } finally {
      setIsDeletingPostId(null);
    }
  };

  const handleCopyPublicLink = async (post: ApprovalPost) => {
    if (!post.publicToken) return;

    try {
      await navigator.clipboard.writeText(approvalService.buildPublicLink(post.publicToken));
      setCopiedLinkForId(post.id);
      setSuccessMessage('Link público copiado para a área de transferência.');
      window.setTimeout(() => setCopiedLinkForId((current) => (current === post.id ? null : current)), 2500);
    } catch (error) {
      console.error('[SingleApprovalModule] Failed to copy approval link:', error);
      setErrorMessage('Não foi possível copiar o link público automaticamente.');
    }
  };

  const openCalendarLinkModal = (post: ApprovalPost) => {
    setCalendarLinkApprovalId(post.id);
    setCalendarLinkDate(
      post.linkedCalendarPost?.scheduledDate
        ? format(new Date(post.linkedCalendarPost.scheduledDate), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd')
    );
    setCalendarLinkStatus(post.linkedCalendarPost?.status || 'Planned');
    setIsCalendarLinkModalOpen(true);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleAddToCalendar = async () => {
    if (!calendarLinkApprovalId) return;

    if (!supabase || !user?.id || !activeProfile?.id) {
      setErrorMessage('Não foi possível acessar o calendário deste perfil agora.');
      return;
    }

    const approvalPost = items.find((item) => item.id === calendarLinkApprovalId);
    if (!approvalPost) {
      setErrorMessage('A aprovação selecionada não foi encontrada.');
      return;
    }

    setIsLinkingToCalendar(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let initialKanbanColumnId: string | null = null;

      try {
        const kanbanColumns = await kanbanColumnsService.ensureDefaultColumns(activeProfile.id);
        initialKanbanColumnId = kanbanColumns[0]?.id ?? null;
      } catch (kanbanColumnError) {
        console.warn(
          '[SingleApprovalModule] Could not prepare Kanban columns for linked calendar post:',
          kanbanColumnError
        );
      }

      const scheduledDateIso = new Date(`${calendarLinkDate}T12:00:00`).toISOString();
      const { data, error } = await supabase
        .from('editorial_calendar')
        .insert([
          {
            user_id: user.id,
            profile_id: activeProfile.id,
            title: approvalPost.title,
            description: null,
            caption: approvalPost.caption || null,
            scheduled_date: scheduledDateIso,
            platform: approvalPost.platform,
            content_type: approvalPost.contentType,
            thumbnail_url:
              approvalPost.mediaItems?.[0]?.persistedPreview ||
              approvalPost.mediaItems?.[0]?.previewUrl ||
              approvalPost.thumbnail ||
              null,
            media_urls: approvalPost.mediaItems || [],
            status: calendarLinkStatus,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            ...(initialKanbanColumnId ? { kanban_column_id: initialKanbanColumnId } : {}),
          },
        ])
        .select('id, title, scheduled_date, status')
        .single();

      if (error) throw error;

      const linkedCalendarPost = data as LinkedCalendarRow;
      const updatedApproval = await approvalService.updateApprovalPost(
        approvalPost.id,
        { calendarPostId: linkedCalendarPost.id },
        activeProfile.id
      );

      setItems((previous) =>
        previous.map((item) =>
          item.id === approvalPost.id
            ? {
                ...updatedApproval,
                feedbackCount: item.feedbackCount,
                linkedCalendarPost: {
                  id: linkedCalendarPost.id,
                  title: linkedCalendarPost.title,
                  scheduledDate: linkedCalendarPost.scheduled_date,
                  status: linkedCalendarPost.status,
                },
              }
            : item
        )
      );

      setIsCalendarLinkModalOpen(false);
      setCalendarLinkApprovalId(null);
      setSuccessMessage('Post adicionado ao calendário e vinculado à aprovação.');
    } catch (error: any) {
      console.error('[SingleApprovalModule] Failed to add approval post to calendar:', error);
      setErrorMessage(
        error?.message || 'Não foi possível adicionar este post ao calendário agora.'
      );
    } finally {
      setIsLinkingToCalendar(false);
    }
  };

  const handleOpenCalendarPost = (calendarPostId: string) => {
    navigate(`/workspace/calendar?postId=${calendarPostId}`);
  };

  const handleStatusChange = async (
    status: 'approved' | 'changes_requested' | 'rejected',
    comment: string
  ) => {
    if (!selectedPreviewItem || !activeProfile?.id) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await approvalService.updateApprovalStatus(
        selectedPreviewItem.id,
        status,
        activeProfile.id
      );

      let nextComments = [...previewComments];

      if (comment.trim()) {
        const createdComment = await approvalService.addApprovalFeedback(
          {
            approvalItemId: selectedPreviewItem.id,
            authorType: 'internal',
            authorName: user?.name || 'Equipe',
            content: comment.trim(),
          },
          {
            profileId: activeProfile.id,
            userId: user?.id,
            status,
          }
        );

        nextComments = [...nextComments, createdComment];
        setPreviewComments(nextComments);
      }

      setItems((previous) =>
        previous.map((item) =>
          item.id === selectedPreviewItem.id
            ? {
                ...item,
                status,
                updatedAt: new Date().toISOString(),
                feedbackCount: nextComments.length,
              }
            : item
        )
      );

      setSuccessMessage('Status da aprovação atualizado com sucesso.');
    } catch (error: any) {
      console.error('[SingleApprovalModule] Failed to update approval status:', error);
      setErrorMessage(error?.message || 'Não foi possível atualizar o status da aprovação.');
    }
  };

  const handleCommentSubmit = async (comment: string) => {
    if (!selectedPreviewItem || !activeProfile?.id || !comment.trim()) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const createdComment = await approvalService.addApprovalFeedback(
        {
          approvalItemId: selectedPreviewItem.id,
          authorType: 'internal',
          authorName: user?.name || 'Equipe',
          content: comment.trim(),
        },
        {
          profileId: activeProfile.id,
          userId: user?.id,
        }
      );

      const nextComments = [...previewComments, createdComment];
      setPreviewComments(nextComments);
      setItems((previous) =>
        previous.map((item) =>
          item.id === selectedPreviewItem.id
            ? {
                ...item,
                updatedAt: new Date().toISOString(),
                feedbackCount: nextComments.length,
              }
            : item
        )
      );

      setSuccessMessage('Comentário interno adicionado com sucesso.');
    } catch (error: any) {
      console.error('[SingleApprovalModule] Failed to add internal comment:', error);
      setErrorMessage(error?.message || 'Não foi possível enviar o comentário.');
    }
  };

  const linkedItemsCount = items.filter((item) => item.calendarPostId).length;
  const pendingCount = items.filter((item) => item.status === 'pending').length;

  if (selectedPreviewItem) {
    return (
      <InternalPreview
        post={selectedPreviewItem}
        comments={previewComments}
        onBack={() => setSelectedPreviewPostId(null)}
        onStatusChange={handleStatusChange}
        onCommentSubmit={handleCommentSubmit}
        backLabel="Voltar para Aprovações Individuais"
        heading="Aprovação Individual"
        previewHint="Esta é a prévia interna do link público individual enviado para aprovação."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Aprovações Individuais</h1>
          <p className="text-sm text-text-secondary">
            Crie posts avulsos para aprovação e vincule ao calendário quando fizer sentido.
          </p>
        </div>

        <div className="flex gap-3">
          <Button className="gap-2" onClick={openAddModal}>
            <Plus className="h-4 w-4" />
            Nova aprovação
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50 text-red-700">{errorMessage}</Card>
      ) : null}

      {successMessage ? (
        <Card className="border-green-200 bg-green-50 text-green-700">{successMessage}</Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-slate-50/80">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Total
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{items.length}</p>
          <p className="mt-1 text-sm text-slate-500">Posts únicos criados no módulo de aprovação.</p>
        </Card>
        <Card className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Pendentes
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{pendingCount}</p>
          <p className="mt-1 text-sm text-slate-500">Aguardando retorno do cliente ou da equipe.</p>
        </Card>
        <Card className="border-brand/20 bg-brand/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand/70">
            Ligados ao calendário
          </p>
          <p className="mt-3 text-3xl font-bold text-brand">{linkedItemsCount}</p>
          <p className="mt-1 text-sm text-slate-600">Já possuem um post relacionado no calendário editorial.</p>
        </Card>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-text-secondary">
          Carregando aprovações individuais...
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-lg font-bold text-text-primary">Nenhuma aprovação individual ainda</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Crie um post avulso aqui e depois decida se ele também precisa entrar no calendário.
          </p>
          <div className="mt-5 flex justify-center">
            <Button className="gap-2" onClick={openAddModal}>
              <Plus className="h-4 w-4" />
              Criar primeira aprovação
            </Button>
          </div>
        </Card>
      ) : (
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}
        >
          {items.map((item) => {
            const ContentTypeIcon = getContentTypeIcon(item.contentType);
            const publicLink = item.publicToken
              ? approvalService.buildPublicLink(item.publicToken)
              : null;

            return (
              <Card
                key={item.id}
                padding="none"
                className="group flex flex-col overflow-hidden"
              >
                <button
                  type="button"
                  className="relative aspect-[4/5] overflow-hidden bg-slate-100 text-left"
                  onClick={() => setSelectedPreviewPostId(item.id)}
                >
                  {renderCardCover(item)}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <Badge
                      variant={getApprovalStatusBadgeVariant(item.status)}
                      className="shadow-sm"
                    >
                      {getApprovalStatusLabel(item.status)}
                    </Badge>
                    {item.calendarPostId ? (
                      <Badge variant="brand" className="shadow-sm">
                        Ligado ao calendário
                      </Badge>
                    ) : (
                      <Badge variant="info" className="shadow-sm">
                        Avulso
                      </Badge>
                    )}
                  </div>
                </button>

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 font-bold text-text-primary">{item.title}</h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        Atualizado em {formatDateTime(item.updatedAt)}
                      </p>
                    </div>

                    <Dropdown
                      trigger={
                        <button className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-text-primary">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      }
                    >
                      <DropdownItem onClick={() => setSelectedPreviewPostId(item.id)}>
                        <Eye className="h-4 w-4" />
                        Abrir preview
                      </DropdownItem>
                      <DropdownItem onClick={() => openEditModal(item)}>
                        <Plus className="h-4 w-4" />
                        Editar aprovação
                      </DropdownItem>
                      {publicLink ? (
                        <DropdownItem onClick={() => void handleCopyPublicLink(item)}>
                          <Copy className="h-4 w-4" />
                          {copiedLinkForId === item.id ? 'Link copiado' : 'Copiar link público'}
                        </DropdownItem>
                      ) : null}
                      {publicLink ? (
                        <DropdownItem onClick={() => window.open(publicLink, '_blank', 'noopener,noreferrer')}>
                          <ExternalLink className="h-4 w-4" />
                          Abrir link público
                        </DropdownItem>
                      ) : null}
                      {item.calendarPostId ? (
                        <DropdownItem onClick={() => handleOpenCalendarPost(item.calendarPostId!)}>
                          <CalendarDays className="h-4 w-4" />
                          Abrir no calendário
                        </DropdownItem>
                      ) : (
                        <DropdownItem onClick={() => openCalendarLinkModal(item)}>
                          <Link2 className="h-4 w-4" />
                          Adicionar ao calendário
                        </DropdownItem>
                      )}
                      <DropdownItem
                        onClick={() => void handleDeletePost(item)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </DropdownItem>
                    </Dropdown>
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    <div className="flex items-center gap-1">
                      {item.platform === 'Instagram' && <ImageIcon className="h-3.5 w-3.5" />}
                      {item.platform === 'TikTok' && <Video className="h-3.5 w-3.5" />}
                      {item.platform === 'YouTube' && <Youtube className="h-3.5 w-3.5" />}
                      <span>{item.platform}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ContentTypeIcon className="h-3.5 w-3.5" />
                      <span>{getContentTypeLabel(item.contentType)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{item.feedbackCount} comentário(s)</span>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl bg-slate-50/90 p-4">
                    {item.linkedCalendarPost ? (
                      <>
                        <p className="text-sm font-medium text-text-primary">
                          Vinculado ao calendário
                        </p>
                        <p className="text-sm text-text-secondary">
                          {item.linkedCalendarPost.title} em{' '}
                          {formatCalendarDate(item.linkedCalendarPost.scheduledDate)}
                        </p>
                        <Badge variant="brand">{item.linkedCalendarPost.status}</Badge>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-text-primary">
                          Ainda não entrou no calendário
                        </p>
                        <p className="text-sm text-text-secondary">
                          Use o vínculo opcional para transformar esta aprovação avulsa em um item do calendário editorial.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => setSelectedPreviewPostId(item.id)}
                    >
                      <Eye className="h-4 w-4" />
                      Abrir preview
                    </Button>
                    {item.calendarPostId ? (
                      <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={() => handleOpenCalendarPost(item.calendarPostId!)}
                      >
                        <CalendarDays className="h-4 w-4" />
                        Abrir calendário
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={() => openCalendarLinkModal(item)}
                      >
                        <Link2 className="h-4 w-4" />
                        Adicionar ao calendário
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPostId ? 'Editar Aprovação Individual' : 'Nova Aprovação Individual'}
        className="max-w-4xl"
      >
        <form onSubmit={handleSavePost} className="space-y-4">
          <Input
            label="Título"
            placeholder="Sobre o que é este conteúdo?"
            value={postTitle}
            onChange={(event) => setPostTitle(event.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Legenda / Caption</label>
            <textarea
              className="min-h-[120px] w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="Texto usado no preview público e no mockup da aprovação..."
              value={postCaption}
              onChange={(event) => setPostCaption(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Plataforma</label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                value={postPlatform}
                onChange={(event) =>
                  setPostPlatform(event.target.value as 'Instagram' | 'TikTok' | 'YouTube')
                }
              >
                {APPROVAL_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Formato do conteúdo</label>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { id: 'static', label: 'Imagem', icon: ImageIcon },
                  { id: 'carousel', label: 'Carrossel', icon: Layers },
                  { id: 'vertical_video', label: 'Vídeo vertical', icon: Play },
                  { id: 'horizontal_video', label: 'Vídeo horizontal', icon: Play },
                ].map((option) => {
                  const OptionIcon = option.icon;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setContentType(option.id as ApprovalContentType)}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                        contentType === option.id
                          ? 'border-brand bg-brand/5 text-brand'
                          : 'border-gray-200 bg-white text-text-secondary hover:border-brand/40'
                      )}
                    >
                      <OptionIcon className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {editingPostId ? (
            items.find((item) => item.id === editingPostId)?.linkedCalendarPost ? (
              <Card className="border-brand/15 bg-brand/5">
                <p className="text-sm font-semibold text-text-primary">Vínculo com calendário</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Este post já está ligado a{' '}
                  <span className="font-medium">
                    {items.find((item) => item.id === editingPostId)?.linkedCalendarPost?.title}
                  </span>{' '}
                  em{' '}
                  {formatCalendarDate(
                    items.find((item) => item.id === editingPostId)?.linkedCalendarPost
                      ?.scheduledDate || new Date().toISOString()
                  )}
                  .
                </p>
              </Card>
            ) : (
              <Card className="border-slate-200 bg-slate-50/80">
                <p className="text-sm font-semibold text-text-primary">Vínculo opcional</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Depois de salvar, você poderá adicionar esta aprovação a um dia do calendário com um clique.
                </p>
              </Card>
            )
          ) : (
            <Card className="border-slate-200 bg-slate-50/80">
              <p className="text-sm font-semibold text-text-primary">Vínculo opcional</p>
              <p className="mt-1 text-sm text-text-secondary">
                Crie a aprovação primeiro. Em seguida você poderá adicioná-la ao calendário sem perder o link público individual.
              </p>
            </Card>
          )}

          <Card className="space-y-4 border-slate-200 bg-slate-50/70">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Mídia do preview</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Os arquivos anexados aqui alimentam o mockup público individual.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple={contentType === 'carousel'}
                  className="hidden"
                  onChange={(event) => void handleMediaUpload(event)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  onClick={() => mediaInputRef.current?.click()}
                  isLoading={isUploadingMedia}
                >
                  <Plus className="h-4 w-4" />
                  {mediaItems && mediaItems.length > 0 ? 'Adicionar mídia' : 'Anexar mídia'}
                </Button>
              </div>
            </div>

            {mediaUploadStatus ? (
              <div className="rounded-2xl border border-brand/10 bg-white p-3">
                <div className="flex items-center justify-between gap-3 text-sm text-text-primary">
                  <span>{mediaUploadStatus}</span>
                  <span className="font-semibold text-brand">{mediaUploadProgress}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-brand transition-all"
                    style={{ width: `${mediaUploadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}

            {mediaItems && mediaItems.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {mediaItems.map((item, index) => {
                  const ContentIcon = item.type === 'video' ? Play : ImageIcon;
                  const previewUrl = item.persistedPreview || item.previewUrl;

                  return (
                    <div
                      key={item.id || index}
                      className="overflow-hidden rounded-[20px] border border-slate-200 bg-white"
                    >
                      <div className="relative aspect-[4/3] bg-slate-100">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={item.fileName}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <ContentIcon className="h-8 w-8" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMediaItem(item.id)}
                          className="absolute right-2 top-2 rounded-full bg-slate-950/75 p-1.5 text-white transition-colors hover:bg-slate-950"
                          aria-label={`Remover ${item.fileName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {item.fileName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.type === 'video' ? 'Vídeo' : 'Imagem'} • {index + 1}
                          </p>
                        </div>
                        <ContentIcon className="h-4 w-4 shrink-0 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                Nenhuma mídia anexada ainda. Sem isso, a aprovação exibirá apenas o contexto textual do post.
              </div>
            )}
          </Card>

          <div className="flex justify-between gap-3 pt-2">
            {editingPostId ? (
              <Button
                type="button"
                variant="secondary"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                isLoading={isDeletingPostId === editingPostId}
                onClick={() => {
                  const currentPost = items.find((item) => item.id === editingPostId);
                  if (currentPost) {
                    void handleDeletePost(currentPost);
                  }
                }}
              >
                Excluir
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSavingPost}>
                {editingPostId ? 'Salvar alterações' : 'Criar aprovação'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCalendarLinkModalOpen}
        onClose={() => setIsCalendarLinkModalOpen(false)}
        title="Adicionar ao Calendário"
        className="max-w-xl"
      >
        <div className="space-y-4">
          <Card className="border-slate-200 bg-slate-50/80">
            <p className="text-sm font-semibold text-text-primary">
              Crie um item no calendário a partir desta aprovação
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              O link público individual continua o mesmo. Aqui estamos apenas criando o vínculo com um dia do calendário editorial.
            </p>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Data do calendário</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                value={calendarLinkDate}
                onChange={(event) => setCalendarLinkDate(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Status inicial</label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                value={calendarLinkStatus}
                onChange={(event) => setCalendarLinkStatus(event.target.value)}
              >
                <option value="Draft">Rascunho</option>
                <option value="Planned">Planejado</option>
                <option value="Review">Revisão</option>
                <option value="Published">Publicado</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsCalendarLinkModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" className="gap-2" isLoading={isLinkingToCalendar} onClick={() => void handleAddToCalendar()}>
              <CalendarDays className="h-4 w-4" />
              Criar no calendário
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
