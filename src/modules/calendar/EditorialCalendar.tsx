import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Filter,
  Image as ImageIcon,
  Layers,
  Link2,
  MonitorPlay,
  Play,
  X,
} from 'lucide-react';
import {
  addDays,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { Card } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { Tabs } from '../../shared/components/Tabs';
import { useProfile } from '../../app/context/ProfileContext';
import { useAuth } from '../../app/context/AuthContext';
import { supabase } from '../../shared/utils/supabase';
import { useTrialGuidedFlow } from '../onboarding/hooks/useTrialGuidedFlow';
import { useWorkspaceMembers } from '../../hooks/useWorkspaceMembers';
import { MemberAssignmentField } from '../../shared/components/MemberAssignmentField';
import { TaskCommentsPanel } from '../../shared/components/TaskCommentsPanel';
import { workspaceCollaborationService } from '../../services/workspace-collaboration.service';
import type { WorkspaceTaskAssignment } from '../../shared/constants/workspaceCollaboration';
import { kanbanColumnsService } from '../../services/kanban-columns.service';
import { useIsMobile } from '../mobile/hooks/useIsMobile';
import {
  readWorkspaceNotificationParams,
  withoutWorkspaceNotificationParams,
} from '../../shared/constants/workspaceNotifications';
import { cn } from '../../shared/utils/cn';
import {
  getApprovalStatusBadgeVariant,
  getApprovalStatusLabel,
  type ApprovalContentType,
  type ApprovalStatus,
  type MediaState,
} from '../approval/approval.types';
import { uploadCalendarMediaFiles } from './calendarMediaUpload';
import {
  calendarApprovalService,
  getCalendarApprovalSchemaMessage,
  isMissingCalendarApprovalSchemaError,
} from './services/calendarApprovalService';
import {
  APPROVAL_PLATFORMS,
  mapCalendarRowToApprovalPost,
  type EditorialCalendarApprovalRow,
  type LatestCalendarApprovalStatus,
} from './calendarApproval.types';

interface CalendarPost {
  id: string;
  user_id: string;
  profile_id: string | null;
  title: string;
  description: string | null;
  caption: string | null;
  scheduledDate: Date;
  platform: 'Instagram' | 'TikTok' | 'YouTube';
  contentType: ApprovalContentType;
  thumbnail: string;
  mediaItems: MediaState[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
  latestApprovalStatus?: ApprovalStatus;
  latestApprovalUpdatedAt?: string;
}

function mapRowToPost(
  row: EditorialCalendarApprovalRow,
  latestApproval?: LatestCalendarApprovalStatus
): CalendarPost {
  const previewPost = mapCalendarRowToApprovalPost(row, {
    status: latestApproval?.status || 'pending',
  });

  return {
    id: row.id,
    user_id: row.user_id,
    profile_id: row.profile_id,
    title: row.title,
    description: row.description ?? '',
    caption: row.caption ?? '',
    scheduledDate: new Date(row.scheduled_date),
    platform: previewPost.platform,
    contentType: previewPost.contentType,
    thumbnail: previewPost.thumbnail,
    mediaItems: previewPost.mediaItems || [],
    status: row.status ?? 'Planned',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    latestApprovalStatus: latestApproval?.status,
    latestApprovalUpdatedAt: latestApproval?.updatedAt,
  };
}

const MOBILE_POSTS_PREVIEW_LIMIT = 3;
const CALENDAR_WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

function getStatusDotClass(status: string) {
  if (status === 'Published') return 'bg-green-500';
  if (status === 'Review') return 'bg-yellow-500';
  return 'bg-brand';
}

function getMobilePostPillClass(status: string) {
  if (status === 'Published') return 'bg-green-500 text-white';
  if (status === 'Review') return 'bg-yellow-400 text-slate-900';
  return 'bg-brand text-white';
}

function getContentTypeLabel(contentType: ApprovalContentType) {
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
}

function getContentTypeIcon(contentType: ApprovalContentType) {
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
}

export const EditorialCalendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProfile } = useProfile();
  const { user } = useAuth();
  const { activeMembers } = useWorkspaceMembers();
  const isMobile = useIsMobile();
  const guidedFlow = useTrialGuidedFlow();

  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [posts, setPosts] = React.useState<CalendarPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPostId, setEditingPostId] = React.useState<string | null>(null);
  const [newPostTitle, setNewPostTitle] = React.useState('');
  const [newPostDescription, setNewPostDescription] = React.useState('');
  const [newPostCaption, setNewPostCaption] = React.useState('');
  const [newPostDate, setNewPostDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [newPostPlatform, setNewPostPlatform] = React.useState<'Instagram' | 'TikTok' | 'YouTube'>('Instagram');
  const [newContentType, setNewContentType] = React.useState<ApprovalContentType>('static');
  const [newMediaItems, setNewMediaItems] = React.useState<MediaState[]>([]);
  const [newPostStatus, setNewPostStatus] = React.useState('Planned');
  const [isSavingPost, setIsSavingPost] = React.useState(false);
  const [isDeletingPost, setIsDeletingPost] = React.useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = React.useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = React.useState(0);
  const [mediaUploadStatus, setMediaUploadStatus] = React.useState('');
  const [linkedMemberIds, setLinkedMemberIds] = React.useState<string[]>([]);
  const [taskAssignments, setTaskAssignments] = React.useState<WorkspaceTaskAssignment[]>([]);
  const [modalTab, setModalTab] = React.useState<'details' | 'comments'>('details');
  const [latestApprovalStatuses, setLatestApprovalStatuses] = React.useState<
    Record<string, LatestCalendarApprovalStatus>
  >({});
  const [isApprovalRequestModalOpen, setIsApprovalRequestModalOpen] = React.useState(false);
  const [approvalStartDate, setApprovalStartDate] = React.useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [approvalEndDate, setApprovalEndDate] = React.useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [approvalValidityPreset, setApprovalValidityPreset] = React.useState<'3' | '7' | '15' | 'custom'>('7');
  const [customApprovalExpiryDate, setCustomApprovalExpiryDate] = React.useState(
    format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm")
  );
  const [isGeneratingApprovalLink, setIsGeneratingApprovalLink] = React.useState(false);
  const [generatedApprovalLink, setGeneratedApprovalLink] = React.useState<string | null>(null);
  const [isLinkCopied, setIsLinkCopied] = React.useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });
  const assignmentCountByPostId = taskAssignments.reduce<Record<string, number>>((accumulator, assignment) => {
    if (assignment.entityType !== 'editorial_calendar') {
      return accumulator;
    }

    accumulator[assignment.entityId] = (accumulator[assignment.entityId] ?? 0) + 1;
    return accumulator;
  }, {});
  const mediaInputRef = React.useRef<HTMLInputElement>(null);
  const approvalRangePosts = React.useMemo(() => {
    if (!approvalStartDate || !approvalEndDate) return [];

    return posts.filter((post) => {
      const postDateKey = format(post.scheduledDate, 'yyyy-MM-dd');
      return postDateKey >= approvalStartDate && postDateKey <= approvalEndDate;
    });
  }, [approvalEndDate, approvalStartDate, posts]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const resetModalForm = React.useCallback(() => {
    setEditingPostId(null);
    setNewPostTitle('');
    setNewPostDescription('');
    setNewPostCaption('');
    setNewPostPlatform('Instagram');
    setNewContentType('static');
    setNewMediaItems([]);
    setNewPostStatus('Planned');
    setNewPostDate(format(new Date(), 'yyyy-MM-dd'));
    setMediaUploadProgress(0);
    setMediaUploadStatus('');
    setLinkedMemberIds([]);
    setModalTab('details');
  }, []);

  const loadPosts = React.useCallback(async () => {
    if (!supabase || !user?.id) {
      setPosts([]);
      return;
    }

    setIsLoadingPosts(true);
    setErrorMessage(null);

    try {
      const [{ data, error }, assignmentData, approvalStatuses] = await Promise.all([
        supabase
          .from('editorial_calendar')
          .select('*')
          .eq('profile_id', activeProfile?.id)
          .order('scheduled_date', { ascending: true }),
        activeProfile?.id
          ? workspaceCollaborationService.listAssignments(activeProfile.id, 'editorial_calendar')
          : Promise.resolve([]),
        activeProfile?.id
          ? calendarApprovalService
              .listLatestApprovalStatuses(activeProfile.id)
              .catch((calendarApprovalError) => {
                console.warn(
                  '[EditorialCalendar] Could not load latest calendar approval statuses:',
                  calendarApprovalError
                );
                return {};
              })
          : Promise.resolve({}),
      ]);

      if (error) throw error;

      const mappedPosts = ((data ?? []) as EditorialCalendarApprovalRow[]).map((row) =>
        mapRowToPost(row, approvalStatuses[row.id])
      );
      setPosts(mappedPosts);
      setTaskAssignments(assignmentData);
      setLatestApprovalStatuses(approvalStatuses);
    } catch (error) {
      console.error('[EditorialCalendar] Error loading posts:', error);
      setPosts([]);
      setTaskAssignments([]);
      setLatestApprovalStatuses({});
      setErrorMessage('Não foi possível carregar os posts do calendário.');
    } finally {
      setIsLoadingPosts(false);
    }
  }, [user?.id, activeProfile?.id]);

  React.useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  React.useEffect(() => {
    if (newContentType === 'carousel') return;
    if (newMediaItems.length <= 1) return;

    setNewMediaItems((previous) => previous.slice(0, 1));
  }, [newContentType, newMediaItems.length]);

  React.useEffect(() => {
    if (!isApprovalRequestModalOpen) return;

    setGeneratedApprovalLink(null);
    setIsLinkCopied(false);
  }, [
    approvalEndDate,
    approvalStartDate,
    approvalValidityPreset,
    customApprovalExpiryDate,
    isApprovalRequestModalOpen,
  ]);

  const openAddModal = (date?: Date) => {
    resetModalForm();

    if (date) {
      setNewPostDate(format(date, 'yyyy-MM-dd'));
    }

    setIsModalOpen(true);
  };

  const openEditModal = React.useCallback((post: CalendarPost, nextTab: 'details' | 'comments' = 'details') => {
    setEditingPostId(post.id);
    setNewPostTitle(post.title);
    setNewPostDescription(post.description || '');
    setNewPostCaption(post.caption || '');
    setNewPostDate(format(post.scheduledDate, 'yyyy-MM-dd'));
    setNewPostPlatform(post.platform || 'Instagram');
    setNewContentType(post.contentType || 'static');
    setNewMediaItems(post.mediaItems || []);
    setNewPostStatus(post.status);
    setLinkedMemberIds(
      taskAssignments
        .filter((assignment) => assignment.entityType === 'editorial_calendar' && assignment.entityId === post.id)
        .map((assignment) => assignment.memberId)
    );
    setModalTab(nextTab);
    setErrorMessage(null);
    setIsModalOpen(true);
  }, [taskAssignments]);

  React.useEffect(() => {
    const notification = readWorkspaceNotificationParams(searchParams);

    if (notification.entityType !== 'editorial_calendar' || !notification.entityId) {
      return;
    }

    const matchedPost = posts.find((post) => post.id === notification.entityId);
    if (!matchedPost) return;

    setSearchParams(withoutWorkspaceNotificationParams(searchParams));
    openEditModal(matchedPost, notification.tab === 'comments' ? 'comments' : 'details');
  }, [openEditModal, posts, searchParams, setSearchParams]);

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
        contentType: newContentType,
        existingItemsCount: newMediaItems.length,
        onProgress: (progress, status) => {
          setMediaUploadProgress(progress);
          setMediaUploadStatus(status);
        },
      });

      const shouldAutoSwitchToVideoMockup =
        uploadedItems[0]?.type === 'video' &&
        newContentType === 'static';
      const shouldAutoSwitchToCarousel =
        uploadedItems.length > 1 && newContentType !== 'carousel';

      if (shouldAutoSwitchToCarousel) {
        setNewContentType('carousel');
      } else if (shouldAutoSwitchToVideoMockup) {
        setNewContentType(newPostPlatform === 'YouTube' ? 'horizontal_video' : 'vertical_video');
      }

      setNewMediaItems((previous) =>
        newContentType === 'carousel' ? [...previous, ...uploadedItems] : uploadedItems
      );
      setMediaUploadProgress(100);
      setMediaUploadStatus('Mídia pronta para aprovação.');
    } catch (error: any) {
      console.error('[EditorialCalendar] Failed to upload calendar media:', error);
      setErrorMessage(error?.message || 'Não foi possível enviar a mídia selecionada.');
      setMediaUploadProgress(0);
      setMediaUploadStatus('');
    } finally {
      setIsUploadingMedia(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  };

  const handleRemoveMediaItem = (itemId?: string) => {
    setNewMediaItems((previous) => previous.filter((item) => item.id !== itemId));
  };

  const openApprovalRequestModal = () => {
    setApprovalStartDate(format(monthStart, 'yyyy-MM-dd'));
    setApprovalEndDate(format(monthEnd, 'yyyy-MM-dd'));
    setApprovalValidityPreset('7');
    setCustomApprovalExpiryDate(format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"));
    setGeneratedApprovalLink(null);
    setIsLinkCopied(false);
    setIsApprovalRequestModalOpen(true);
  };

  const resolveApprovalExpiryDate = () => {
    if (approvalValidityPreset === 'custom') {
      if (!customApprovalExpiryDate) {
        throw new Error('Defina a data de validade personalizada do link.');
      }

      return new Date(customApprovalExpiryDate).toISOString();
    }

    const daysToAdd = Number(approvalValidityPreset);
    return addDays(new Date(), daysToAdd).toISOString();
  };

  const handleGenerateApprovalLink = async () => {
    if (!activeProfile?.id) {
      setErrorMessage('Selecione um perfil antes de solicitar aprovação.');
      return;
    }

    if (!approvalStartDate || !approvalEndDate) {
      setErrorMessage('Informe a data inicial e final do período.');
      return;
    }

    if (approvalEndDate < approvalStartDate) {
      setErrorMessage('A data final precisa ser maior ou igual à data inicial.');
      return;
    }

    setIsGeneratingApprovalLink(true);
    setErrorMessage(null);

    try {
      const expiresAt = resolveApprovalExpiryDate();
      const result = await calendarApprovalService.createApprovalLink({
        profileId: activeProfile.id,
        startDate: approvalStartDate,
        endDate: approvalEndDate,
        expiresAt,
        profileName: activeProfile.name,
        profileAvatarUrl: activeProfile.avatar_url,
      });

      setGeneratedApprovalLink(result.publicUrl);
      setLatestApprovalStatuses((previous) => {
        const nextStatuses = { ...previous };
        approvalRangePosts.forEach((post) => {
          nextStatuses[post.id] = {
            calendarPostId: post.id,
            approvalLinkId: result.link.id,
            linkStatus: result.link.status,
            status: 'pending',
            updatedAt: new Date().toISOString(),
          };
        });
        return nextStatuses;
      });
      setPosts((previous) =>
        previous.map((post) =>
          format(post.scheduledDate, 'yyyy-MM-dd') >= approvalStartDate &&
          format(post.scheduledDate, 'yyyy-MM-dd') <= approvalEndDate
            ? {
                ...post,
                latestApprovalStatus: 'pending',
                latestApprovalUpdatedAt: new Date().toISOString(),
              }
            : post
        )
      );
    } catch (error: any) {
      console.error('[EditorialCalendar] Failed to generate approval link:', error);
      setErrorMessage(
        isMissingCalendarApprovalSchemaError(error)
          ? getCalendarApprovalSchemaMessage()
          : error?.message || 'Não foi possível gerar o link público de aprovação.'
      );
    } finally {
      setIsGeneratingApprovalLink(false);
    }
  };

  const handleCopyApprovalLink = async () => {
    if (!generatedApprovalLink) return;

    try {
      await navigator.clipboard.writeText(generatedApprovalLink);
      setIsLinkCopied(true);
      window.setTimeout(() => setIsLinkCopied(false), 2500);
    } catch (error) {
      console.error('[EditorialCalendar] Failed to copy approval link:', error);
      setErrorMessage('Não foi possível copiar o link automaticamente.');
    }
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPostTitle.trim()) return;

    if (!supabase) {
      setErrorMessage('Supabase não está configurado.');
      return;
    }

    if (!user?.id) {
      setErrorMessage('Usuário não autenticado.');
      return;
    }

    if (!activeProfile?.id) {
      setErrorMessage('Nenhum perfil ativo selecionado.');
      return;
    }

    setIsSavingPost(true);
    setErrorMessage(null);

    const scheduledDateIso = new Date(`${newPostDate}T12:00:00`).toISOString();

    try {
      let initialKanbanColumnId: string | null = null;

      if (!editingPostId) {
        try {
          const kanbanColumns = await kanbanColumnsService.ensureDefaultColumns(activeProfile.id);
          initialKanbanColumnId = kanbanColumns[0]?.id ?? null;
        } catch (kanbanColumnError) {
          console.warn(
            '[EditorialCalendar] Could not prepare Kanban columns for the new calendar task:',
            kanbanColumnError
          );
        }
      }

      const basePayload = {
        user_id: user.id,
        profile_id: activeProfile.id,
        title: newPostTitle.trim(),
        description: newPostDescription.trim() || null,
        scheduled_date: scheduledDateIso,
        status: newPostStatus,
        updated_at: new Date().toISOString(),
        ...(!editingPostId && initialKanbanColumnId
          ? { kanban_column_id: initialKanbanColumnId }
          : {}),
      };

      const approvalPayload = {
        caption: newPostCaption.trim() || null,
        platform: newPostPlatform,
        content_type: newContentType,
        thumbnail_url:
          newMediaItems[0]?.persistedPreview || newMediaItems[0]?.previewUrl || null,
        media_urls: newMediaItems,
      };

      const payload = {
        ...basePayload,
        ...approvalPayload,
      };

      if (editingPostId) {
        let { data, error } = await supabase
          .from('editorial_calendar')
          .update(payload)
          .eq('id', editingPostId)
          .eq('profile_id', activeProfile.id)
          .select('*')
          .single();

        if (error && isMissingCalendarApprovalSchemaError(error)) {
          ({ data, error } = await supabase
            .from('editorial_calendar')
            .update(basePayload)
            .eq('id', editingPostId)
            .eq('profile_id', activeProfile.id)
            .select('*')
            .single());
        }

        if (error) throw error;

        const updatedPost = mapRowToPost(
          data as EditorialCalendarApprovalRow,
          latestApprovalStatuses[editingPostId]
        );
        await workspaceCollaborationService.setAssignedMembers(
          activeProfile.id,
          'editorial_calendar',
          updatedPost.id,
          linkedMemberIds,
          {
            actorUserId: user?.id,
            actorName: user?.name || 'Equipe',
            members: activeMembers,
            entityTitle: updatedPost.title,
            targetModule: 'calendar',
          }
        );

        setPosts((prev) =>
          prev.map((post) => (post.id === editingPostId ? updatedPost : post))
        );
      } else {
        let { data, error } = await supabase
          .from('editorial_calendar')
          .insert([
            {
              ...payload,
              created_at: new Date().toISOString(),
            },
          ])
          .select('*')
          .single();

        if (error && isMissingCalendarApprovalSchemaError(error)) {
          ({ data, error } = await supabase
            .from('editorial_calendar')
            .insert([
              {
                ...basePayload,
                created_at: new Date().toISOString(),
              },
            ])
            .select('*')
            .single());
        }

        if (error) throw error;

        const createdPost = mapRowToPost(data as EditorialCalendarApprovalRow);
        await workspaceCollaborationService.setAssignedMembers(
          activeProfile.id,
          'editorial_calendar',
          createdPost.id,
          linkedMemberIds,
          {
            actorUserId: user?.id,
            actorName: user?.name || 'Equipe',
            members: activeMembers,
            entityTitle: createdPost.title,
            targetModule: 'calendar',
          }
        );

        setPosts((prev) =>
          [...prev, createdPost].sort(
            (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()
          )
        );
      }

      if (activeProfile?.id) {
        const nextAssignments = await workspaceCollaborationService.listAssignments(
          activeProfile.id,
          'editorial_calendar'
        );
        setTaskAssignments(nextAssignments);
      }

      setIsModalOpen(false);
      resetModalForm();

      if (!editingPostId && guidedFlow.currentTourStepId === 'calendar-save') {
        await guidedFlow.advanceAfterRequiredAction();
      }
    } catch (error: any) {
      console.error('[EditorialCalendar] Error saving post:', error);
      setErrorMessage(error?.message || 'Não foi possível salvar o post.');
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleDeletePost = async () => {
    if (!editingPostId) return;

    if (!supabase || !user?.id) {
      setErrorMessage('Usuário não autenticado.');
      return;
    }

    setIsDeletingPost(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('editorial_calendar')
        .delete()
        .eq('id', editingPostId)
        .eq('profile_id', activeProfile?.id);

      if (error) throw error;

      setPosts((prev) => prev.filter((post) => post.id !== editingPostId));
      setIsModalOpen(false);
      resetModalForm();
    } catch (error: any) {
      console.error('[EditorialCalendar] Error deleting post:', error);
      setErrorMessage(error?.message || 'Não foi possível excluir o post.');
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData('postId', postId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    e.stopPropagation();

    const postId = e.dataTransfer.getData('postId');
    if (!postId) return;

    if (!supabase || !user?.id) {
      setErrorMessage('Usuário não autenticado.');
      return;
    }

    const updatedScheduledDateIso = new Date(
      `${format(targetDate, 'yyyy-MM-dd')}T12:00:00`
    ).toISOString();

    const previousPosts = posts;

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              scheduledDate: new Date(updatedScheduledDateIso),
              updatedAt: new Date(),
            }
          : post
      )
    );

    try {
      const { data, error } = await supabase
        .from('editorial_calendar')
        .update({
          scheduled_date: updatedScheduledDateIso,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('profile_id', activeProfile?.id)
        .select('*')
        .single();

      if (error) throw error;

      const oldPost = previousPosts.find((post) => post.id === postId);
      const updatedPost = mapRowToPost(
        data as EditorialCalendarApprovalRow,
        latestApprovalStatuses[postId]
      );
      updatedPost.platform = oldPost?.platform || 'Instagram';

      setPosts((prev) =>
        prev.map((post) => (post.id === postId ? updatedPost : post))
      );
    } catch (error: any) {
      console.error('[EditorialCalendar] Error moving post:', error);
      setPosts(previousPosts);
      setErrorMessage(error?.message || 'Não foi possível mover o post.');
    }
  };

  return (
    <div className={cn('space-y-8', isMobile && 'space-y-4')}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-brand" />
            Calendário Editorial
          </h1>
          <p className="text-text-secondary">Planeje e visualize sua agenda de conteúdo.</p>
          {activeProfile && (
            <p className="text-sm text-text-secondary mt-1">
              Perfil ativo: <span className="font-medium">{activeProfile.name}</span>
            </p>
          )}
        </div>

        <div className="flex gap-3 md:flex-none">
          <Button variant="secondary" className="hidden gap-2 md:inline-flex">
            <Filter className="h-4 w-4" />
            Filtrar
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={openApprovalRequestModal}
          >
            <Link2 className="h-4 w-4" />
            <span className="hidden md:inline">Solicitar Aprovação</span>
            <span className="md:hidden">Aprovar</span>
          </Button>
          <Button
            className="gap-2"
            onClick={() => openAddModal()}
            data-tour-id="calendar-add-button"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Agendar Post</span>
            <span className="md:hidden">Agendar</span>
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="border-red-200 bg-red-50 text-red-700 p-4">
          {errorMessage}
        </Card>
      )}

      {isMobile ? (
        <div className="-mx-1 overflow-hidden bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-2 py-3">
            <h2 className="text-lg font-bold text-text-primary">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Hoje
              </button>
              <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {isLoadingPosts ? (
            <div className="p-10 text-center text-text-secondary">
              Carregando calendário...
            </div>
          ) : (
            <>
              <div
                className="border-b border-gray-200 bg-gray-50"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
              >
                {CALENDAR_WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gridAutoRows: '112px',
                }}
              >
                {calendarDays.map((day, idx) => {
                  const dayPosts = posts.filter((post) => isSameDay(post.scheduledDate, day));
                  const visiblePosts = dayPosts.slice(0, MOBILE_POSTS_PREVIEW_LIMIT);
                  const remainingPostsCount = dayPosts.length - visiblePosts.length;
                  const isCurrentMonth = isSameMonth(day, monthStart);

                  return (
                    <div
                      key={idx}
                      onClick={() => openAddModal(day)}
                      onDragOver={handleDragOver}
                      onDrop={(event) => void handleDrop(event, day)}
                      className={cn(
                        'h-[112px] border-b border-r border-gray-100 px-1 py-1.5 transition-colors group cursor-pointer hover:bg-gray-50/50',
                        !isCurrentMonth && 'bg-gray-50/30'
                      )}
                    >
                      <div className="mb-1 flex items-start justify-between gap-1">
                        <div
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium',
                            isSameDay(day, new Date())
                              ? 'bg-brand text-white'
                              : isCurrentMonth
                              ? 'text-text-primary'
                              : 'text-gray-300'
                          )}
                        >
                          {format(day, 'd')}
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openAddModal(day);
                          }}
                          className="p-0.5 text-gray-300 transition-colors hover:text-brand"
                          aria-label={`Adicionar post em ${format(day, 'dd/MM')}`}
                        >
                          <Plus className="h-2 w-2" />
                        </button>
                      </div>

                      <div className="space-y-[3px]">
                        {visiblePosts.map((post) => (
                          <button
                            key={post.id}
                            type="button"
                            draggable
                            onDragStart={(event) => handleDragStart(event, post.id)}
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(post);
                            }}
                            className={cn(
                              'flex h-5 w-full items-center gap-1 overflow-hidden rounded-full px-1.5 text-left text-[10px] leading-none active:cursor-grabbing',
                              getMobilePostPillClass(post.status)
                            )}
                            aria-label={`Editar post ${post.title}`}
                          >
                            <CalendarIcon className="h-2.5 w-2.5 shrink-0 opacity-90" />
                            <span className="min-w-0 truncate whitespace-nowrap font-medium">
                              {post.title}
                            </span>
                            {post.latestApprovalStatus ? (
                              <span className="shrink-0 rounded-full bg-white/20 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide">
                                {post.latestApprovalStatus === 'approved'
                                  ? 'OK'
                                  : post.latestApprovalStatus === 'changes_requested'
                                  ? 'Aj'
                                  : post.latestApprovalStatus === 'rejected'
                                  ? 'No'
                                  : 'Pd'}
                              </span>
                            ) : null}
                          </button>
                        ))}

                        {remainingPostsCount > 0 ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openAddModal(day);
                            }}
                            className="block w-full truncate px-1 text-left text-[8px] leading-none font-medium text-text-secondary"
                          >
                            +{remainingPostsCount}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <Card padding="none">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h2 className="text-lg font-bold text-text-primary">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Hoje
              </button>
              <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {isLoadingPosts ? (
            <div className="p-10 text-center text-text-secondary">
              Carregando calendário...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-xs font-bold uppercase tracking-wider text-gray-400"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  const dayPosts = posts.filter((post) => isSameDay(post.scheduledDate, day));
                  const isCurrentMonth = isSameMonth(day, monthStart);

                  return (
                    <div
                      key={idx}
                      onClick={() => openAddModal(day)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => void handleDrop(e, day)}
                      className={cn(
                        'min-h-[120px] border-b border-r border-gray-100 p-2 transition-colors hover:bg-gray-50/50 group cursor-pointer',
                        !isCurrentMonth && 'bg-gray-50/30'
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium',
                            isSameDay(day, new Date())
                              ? 'bg-brand text-white'
                              : isCurrentMonth
                              ? 'text-text-primary'
                              : 'text-gray-300'
                          )}
                        >
                          {format(day, 'd')}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddModal(day);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-brand transition-all"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        {dayPosts.map((post) => (
                          <div
                            key={post.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, post.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(post);
                            }}
                            className="group/post relative rounded border border-gray-100 bg-white p-1.5 shadow-sm transition-all hover:border-brand hover:shadow-md cursor-pointer active:cursor-grabbing"
                          >
                            {post.latestApprovalStatus ? (
                              <Badge
                                variant={getApprovalStatusBadgeVariant(post.latestApprovalStatus)}
                                className="absolute right-1.5 top-1.5 max-w-[72px] truncate px-1.5 py-0 text-[7px] font-semibold"
                              >
                                {getApprovalStatusLabel(post.latestApprovalStatus)}
                              </Badge>
                            ) : null}
                            <p className="truncate text-[10px] font-bold text-text-primary leading-tight">
                              {post.title}
                            </p>

                            <div className="mt-1 flex items-center justify-between gap-1">
                              <span className="truncate text-[8px] text-text-secondary">
                                {post.platform} • {getContentTypeLabel(post.contentType)}
                              </span>
                              <div className="flex items-center gap-1">
                                {assignmentCountByPostId[post.id] ? (
                                  <span className="rounded bg-brand/10 px-1 py-0.5 text-[8px] font-medium text-brand">
                                    {assignmentCountByPostId[post.id]} m
                                  </span>
                                ) : null}
                                <div
                                  className={cn(
                                    'h-1.5 w-1.5 rounded-full',
                                    getStatusDotClass(post.status)
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPostId ? 'Editar Post' : 'Agendar Post'}
        className="max-w-5xl"
      >
        <form onSubmit={(e) => void handleSavePost(e)} className="space-y-4">
          <Tabs
            tabs={[
              { id: 'details', label: 'Detalhes' },
              { id: 'comments', label: 'Comentários' },
            ]}
            activeTab={modalTab}
            onChange={(value) => setModalTab(value as 'details' | 'comments')}
          />

          {modalTab === 'details' ? (
            <div className="space-y-4">
              {editingPostId && posts.find((post) => post.id === editingPostId)?.latestApprovalStatus ? (
                <Card className="border-slate-200 bg-slate-50/80">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Última aprovação enviada
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Este post já passou por um link público e o status mais recente está abaixo.
                      </p>
                    </div>
                    <Badge
                      variant={getApprovalStatusBadgeVariant(
                        posts.find((post) => post.id === editingPostId)!.latestApprovalStatus!
                      )}
                    >
                      {getApprovalStatusLabel(
                        posts.find((post) => post.id === editingPostId)!.latestApprovalStatus!
                      )}
                    </Badge>
                  </div>
                </Card>
              ) : null}

              <Input
                label="Título do Post"
                placeholder="Sobre o que é este post?"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Descrição</label>
                <textarea
                  className="min-h-[80px] w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  placeholder="Adicione observações ou uma descrição..."
                  value={newPostDescription}
                  onChange={(e) => setNewPostDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Legenda / Caption</label>
                <textarea
                  className="min-h-[120px] w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  placeholder="A legenda usada no preview público e no mockup da aprovação..."
                  value={newPostCaption}
                  onChange={(e) => setNewPostCaption(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Data</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={newPostDate}
                    onChange={(e) => setNewPostDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Plataforma</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={newPostPlatform}
                    onChange={(e) =>
                      setNewPostPlatform(e.target.value as 'Instagram' | 'TikTok' | 'YouTube')
                    }
                  >
                    {APPROVAL_PLATFORMS.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Formato do conteúdo</label>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      { id: 'static', label: 'Imagem', icon: ImageIcon },
                      { id: 'carousel', label: 'Carrossel', icon: Layers },
                      { id: 'vertical_video', label: 'Vídeo vertical', icon: Play },
                      { id: 'horizontal_video', label: 'Vídeo horizontal', icon: MonitorPlay },
                    ].map((option) => {
                    const OptionIcon = option.icon;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setNewContentType(option.id as ApprovalContentType)}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                          newContentType === option.id
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

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Status</label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  value={newPostStatus}
                  onChange={(e) => setNewPostStatus(e.target.value)}
                >
                  <option value="Draft">Rascunho</option>
                  <option value="Planned">Planejado</option>
                  <option value="Review">Revisão</option>
                  <option value="Published">Publicado</option>
                </select>
              </div>

              <Card className="space-y-4 border-slate-200 bg-slate-50/70">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Mídia do preview de aprovação</h3>
                    <p className="mt-1 text-xs text-text-secondary">
                      Os arquivos anexados aqui alimentam o mockup público com imagem, carrossel ou vídeo.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={mediaInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple={newContentType === 'carousel'}
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
                      {newMediaItems.length > 0 ? 'Adicionar mídia' : 'Anexar mídia'}
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

                {newMediaItems.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {newMediaItems.map((item, index) => {
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
                              <X className="h-3.5 w-3.5" />
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
                    Nenhuma mídia anexada ainda. Sem isso, a aprovação pública exibirá apenas o contexto textual do post.
                  </div>
                )}
              </Card>

              <MemberAssignmentField
                members={activeMembers}
                value={linkedMemberIds}
                onChange={setLinkedMemberIds}
              />
            </div>
          ) : (
            <TaskCommentsPanel
              profileId={activeProfile?.id}
              entityType="editorial_calendar"
              entityId={editingPostId}
              currentUserName={user?.name || 'Equipe'}
              currentUserId={user?.id}
              members={activeMembers}
              assignedMemberIds={linkedMemberIds}
              entityTitle={newPostTitle}
              targetModule="calendar"
            />
          )}

          <div className="flex justify-between pt-4">
            {editingPostId ? (
              <Button
                variant="secondary"
                onClick={() => void handleDeletePost()}
                type="button"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                isLoading={isDeletingPost}
              >
                Excluir
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSavingPost} data-tour-id="calendar-save-button">
                {editingPostId ? 'Salvar Alterações' : 'Agendar'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isApprovalRequestModalOpen}
        onClose={() => setIsApprovalRequestModalOpen(false)}
        title="Solicitar Aprovação"
        className="max-w-3xl"
      >
        <div className="space-y-5">
          <Card className="border-slate-200 bg-slate-50/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Aprovação via calendário
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  Gere um link público para revisar um período inteiro
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  O cliente verá os posts do `editorial_calendar` e abrirá cada item com o mockup completo do módulo de aprovação.
                </p>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Posts no período
                </p>
                <p className="mt-2 text-3xl font-bold text-brand">{approvalRangePosts.length}</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Data inicial</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                value={approvalStartDate}
                onChange={(event) => setApprovalStartDate(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Data final</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                value={approvalEndDate}
                onChange={(event) => setApprovalEndDate(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Validade do link</label>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { id: '3', label: '3 dias' },
                { id: '7', label: '7 dias' },
                { id: '15', label: '15 dias' },
                { id: 'custom', label: 'Personalizado' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    setApprovalValidityPreset(option.id as '3' | '7' | '15' | 'custom')
                  }
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-sm font-medium transition-colors',
                    approvalValidityPreset === option.id
                      ? 'border-brand bg-brand/5 text-brand'
                      : 'border-gray-200 bg-white text-text-secondary hover:border-brand/40'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {approvalValidityPreset === 'custom' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Expira em</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                value={customApprovalExpiryDate}
                onChange={(event) => setCustomApprovalExpiryDate(event.target.value)}
              />
            </div>
          ) : null}

          <Card className="border-slate-200 bg-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">Resumo da solicitação</p>
                <p className="text-sm text-slate-600">
                  Período de {approvalStartDate || '--'} até {approvalEndDate || '--'} com {approvalRangePosts.length} post(s).
                </p>
              </div>
              <Badge variant={approvalRangePosts.length > 0 ? 'brand' : 'warning'}>
                {approvalRangePosts.length > 0 ? 'Pronto para gerar' : 'Sem posts no período'}
              </Badge>
            </div>
          </Card>

          {generatedApprovalLink ? (
            <Card className="space-y-4 border-brand/20 bg-brand/5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Link gerado com sucesso</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Compartilhe este link com o cliente para revisar o período selecionado.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Input label="Link público" value={generatedApprovalLink} readOnly />
                <div className="flex flex-wrap gap-3">
                  <Button type="button" className="gap-2" onClick={() => void handleCopyApprovalLink()}>
                    <Copy className="h-4 w-4" />
                    {isLinkCopied ? 'Link copiado' : 'Copiar link'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2"
                    onClick={() => window.open(generatedApprovalLink, '_blank', 'noopener,noreferrer')}
                  >
                    <Link2 className="h-4 w-4" />
                    Abrir aprovação
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsApprovalRequestModalOpen(false)}
            >
              Fechar
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={() => void handleGenerateApprovalLink()}
              disabled={approvalRangePosts.length === 0}
              isLoading={isGeneratingApprovalLink}
            >
              <Link2 className="h-4 w-4" />
              Gerar link público
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
