import { supabase } from '../shared/utils/supabase';
import type { TeamMember } from '../shared/constants/workspaceMembers';
import {
  buildMemberMentionHandle,
  type DemandEntityType,
  type DemandModuleId,
} from '../shared/constants/workspaceCollaboration';
import type {
  WorkspaceNotification,
  WorkspaceNotificationType,
} from '../shared/constants/workspaceNotifications';

const STORAGE_KEY = 'posthub_workspace_notifications_v1';

type NotificationMap = Record<string, WorkspaceNotification[]>;

interface DbNotificationRow {
  id: string;
  profile_id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  actor_name: string;
  type: WorkspaceNotificationType;
  target_module: WorkspaceNotification['targetModule'];
  entity_type: DemandEntityType;
  entity_id: string;
  entity_title: string;
  message: string;
  metadata: Record<string, string | string[] | null> | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

interface CreateWorkspaceNotificationInput {
  profileId: string;
  recipientUserId: string;
  actorUserId?: string | null;
  actorName: string;
  type: WorkspaceNotificationType;
  targetModule: WorkspaceNotification['targetModule'];
  entityType: DemandEntityType;
  entityId: string;
  entityTitle: string;
  message: string;
  metadata?: Record<string, string | string[] | null>;
}

interface NotificationActor {
  actorUserId?: string | null;
  actorName: string;
}

interface TaskNotificationContext extends NotificationActor {
  profileId: string;
  entityType: DemandEntityType;
  entityId: string;
  entityTitle: string;
  targetModule: WorkspaceNotification['targetModule'];
  members: TeamMember[];
}

const buildStorageBucketKey = (profileId: string, recipientUserId: string) =>
  `${profileId}:${recipientUserId}`;

const readStorage = (): NotificationMap => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NotificationMap) : {};
  } catch (error) {
    console.error('Failed to read workspace notifications from localStorage:', error);
    return {};
  }
};

const writeStorage = (value: NotificationMap) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to persist workspace notifications in localStorage:', error);
  }
};

const buildId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const mapRow = (row: DbNotificationRow): WorkspaceNotification => ({
  id: row.id,
  profileId: row.profile_id,
  recipientUserId: row.recipient_user_id,
  actorUserId: row.actor_user_id,
  actorName: row.actor_name,
  type: row.type,
  targetModule: row.target_module,
  entityType: row.entity_type,
  entityId: row.entity_id,
  entityTitle: row.entity_title,
  message: row.message,
  metadata: row.metadata ?? {},
  isRead: row.is_read,
  createdAt: row.created_at,
  readAt: row.read_at,
});

const persistLocally = (notifications: WorkspaceNotification[]) => {
  const storage = readStorage();

  notifications.forEach((notification) => {
    const bucketKey = buildStorageBucketKey(notification.profileId, notification.recipientUserId);
    const currentBucket = storage[bucketKey] ?? [];
    storage[bucketKey] = [notification, ...currentBucket].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  });

  writeStorage(storage);
};

const updateLocalNotification = (
  profileId: string,
  recipientUserId: string,
  notificationId?: string,
  markAll = false
) => {
  const storage = readStorage();
  const bucketKey = buildStorageBucketKey(profileId, recipientUserId);
  const currentBucket = storage[bucketKey] ?? [];
  const now = new Date().toISOString();

  storage[bucketKey] = currentBucket.map((notification) =>
    markAll || notification.id === notificationId
      ? {
          ...notification,
          isRead: true,
          readAt: now,
        }
      : notification
  );

  writeStorage(storage);
};

const getRecipientsFromMembers = (
  members: TeamMember[],
  memberIds: string[],
  actorUserId?: string | null
) => {
  const recipientMap = new Map<string, TeamMember>();

  memberIds.forEach((memberId) => {
    const matchedMember = members.find((member) => member.id === memberId);
    if (!matchedMember?.userId) return;
    if (matchedMember.status === 'disabled') return;
    if (actorUserId && matchedMember.userId === actorUserId) return;
    recipientMap.set(matchedMember.userId, matchedMember);
  });

  return Array.from(recipientMap.values());
};

const buildCommentSnippet = (content: string) => {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 110) return normalized;
  return `${normalized.slice(0, 107)}...`;
};

export const workspaceNotificationsService = {
  async list(profileId: string, recipientUserId: string): Promise<WorkspaceNotification[]> {
    const bucketKey = buildStorageBucketKey(profileId, recipientUserId);

    if (!supabase) {
      return readStorage()[bucketKey] ?? [];
    }

    try {
      const { data, error } = await supabase
        .from('workspace_notifications')
        .select('*')
        .eq('profile_id', profileId)
        .eq('recipient_user_id', recipientUserId)
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) throw error;

      return ((data ?? []) as DbNotificationRow[]).map(mapRow);
    } catch (error) {
      console.error('[workspaceNotificationsService] Failed to load notifications:', error);
      return readStorage()[bucketKey] ?? [];
    }
  },

  async markAsRead(profileId: string, recipientUserId: string, notificationId: string) {
    updateLocalNotification(profileId, recipientUserId, notificationId);

    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('workspace_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('recipient_user_id', recipientUserId);

      if (error) throw error;
    } catch (error) {
      console.error('[workspaceNotificationsService] Failed to mark notification as read:', error);
    }
  },

  async markAllAsRead(profileId: string, recipientUserId: string) {
    updateLocalNotification(profileId, recipientUserId, undefined, true);

    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('workspace_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('profile_id', profileId)
        .eq('recipient_user_id', recipientUserId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('[workspaceNotificationsService] Failed to mark all notifications as read:', error);
    }
  },

  async createMany(inputs: CreateWorkspaceNotificationInput[]) {
    if (inputs.length === 0) return;

    const optimisticNotifications = inputs.map(
      (input): WorkspaceNotification => ({
        id: buildId(),
        profileId: input.profileId,
        recipientUserId: input.recipientUserId,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName,
        type: input.type,
        targetModule: input.targetModule,
        entityType: input.entityType,
        entityId: input.entityId,
        entityTitle: input.entityTitle,
        message: input.message,
        metadata: input.metadata ?? {},
        isRead: false,
        createdAt: new Date().toISOString(),
        readAt: null,
      })
    );

    persistLocally(optimisticNotifications);

    if (!supabase) return optimisticNotifications;

    try {
      const { data, error } = await supabase
        .from('workspace_notifications')
        .insert(
          inputs.map((input) => ({
            profile_id: input.profileId,
            recipient_user_id: input.recipientUserId,
            actor_user_id: input.actorUserId ?? null,
            actor_name: input.actorName,
            type: input.type,
            target_module: input.targetModule,
            entity_type: input.entityType,
            entity_id: input.entityId,
            entity_title: input.entityTitle,
            message: input.message,
            metadata: input.metadata ?? {},
          }))
        )
        .select('*');

      if (error) throw error;

      return ((data ?? []) as DbNotificationRow[]).map(mapRow);
    } catch (error) {
      console.error('[workspaceNotificationsService] Failed to persist notifications:', error);
      return optimisticNotifications;
    }
  },

  async notifyTaskAssigned(
    input: TaskNotificationContext & {
      previousAssignedMemberIds: string[];
      nextAssignedMemberIds: string[];
    }
  ) {
    const previousSet = new Set(input.previousAssignedMemberIds);
    const addedMembers = getRecipientsFromMembers(
      input.members,
      input.nextAssignedMemberIds.filter((memberId) => !previousSet.has(memberId)),
      input.actorUserId
    );

    if (addedMembers.length === 0) return;

    await this.createMany(
      addedMembers.map((member) => ({
        profileId: input.profileId,
        recipientUserId: member.userId as string,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName,
        type: 'task_assigned',
        targetModule: input.targetModule,
        entityType: input.entityType,
        entityId: input.entityId,
        entityTitle: input.entityTitle,
        message: `${input.actorName} vinculou você à tarefa "${input.entityTitle}".`,
        metadata: {
          memberId: member.id,
        },
      }))
    );
  },

  async notifyTaskUpdated(
    input: TaskNotificationContext & {
      assignedMemberIds: string[];
    }
  ) {
    const recipients = getRecipientsFromMembers(input.members, input.assignedMemberIds, input.actorUserId);

    if (recipients.length === 0) return;

    await this.createMany(
      recipients.map((member) => ({
        profileId: input.profileId,
        recipientUserId: member.userId as string,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName,
        type: 'task_updated',
        targetModule: input.targetModule,
        entityType: input.entityType,
        entityId: input.entityId,
        entityTitle: input.entityTitle,
        message: `${input.actorName} atualizou a tarefa "${input.entityTitle}".`,
      }))
    );
  },

  async notifyCommentActivity(
    input: TaskNotificationContext & {
      content: string;
      assignedMemberIds: string[];
    }
  ) {
    const mentionHandles = new Set(
      Array.from(input.content.matchAll(/(^|\s)@([a-z0-9.]+)/gi)).map((match) =>
        match[2].toLowerCase()
      )
    );

    const mentionedMembers = input.members.filter((member) => {
      if (!member.userId || member.status === 'disabled') return false;
      if (input.actorUserId && member.userId === input.actorUserId) return false;
      return mentionHandles.has(buildMemberMentionHandle(member));
    });

    const mentionedRecipientIds = new Set(
      mentionedMembers.map((member) => member.userId as string)
    );
    const commentRecipients = getRecipientsFromMembers(
      input.members,
      input.assignedMemberIds,
      input.actorUserId
    ).filter((member) => !mentionedRecipientIds.has(member.userId as string));

    const snippet = buildCommentSnippet(input.content);

    await this.createMany([
      ...mentionedMembers.map((member) => ({
        profileId: input.profileId,
        recipientUserId: member.userId as string,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName,
        type: 'comment_mentioned' as const,
        targetModule: input.targetModule,
        entityType: input.entityType,
        entityId: input.entityId,
        entityTitle: input.entityTitle,
        message: `${input.actorName} mencionou você em "${input.entityTitle}": ${snippet}`,
        metadata: {
          mentionHandle: buildMemberMentionHandle(member),
        },
      })),
      ...commentRecipients.map((member) => ({
        profileId: input.profileId,
        recipientUserId: member.userId as string,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName,
        type: 'task_commented' as const,
        targetModule: input.targetModule,
        entityType: input.entityType,
        entityId: input.entityId,
        entityTitle: input.entityTitle,
        message: `${input.actorName} comentou na tarefa "${input.entityTitle}": ${snippet}`,
        metadata: {
          memberId: member.id,
        },
      })),
    ]);
  },
};

export const getNotificationTargetModule = (
  entityType: DemandEntityType,
  preferredModule?: DemandModuleId | 'kanban' | 'approval'
): WorkspaceNotification['targetModule'] => {
  if (preferredModule === 'kanban') return 'kanban';
  if (preferredModule === 'approval') return 'approval';
  if (preferredModule === 'ideas') return 'ideas';
  if (preferredModule === 'references') return 'references';
  if (preferredModule === 'calendar') return 'calendar';

  switch (entityType) {
    case 'editorial_calendar':
      return 'calendar';
    case 'idea':
      return 'ideas';
    case 'reference':
      return 'references';
    case 'approval_post':
      return 'approval';
    default:
      return 'calendar';
  }
};
