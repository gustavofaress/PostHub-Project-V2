import type { WorkspaceModule } from './navigation';
import type { DemandEntityType } from './workspaceCollaboration';

export type WorkspaceNotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'comment_mentioned'
  | 'task_commented';

export interface WorkspaceNotification {
  id: string;
  profileId: string;
  recipientUserId: string;
  actorUserId?: string | null;
  actorName: string;
  type: WorkspaceNotificationType;
  targetModule: Extract<
    WorkspaceModule,
    'calendar' | 'kanban' | 'ideas' | 'references' | 'approval'
  >;
  entityType: DemandEntityType;
  entityId: string;
  entityTitle: string;
  message: string;
  metadata: Record<string, string | string[] | null>;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export const WORKSPACE_NOTIFICATION_QUERY_PARAMS = {
  entityId: 'notificationEntityId',
  entityType: 'notificationEntityType',
  tab: 'notificationTab',
  notificationId: 'notificationId',
} as const;

export const buildWorkspaceNotificationUrl = (notification: WorkspaceNotification) => {
  const params = new URLSearchParams();
  params.set(WORKSPACE_NOTIFICATION_QUERY_PARAMS.entityId, notification.entityId);
  params.set(WORKSPACE_NOTIFICATION_QUERY_PARAMS.entityType, notification.entityType);
  params.set(
    WORKSPACE_NOTIFICATION_QUERY_PARAMS.tab,
    notification.type === 'comment_mentioned' || notification.type === 'task_commented'
      ? 'comments'
      : 'details'
  );
  params.set(WORKSPACE_NOTIFICATION_QUERY_PARAMS.notificationId, notification.id);

  return `/workspace/${notification.targetModule}?${params.toString()}`;
};

export const readWorkspaceNotificationParams = (searchParams: URLSearchParams) => ({
  entityId: searchParams.get(WORKSPACE_NOTIFICATION_QUERY_PARAMS.entityId),
  entityType: searchParams.get(
    WORKSPACE_NOTIFICATION_QUERY_PARAMS.entityType
  ) as DemandEntityType | null,
  tab: searchParams.get(WORKSPACE_NOTIFICATION_QUERY_PARAMS.tab),
  notificationId: searchParams.get(WORKSPACE_NOTIFICATION_QUERY_PARAMS.notificationId),
});

export const withoutWorkspaceNotificationParams = (searchParams: URLSearchParams) => {
  const nextParams = new URLSearchParams(searchParams);

  Object.values(WORKSPACE_NOTIFICATION_QUERY_PARAMS).forEach((paramName) => {
    nextParams.delete(paramName);
  });

  return nextParams;
};

export const formatWorkspaceNotificationTypeLabel = (type: WorkspaceNotificationType) => {
  switch (type) {
    case 'task_assigned':
      return 'Nova atribuição';
    case 'task_updated':
      return 'Tarefa atualizada';
    case 'comment_mentioned':
      return 'Nova menção';
    case 'task_commented':
      return 'Novo comentário';
    default:
      return 'Atualização';
  }
};
