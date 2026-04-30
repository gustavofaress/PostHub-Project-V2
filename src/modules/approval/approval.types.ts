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

export type ApprovalPlatform = 'Instagram' | 'TikTok' | 'YouTube';
export type ApprovalContentType =
  | 'static'
  | 'carousel'
  | 'vertical_video'
  | 'horizontal_video';
export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'changes_requested'
  | 'rejected';

export interface ApprovalPost {
  id: string;
  title: string;
  caption: string;
  platform: ApprovalPlatform;
  contentType: ApprovalContentType;
  status: ApprovalStatus;
  thumbnail: string;
  media?: string | MediaState;
  mediaItems?: MediaState[];
  profileId?: string;
  profileName?: string;
  profileAvatarUrl?: string;
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

export const getApprovalStatusLabel = (status: ApprovalStatus) => {
  switch (status) {
    case 'approved':
      return 'APROVADO';
    case 'changes_requested':
      return 'AJUSTES SOLICITADOS';
    case 'rejected':
      return 'REJEITADO';
    case 'pending':
    default:
      return 'PENDENTE';
  }
};

export const getApprovalStatusBadgeVariant = (status: ApprovalStatus) => {
  switch (status) {
    case 'approved':
      return 'success' as const;
    case 'changes_requested':
      return 'warning' as const;
    case 'rejected':
      return 'error' as const;
    case 'pending':
    default:
      return 'default' as const;
  }
};
