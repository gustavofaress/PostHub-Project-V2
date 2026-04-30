import type {
  ApprovalComment,
  ApprovalContentType,
  ApprovalPlatform,
  ApprovalPost,
  ApprovalStatus,
  MediaState,
} from '../approval/approval.types';

export interface EditorialCalendarApprovalRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  title: string;
  description: string | null;
  caption: string | null;
  platform: string | null;
  content_type: string | null;
  thumbnail_url: string | null;
  media_urls: MediaState[] | null;
  scheduled_date: string;
  status: string | null;
  kanban_column_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarApprovalLink {
  id: string;
  userId?: string;
  profileId: string;
  publicToken: string;
  startDate: string;
  endDate: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked';
  profileName?: string;
  profileAvatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarPostApproval {
  id: string;
  approvalLinkId: string;
  calendarPostId: string;
  profileId: string;
  status: ApprovalStatus;
  reviewerName?: string | null;
  reviewerEmail?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarApprovalFeedback extends ApprovalComment {
  approvalId: string;
  approvalLinkId: string;
  calendarPostId: string;
  profileId: string;
  reviewerEmail?: string | null;
  status?: Exclude<ApprovalStatus, 'pending'>;
}

export interface CalendarApprovalListItem {
  calendarPost: EditorialCalendarApprovalRow;
  approval: CalendarPostApproval;
  previewPost: ApprovalPost;
  feedbackCount: number;
}

export interface CalendarApprovalHistoryRound {
  link: CalendarApprovalLink;
  approval: CalendarPostApproval;
  feedback: CalendarApprovalFeedback[];
}

export interface CalendarApprovalDashboardItem {
  calendarPost: EditorialCalendarApprovalRow;
  previewPost: ApprovalPost;
  latestApproval: CalendarPostApproval | null;
  latestLink: CalendarApprovalLink | null;
  latestStatus: ApprovalStatus | null;
  totalFeedbackCount: number;
  totalRounds: number;
  rounds: CalendarApprovalHistoryRound[];
  lastInteractionAt: string;
}

export interface LatestCalendarApprovalStatus {
  calendarPostId: string;
  approvalLinkId: string;
  linkStatus: CalendarApprovalLink['status'];
  status: ApprovalStatus;
  updatedAt: string;
}

export const APPROVAL_PLATFORMS: ApprovalPlatform[] = [
  'Instagram',
  'TikTok',
  'YouTube',
];

const normalizePlatform = (value?: string | null): ApprovalPlatform => {
  if (value === 'TikTok' || value === 'YouTube') return value;
  return 'Instagram';
};

const normalizeContentType = (
  value: string | null | undefined,
  platform: ApprovalPlatform,
  mediaItems: MediaState[]
): ApprovalContentType => {
  if (mediaItems.length > 1) return 'carousel';

  const firstMedia = mediaItems[0];
  if (firstMedia?.type === 'video' || firstMedia?.mimeType?.includes('video')) {
    if (value === 'horizontal_video' || value === 'vertical_video') {
      return value;
    }

    return platform === 'YouTube' ? 'horizontal_video' : 'vertical_video';
  }

  if (
    value === 'static' ||
    value === 'carousel' ||
    value === 'vertical_video' ||
    value === 'horizontal_video'
  ) {
    return value;
  }

  return 'static';
};

export const normalizeCalendarMediaItems = (value: unknown): MediaState[] => {
  if (!Array.isArray(value)) return [];

  return (
    value
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;

        const current = item as Partial<MediaState>;
        const previewUrl = current.previewUrl || current.persistedPreview || '';
        const mimeType =
          current.mimeType || (current.type === 'video' ? 'video/mp4' : 'image/jpeg');
        const type =
          current.type === 'video' || mimeType.includes('video') ? 'video' : 'image';

        return {
          id: current.id || `calendar-media-${index}`,
          type,
          fileName: current.fileName || `arquivo-${index + 1}`,
          fileSize: Number(current.fileSize) || 0,
          mimeType,
          previewUrl,
          persistedPreview: current.persistedPreview || previewUrl,
          uploadStatus: current.uploadStatus || 'ready',
          originalFileReference: current.originalFileReference,
          optimizedUrlIfAny: current.optimizedUrlIfAny,
          order: typeof current.order === 'number' ? current.order : index,
        } satisfies MediaState;
      })
      .filter(Boolean) as MediaState[]
  ).sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
};

export const mapCalendarRowToApprovalPost = (
  row: EditorialCalendarApprovalRow,
  options?: {
    status?: ApprovalStatus;
    feedbackCount?: number;
    profileName?: string | null;
    profileAvatarUrl?: string | null;
    updatedAt?: string;
  }
): ApprovalPost => {
  const mediaItems = normalizeCalendarMediaItems(row.media_urls);
  const platform = normalizePlatform(row.platform);
  const contentType = normalizeContentType(row.content_type, platform, mediaItems);
  const thumbnail =
    row.thumbnail_url ||
    mediaItems[0]?.persistedPreview ||
    mediaItems[0]?.previewUrl ||
    '';

  return {
    id: row.id,
    title: row.title || 'Post sem título',
    caption: row.caption || row.description || '',
    platform,
    contentType,
    status: options?.status || 'pending',
    thumbnail,
    mediaItems,
    profileId: row.profile_id || undefined,
    profileName: options?.profileName || undefined,
    profileAvatarUrl: options?.profileAvatarUrl || undefined,
    createdAt: row.created_at,
    updatedAt: options?.updatedAt || row.updated_at,
    feedbackCount: options?.feedbackCount || 0,
  };
};

export const mapDbCalendarApprovalLink = (row: Record<string, any>): CalendarApprovalLink => ({
  id: String(row.id),
  userId: row.user_id ? String(row.user_id) : undefined,
  profileId: String(row.profile_id),
  publicToken: String(row.public_token),
  startDate: String(row.start_date),
  endDate: String(row.end_date),
  expiresAt: String(row.expires_at),
  status: (row.status || 'active') as CalendarApprovalLink['status'],
  profileName: row.profile_name_snapshot || undefined,
  profileAvatarUrl: row.profile_avatar_url_snapshot || undefined,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const mapDbCalendarPostApproval = (
  row: Record<string, any>
): CalendarPostApproval => ({
  id: String(row.id),
  approvalLinkId: String(row.approval_link_id),
  calendarPostId: String(row.calendar_post_id),
  profileId: String(row.profile_id),
  status: (row.status || 'pending') as ApprovalStatus,
  reviewerName: row.reviewer_name || undefined,
  reviewerEmail: row.reviewer_email || undefined,
  decidedAt: row.decided_at || undefined,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const mapDbCalendarApprovalFeedback = (
  row: Record<string, any>
): CalendarApprovalFeedback => ({
  id: String(row.id),
  approvalItemId: String(row.calendar_post_id),
  approvalId: String(row.approval_id),
  approvalLinkId: String(row.approval_link_id),
  calendarPostId: String(row.calendar_post_id),
  profileId: String(row.profile_id),
  authorType: row.author_type === 'internal' ? 'internal' : 'external',
  authorName: row.reviewer_name || 'Revisor do Cliente',
  reviewerEmail: row.reviewer_email || undefined,
  content: row.comment || '',
  status: row.status || undefined,
  createdAt: String(row.created_at),
});
