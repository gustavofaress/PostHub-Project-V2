import { referencesService } from './references.service';
import { supabase } from '../shared/utils/supabase';
import type { UpdateReferenceInput } from '../types/reference.types';
import type {
  DemandEntityType,
  WorkspaceDemandItem,
  WorkspaceTaskAssignment,
  WorkspaceTaskComment,
} from '../shared/constants/workspaceCollaboration';

const ASSIGNMENTS_STORAGE_KEY = 'posthub_workspace_task_assignments_v1';
const COMMENTS_STORAGE_KEY = 'posthub_workspace_task_comments_v1';

type AssignmentsMap = Record<string, WorkspaceTaskAssignment[]>;
type CommentsMap = Record<string, WorkspaceTaskComment[]>;

interface DbAssignmentRow {
  id: string;
  profile_id: string;
  entity_type: DemandEntityType;
  entity_id: string;
  member_id: string;
  created_at: string;
}

interface DbCommentRow {
  id: string;
  profile_id: string;
  entity_type: DemandEntityType;
  entity_id: string;
  author_user_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

const buildId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const readStorage = <T extends AssignmentsMap | CommentsMap>(key: string): T => {
  if (typeof window === 'undefined') return {} as T;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch (error) {
    console.error(`Failed to read ${key} from localStorage:`, error);
    return {} as T;
  }
};

const writeStorage = (key: string, value: AssignmentsMap | CommentsMap) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to persist ${key} in localStorage:`, error);
  }
};

const isMissingRelationError = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code;
  return code === '42P01' || code === 'PGRST205';
};

const mapAssignmentRow = (row: DbAssignmentRow): WorkspaceTaskAssignment => ({
  id: row.id,
  profileId: row.profile_id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  memberId: row.member_id,
  createdAt: row.created_at,
});

const mapCommentRow = (row: DbCommentRow): WorkspaceTaskComment => ({
  id: row.id,
  profileId: row.profile_id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  authorUserId: row.author_user_id,
  authorName: row.author_name,
  content: row.content,
  createdAt: row.created_at,
});

const assignmentStorage = {
  list(profileId: string) {
    const data = readStorage<AssignmentsMap>(ASSIGNMENTS_STORAGE_KEY);
    return data[profileId] ?? [];
  },

  save(profileId: string, assignments: WorkspaceTaskAssignment[]) {
    const data = readStorage<AssignmentsMap>(ASSIGNMENTS_STORAGE_KEY);
    data[profileId] = assignments;
    writeStorage(ASSIGNMENTS_STORAGE_KEY, data);
  },
};

const commentsStorage = {
  list(profileId: string) {
    const data = readStorage<CommentsMap>(COMMENTS_STORAGE_KEY);
    return data[profileId] ?? [];
  },

  save(profileId: string, comments: WorkspaceTaskComment[]) {
    const data = readStorage<CommentsMap>(COMMENTS_STORAGE_KEY);
    data[profileId] = comments;
    writeStorage(COMMENTS_STORAGE_KEY, data);
  },
};

export const workspaceCollaborationService = {
  async listAssignments(
    profileId: string,
    entityType?: DemandEntityType,
    entityIds?: string[]
  ): Promise<WorkspaceTaskAssignment[]> {
    const applyFilters = (assignments: WorkspaceTaskAssignment[]) =>
      assignments.filter((assignment) => {
        const matchesType = entityType ? assignment.entityType === entityType : true;
        const matchesEntity = entityIds?.length
          ? entityIds.includes(assignment.entityId)
          : true;
        return matchesType && matchesEntity;
      });

    if (!supabase) {
      return applyFilters(assignmentStorage.list(profileId));
    }

    try {
      let query = supabase
        .from('workspace_task_assignments')
        .select('*')
        .eq('profile_id', profileId);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (entityIds?.length) {
        query = query.in('entity_id', entityIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as DbAssignmentRow[]).map(mapAssignmentRow);
    } catch (error) {
      if (!isMissingRelationError(error)) {
        console.error('[workspaceCollaborationService] Failed to load assignments:', error);
      }
      return applyFilters(assignmentStorage.list(profileId));
    }
  },

  async getAssignedMemberIds(
    profileId: string,
    entityType: DemandEntityType,
    entityId: string
  ) {
    const assignments = await this.listAssignments(profileId, entityType, [entityId]);
    return assignments.map((assignment) => assignment.memberId);
  },

  async setAssignedMembers(
    profileId: string,
    entityType: DemandEntityType,
    entityId: string,
    memberIds: string[]
  ) {
    const localAssignments = assignmentStorage.list(profileId).filter(
      (assignment) =>
        !(assignment.entityType === entityType && assignment.entityId === entityId)
    );
    const nextAssignments = [
      ...localAssignments,
      ...memberIds.map(
        (memberId): WorkspaceTaskAssignment => ({
          id: buildId(),
          profileId,
          entityType,
          entityId,
          memberId,
          createdAt: new Date().toISOString(),
        })
      ),
    ];

    assignmentStorage.save(profileId, nextAssignments);

    if (!supabase) return;

    try {
      const { error: deleteError } = await supabase
        .from('workspace_task_assignments')
        .delete()
        .eq('profile_id', profileId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

      if (deleteError) throw deleteError;

      if (memberIds.length === 0) return;

      const { error: insertError } = await supabase
        .from('workspace_task_assignments')
        .insert(
          memberIds.map((memberId) => ({
            profile_id: profileId,
            entity_type: entityType,
            entity_id: entityId,
            member_id: memberId,
          }))
        );

      if (insertError) throw insertError;
    } catch (error) {
      if (!isMissingRelationError(error)) {
        console.error('[workspaceCollaborationService] Failed to persist assignments:', error);
      }
    }
  },

  async listComments(
    profileId: string,
    entityType: DemandEntityType,
    entityId: string
  ): Promise<WorkspaceTaskComment[]> {
    const applyFilters = (comments: WorkspaceTaskComment[]) =>
      comments.filter(
        (comment) => comment.entityType === entityType && comment.entityId === entityId
      );

    if (!supabase) {
      return applyFilters(commentsStorage.list(profileId));
    }

    try {
      const { data, error } = await supabase
        .from('workspace_task_comments')
        .select('*')
        .eq('profile_id', profileId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return ((data ?? []) as DbCommentRow[]).map(mapCommentRow);
    } catch (error) {
      if (!isMissingRelationError(error)) {
        console.error('[workspaceCollaborationService] Failed to load comments:', error);
      }
      return applyFilters(commentsStorage.list(profileId));
    }
  },

  async addComment(input: {
    profileId: string;
    entityType: DemandEntityType;
    entityId: string;
    authorUserId?: string | null;
    authorName: string;
    content: string;
  }) {
    const nextComment: WorkspaceTaskComment = {
      id: buildId(),
      profileId: input.profileId,
      entityType: input.entityType,
      entityId: input.entityId,
      authorUserId: input.authorUserId ?? null,
      authorName: input.authorName,
      content: input.content,
      createdAt: new Date().toISOString(),
    };

    const localComments = [...commentsStorage.list(input.profileId), nextComment].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
    commentsStorage.save(input.profileId, localComments);

    if (!supabase) return nextComment;

    try {
      const { data, error } = await supabase
        .from('workspace_task_comments')
        .insert([
          {
            profile_id: input.profileId,
            entity_type: input.entityType,
            entity_id: input.entityId,
            author_user_id: input.authorUserId ?? null,
            author_name: input.authorName,
            content: input.content,
          },
        ])
        .select('*')
        .single();

      if (error) throw error;

      const createdComment = mapCommentRow(data as DbCommentRow);
      const mergedComments = commentsStorage
        .list(input.profileId)
        .map((comment) => (comment.id === nextComment.id ? createdComment : comment));
      commentsStorage.save(input.profileId, mergedComments);

      return createdComment;
    } catch (error) {
      if (!isMissingRelationError(error)) {
        console.error('[workspaceCollaborationService] Failed to persist comment:', error);
      }
      return nextComment;
    }
  },

  async listDemandItems(profileId: string): Promise<WorkspaceDemandItem[]> {
    if (!supabase || !profileId) return [];

    try {
      const [calendarResult, ideasResult, referencesResult, approvalResult] = await Promise.all([
        supabase
          .from('editorial_calendar')
          .select('id, profile_id, title, description, status, scheduled_date, updated_at')
          .eq('profile_id', profileId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('ideas')
          .select('id, profile_id, title, description, content, status, updated_at')
          .eq('profile_id', profileId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('reference_items')
          .select('id, profile_id, title, description, source, platform, updated_at')
          .eq('profile_id', profileId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('approval_posts')
          .select('id, profile_id, title, caption, status, updated_at')
          .eq('profile_id', profileId)
          .order('updated_at', { ascending: false }),
      ]);

      if (calendarResult.error) throw calendarResult.error;
      if (ideasResult.error) throw ideasResult.error;
      if (referencesResult.error) throw referencesResult.error;
      if (approvalResult.error) throw approvalResult.error;

      const items: WorkspaceDemandItem[] = [
        ...((calendarResult.data ?? []) as Array<Record<string, string | null>>).map((item) => ({
          id: String(item.id),
          profileId: String(item.profile_id),
          entityType: 'editorial_calendar' as const,
          moduleId: 'calendar' as const,
          moduleLabel: 'Calendário / Kanban',
          title: String(item.title ?? ''),
          description: String(item.description ?? ''),
          status: String(item.status ?? 'Planned'),
          updatedAt: String(item.updated_at ?? item.scheduled_date ?? new Date().toISOString()),
          metadata: [String(item.scheduled_date ?? '')].filter(Boolean),
        })),
        ...((ideasResult.data ?? []) as Array<Record<string, string | null>>).map((item) => ({
          id: String(item.id),
          profileId: String(item.profile_id),
          entityType: 'idea' as const,
          moduleId: 'ideas' as const,
          moduleLabel: 'Ideias',
          title: String(item.title ?? ''),
          description: String(item.description ?? item.content ?? ''),
          status: String(item.status ?? 'Backlog'),
          updatedAt: String(item.updated_at ?? new Date().toISOString()),
        })),
        ...((referencesResult.data ?? []) as Array<Record<string, string | null>>).map((item) => ({
          id: String(item.id),
          profileId: String(item.profile_id),
          entityType: 'reference' as const,
          moduleId: 'references' as const,
          moduleLabel: 'Referências',
          title: String(item.title ?? ''),
          description: String(item.description ?? item.source ?? ''),
          status: String(item.platform ?? item.source ?? 'Referência'),
          updatedAt: String(item.updated_at ?? new Date().toISOString()),
        })),
        ...((approvalResult.data ?? []) as Array<Record<string, string | null>>).map((item) => ({
          id: String(item.id),
          profileId: String(item.profile_id),
          entityType: 'approval_post' as const,
          moduleId: 'approval' as const,
          moduleLabel: 'Aprovação',
          title: String(item.title ?? ''),
          description: String(item.caption ?? ''),
          status: String(item.status ?? 'pending'),
          updatedAt: String(item.updated_at ?? new Date().toISOString()),
        })),
      ];

      return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch (error) {
      console.error('[workspaceCollaborationService] Failed to load demand items:', error);
      return [];
    }
  },

  async updateDemandItem(input: {
    profileId: string;
    entityType: DemandEntityType;
    entityId: string;
    title: string;
    description: string;
    status: string;
  }) {
    if (!supabase) return;

    const { profileId, entityType, entityId, title, description, status } = input;

    switch (entityType) {
      case 'editorial_calendar': {
        const { error } = await supabase
          .from('editorial_calendar')
          .update({
            title,
            description,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', entityId)
          .eq('profile_id', profileId);

        if (error) throw error;
        return;
      }
      case 'idea': {
        const { error } = await supabase
          .from('ideas')
          .update({
            title,
            description,
            content: description || title,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', entityId)
          .eq('profile_id', profileId);

        if (error) throw error;
        return;
      }
      case 'reference': {
        const payload: UpdateReferenceInput = {
          id: entityId,
          profile_id: profileId,
          title,
          description,
          platform: status,
        };
        await referencesService.update(payload);
        return;
      }
      case 'approval_post': {
        const { error } = await supabase
          .from('approval_posts')
          .update({
            title,
            caption: description,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', entityId)
          .eq('profile_id', profileId);

        if (error) throw error;
      }
    }
  },
};
