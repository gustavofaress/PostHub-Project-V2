import { supabase } from '../shared/utils/supabase';
import { workspaceMembersService } from './workspace-members.service';
import type { DemandEntityType, DemandModuleId } from '../shared/constants/workspaceCollaboration';
import type { TeamMember } from '../shared/constants/workspaceMembers';

type ClientStatus = 'active' | 'inactive' | 'idle';

type ModuleActivityId = DemandModuleId | 'notes';

interface ClientProfileRow {
  id: string;
  profile_name: string | null;
  avatar_url: string | null;
  created_at?: string | null;
}

interface WorkspaceMembershipRow {
  profile_id: string | null;
}

interface CalendarRow {
  id: string;
  profile_id: string;
  title: string | null;
  description: string | null;
  status: string | null;
  scheduled_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ApprovalPostRow {
  id: string;
  profile_id: string;
  title: string | null;
  caption: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ApprovalFeedbackRow {
  id: string;
  post_id: string;
  profile_id: string;
  reviewer_name: string | null;
  comment: string | null;
  status: string | null;
  created_at: string | null;
}

interface IdeaRow {
  id: string;
  profile_id: string;
  title: string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ReferenceRow {
  id: string;
  profile_id: string;
  title: string | null;
  description: string | null;
  platform: string | null;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface WorkspaceTaskCommentRow {
  id: string;
  profile_id: string;
  entity_type: DemandEntityType;
  entity_id: string;
  author_name: string | null;
  content: string | null;
  created_at: string | null;
}

interface WorkspaceTaskAssignmentRow {
  id: string;
  profile_id: string;
  entity_type: DemandEntityType;
  entity_id: string;
  member_id: string;
  created_at: string | null;
}

interface ClientProfileNoteRow {
  id: string;
  profile_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface ClientProfileNote {
  id: string;
  profileId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface ClientProfileSummary {
  id: string;
  name: string;
  avatarUrl?: string;
  createdAt: string | null;
  postsInCalendarCount: number;
  pendingApprovalsCount: number;
  inProgressTasksCount: number;
  openCalendarItemsCount: number;
  openApprovalItemsCount: number;
  assignedIdeaTasksCount: number;
  assignedReferenceTasksCount: number;
  lastActivityAt: string | null;
  status: ClientStatus;
}

export interface ClientTimelineEvent {
  id: string;
  moduleId: ModuleActivityId;
  entityType?: DemandEntityType;
  entityId?: string;
  eventType:
    | 'calendar_created'
    | 'calendar_scheduled'
    | 'approval_sent'
    | 'approval_approved'
    | 'approval_rejected'
    | 'approval_changes_requested'
    | 'approval_comment'
    | 'idea_created'
    | 'reference_created'
    | 'workspace_comment'
    | 'note_created';
  title: string;
  description: string;
  occurredAt: string;
}

export interface ClientApprovalSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}

export interface ClientScheduledContent {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  status: string;
}

export interface ClientTaskSummary {
  id: string;
  entityType: DemandEntityType;
  moduleId: DemandModuleId;
  title: string;
  description: string;
  status: string;
  updatedAt: string;
  assignedMembers: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export interface ClientProfileStats {
  postsInCalendarCount: number;
  pendingApprovalsCount: number;
  inProgressTasksCount: number;
  openCalendarItemsCount: number;
  openApprovalItemsCount: number;
  assignedIdeaTasksCount: number;
  assignedReferenceTasksCount: number;
  upcomingPostsCount: number;
  notesCount: number;
  lastActivityAt: string | null;
  status: ClientStatus;
}

export interface ClientProfileDetail {
  profile: {
    id: string;
    name: string;
    avatarUrl?: string;
    createdAt: string | null;
  };
  stats: ClientProfileStats;
  timeline: ClientTimelineEvent[];
  recentApprovals: ClientApprovalSummary[];
  scheduledContent: ClientScheduledContent[];
  tasks: ClientTaskSummary[];
  notes: ClientProfileNote[];
}

interface ClientProfileDataset {
  profile: ClientProfileRow;
  calendarRows: CalendarRow[];
  approvalRows: ApprovalPostRow[];
  approvalFeedbackRows: ApprovalFeedbackRow[];
  ideaRows: IdeaRow[];
  referenceRows: ReferenceRow[];
  taskCommentRows: WorkspaceTaskCommentRow[];
  assignmentRows: WorkspaceTaskAssignmentRow[];
  notes: ClientProfileNote[];
}

const MODULE_LABELS: Record<DemandModuleId, string> = {
  approval: 'Aprovação',
  calendar: 'Calendário',
  ideas: 'Ideias',
  kanban: 'Kanban',
  references: 'Referências',
};

const hasMissingRelationError = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code;
  return code === '42P01' || code === 'PGRST205';
};

const hasMissingColumnError = (error: unknown, columnName: string) => {
  const message = [
    (error as { message?: string } | null)?.message,
    (error as { details?: string } | null)?.details,
    (error as { hint?: string } | null)?.hint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return message.includes(columnName.toLowerCase());
};

const getEntityKey = (entityType: DemandEntityType, entityId: string) => `${entityType}:${entityId}`;

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const getLatestIsoDate = (values: Array<string | null | undefined>) => {
  const normalizedValues = values.filter(
    (value): value is string => !!value && !Number.isNaN(new Date(value).getTime())
  );

  if (normalizedValues.length === 0) {
    return null;
  }

  return normalizedValues.reduce((latest, value) => {
    if (!latest) return value;
    return new Date(value).getTime() > new Date(latest).getTime() ? value : latest;
  }, normalizedValues[0]);
};

const normalizeText = (value?: string | null, fallback = '') => value?.trim() || fallback;

const toClientStatus = (lastActivityAt: string | null): ClientStatus => {
  if (!lastActivityAt) return 'idle';

  const activityTime = new Date(lastActivityAt).getTime();
  if (Number.isNaN(activityTime)) return 'idle';

  const dayDiff = Math.floor((Date.now() - activityTime) / (1000 * 60 * 60 * 24));

  if (dayDiff <= 7) return 'active';
  if (dayDiff <= 21) return 'inactive';
  return 'idle';
};

const isUnresolvedApproval = (status?: string | null) =>
  status === 'pending' || status === 'changes_requested';

const isCalendarOpen = (status?: string | null) => normalizeText(status, 'Planned') !== 'Published';

const mapNoteRow = (row: ClientProfileNoteRow): ClientProfileNote => ({
  id: row.id,
  profileId: row.profile_id,
  userId: row.user_id,
  content: row.content,
  createdAt: row.created_at,
});

const buildStats = (
  calendarRows: CalendarRow[],
  approvalRows: ApprovalPostRow[],
  assignmentRows: WorkspaceTaskAssignmentRow[],
  notes: ClientProfileNote[],
  lastActivityAt: string | null
): ClientProfileStats => {
  const ideaTaskKeys = new Set(
    assignmentRows
      .filter((assignment) => assignment.entity_type === 'idea')
      .map((assignment) => getEntityKey(assignment.entity_type, assignment.entity_id))
  );
  const referenceTaskKeys = new Set(
    assignmentRows
      .filter((assignment) => assignment.entity_type === 'reference')
      .map((assignment) => getEntityKey(assignment.entity_type, assignment.entity_id))
  );
  const openCalendarItemsCount = calendarRows.filter((row) => isCalendarOpen(row.status)).length;
  const openApprovalItemsCount = approvalRows.filter((row) => isUnresolvedApproval(row.status)).length;
  const upcomingPostsCount = calendarRows.filter((row) => {
    if (!row.scheduled_date) return false;
    const scheduledTime = new Date(row.scheduled_date).getTime();
    return !Number.isNaN(scheduledTime) && scheduledTime >= Date.now();
  }).length;

  return {
    postsInCalendarCount: calendarRows.length,
    pendingApprovalsCount: openApprovalItemsCount,
    inProgressTasksCount:
      openCalendarItemsCount + openApprovalItemsCount + ideaTaskKeys.size + referenceTaskKeys.size,
    openCalendarItemsCount,
    openApprovalItemsCount,
    assignedIdeaTasksCount: ideaTaskKeys.size,
    assignedReferenceTasksCount: referenceTaskKeys.size,
    upcomingPostsCount,
    notesCount: notes.length,
    lastActivityAt,
    status: toClientStatus(lastActivityAt),
  };
};

const buildRecentApprovals = (approvalRows: ApprovalPostRow[]): ClientApprovalSummary[] =>
  [...approvalRows]
    .sort((firstRow, secondRow) => {
      const firstTime = new Date(firstRow.updated_at ?? firstRow.created_at ?? 0).getTime();
      const secondTime = new Date(secondRow.updated_at ?? secondRow.created_at ?? 0).getTime();
      return secondTime - firstTime;
    })
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      title: normalizeText(row.title, 'Conteúdo sem título'),
      status: normalizeText(row.status, 'pending'),
      updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    }));

const buildScheduledContent = (calendarRows: CalendarRow[]): ClientScheduledContent[] =>
  [...calendarRows]
    .filter((row) => !!row.scheduled_date)
    .sort((firstRow, secondRow) => {
      return (
        new Date(firstRow.scheduled_date ?? 0).getTime() -
        new Date(secondRow.scheduled_date ?? 0).getTime()
      );
    })
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      title: normalizeText(row.title, 'Conteúdo sem título'),
      description: normalizeText(row.description, 'Sem descrição'),
      scheduledAt: row.scheduled_date ?? new Date().toISOString(),
      status: normalizeText(row.status, 'Planned'),
    }));

const buildTasks = async (
  profileId: string,
  calendarRows: CalendarRow[],
  approvalRows: ApprovalPostRow[],
  ideaRows: IdeaRow[],
  referenceRows: ReferenceRow[],
  assignmentRows: WorkspaceTaskAssignmentRow[]
): Promise<ClientTaskSummary[]> => {
  const members = await workspaceMembersService.list(profileId).catch(() => []);
  const memberMap = new Map<string, TeamMember>(members.map((member) => [member.id, member] as const));
  const assignmentsByEntityKey = new Map<string, WorkspaceTaskAssignmentRow[]>();

  const mapAssignedMembers = (entityAssignments: WorkspaceTaskAssignmentRow[]) =>
    entityAssignments
      .map((assignment) => memberMap.get(assignment.member_id))
      .filter((member): member is TeamMember => !!member)
      .map((member) => ({
        id: member.id,
        name: member.name,
        role: member.role,
      }));

  assignmentRows.forEach((assignment) => {
    const key = getEntityKey(assignment.entity_type, assignment.entity_id);
    const currentAssignments = assignmentsByEntityKey.get(key) ?? [];
    assignmentsByEntityKey.set(key, [...currentAssignments, assignment]);
  });

  const tasks: ClientTaskSummary[] = [];

  calendarRows
    .filter((row) => isCalendarOpen(row.status))
    .forEach((row) => {
      const entityAssignments =
        assignmentsByEntityKey.get(getEntityKey('editorial_calendar', row.id)) ?? [];
      tasks.push({
        id: row.id,
        entityType: 'editorial_calendar',
        moduleId: 'calendar',
        title: normalizeText(row.title, 'Post sem título'),
        description: normalizeText(row.description, 'Post em produção no calendário editorial.'),
        status: normalizeText(row.status, 'Planned'),
        updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
        assignedMembers: mapAssignedMembers(entityAssignments),
      });
    });

  approvalRows
    .filter((row) => isUnresolvedApproval(row.status))
    .forEach((row) => {
      const entityAssignments =
        assignmentsByEntityKey.get(getEntityKey('approval_post', row.id)) ?? [];
      tasks.push({
        id: row.id,
        entityType: 'approval_post',
        moduleId: 'approval',
        title: normalizeText(row.title, 'Aprovação sem título'),
        description: normalizeText(row.caption, 'Conteúdo aguardando decisão do cliente.'),
        status: normalizeText(row.status, 'pending'),
        updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
        assignedMembers: mapAssignedMembers(entityAssignments),
      });
    });

  ideaRows.forEach((row) => {
    const entityAssignments = assignmentsByEntityKey.get(getEntityKey('idea', row.id)) ?? [];
    if (entityAssignments.length === 0) return;

    tasks.push({
      id: row.id,
      entityType: 'idea',
      moduleId: 'ideas',
      title: normalizeText(row.title, 'Ideia sem título'),
      description: normalizeText(row.description, 'Item em acompanhamento no banco de ideias.'),
      status: normalizeText(row.status, 'Backlog'),
      updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
      assignedMembers: mapAssignedMembers(entityAssignments),
    });
  });

  referenceRows.forEach((row) => {
    const entityAssignments = assignmentsByEntityKey.get(getEntityKey('reference', row.id)) ?? [];
    if (entityAssignments.length === 0) return;

    tasks.push({
      id: row.id,
      entityType: 'reference',
      moduleId: 'references',
      title: normalizeText(row.title, 'Referência sem título'),
      description: normalizeText(row.description, row.source || 'Material de apoio do cliente.'),
      status: normalizeText(row.platform, row.source || 'Referência'),
      updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
      assignedMembers: mapAssignedMembers(entityAssignments),
    });
  });

  return tasks.sort((firstTask, secondTask) => {
    return new Date(secondTask.updatedAt).getTime() - new Date(firstTask.updatedAt).getTime();
  });
};

const buildTimeline = (dataset: ClientProfileDataset): ClientTimelineEvent[] => {
  const events: ClientTimelineEvent[] = [];

  dataset.calendarRows.forEach((row) => {
    if (row.created_at) {
      events.push({
        id: `calendar-created-${row.id}`,
        moduleId: 'calendar',
        entityType: 'editorial_calendar',
        entityId: row.id,
        eventType: 'calendar_created',
        title: normalizeText(row.title, 'Post sem título'),
        description: 'Post criado no calendário editorial.',
        occurredAt: row.created_at,
      });
    }

    if (row.scheduled_date) {
      events.push({
        id: `calendar-scheduled-${row.id}`,
        moduleId: 'calendar',
        entityType: 'editorial_calendar',
        entityId: row.id,
        eventType: 'calendar_scheduled',
        title: normalizeText(row.title, 'Conteúdo sem título'),
        description: 'Conteúdo com data definida no calendário.',
        occurredAt: row.scheduled_date,
      });
    }
  });

  dataset.approvalRows.forEach((row) => {
    const occurredAt = row.created_at ?? row.updated_at;
    if (!occurredAt) return;

    events.push({
      id: `approval-sent-${row.id}`,
      moduleId: 'approval',
      entityType: 'approval_post',
      entityId: row.id,
      eventType: 'approval_sent',
      title: normalizeText(row.title, 'Conteúdo sem título'),
      description: 'Conteúdo enviado para aprovação.',
      occurredAt,
    });
  });

  dataset.approvalFeedbackRows.forEach((row) => {
    if (!row.created_at) return;

    const baseEvent = {
      id: `approval-feedback-${row.id}`,
      moduleId: 'approval' as const,
      entityType: 'approval_post' as const,
      entityId: row.post_id,
      title: normalizeText(row.reviewer_name, 'Cliente'),
      occurredAt: row.created_at,
    };

    if (row.status === 'approved') {
      events.push({
        ...baseEvent,
        eventType: 'approval_approved',
        description: normalizeText(row.comment, 'Conteúdo aprovado pelo cliente.'),
      });
      return;
    }

    if (row.status === 'rejected') {
      events.push({
        ...baseEvent,
        eventType: 'approval_rejected',
        description: normalizeText(row.comment, 'Conteúdo rejeitado pelo cliente.'),
      });
      return;
    }

    if (row.status === 'changes_requested') {
      events.push({
        ...baseEvent,
        eventType: 'approval_changes_requested',
        description: normalizeText(row.comment, 'Cliente solicitou ajustes no conteúdo.'),
      });
      return;
    }

    events.push({
      ...baseEvent,
      eventType: 'approval_comment',
      description: normalizeText(row.comment, 'Comentário recebido na aprovação.'),
    });
  });

  dataset.ideaRows.forEach((row) => {
    if (!row.created_at) return;

    events.push({
      id: `idea-created-${row.id}`,
      moduleId: 'ideas',
      entityType: 'idea',
      entityId: row.id,
      eventType: 'idea_created',
      title: normalizeText(row.title, 'Ideia sem título'),
      description: 'Nova ideia adicionada ao banco do cliente.',
      occurredAt: row.created_at,
    });
  });

  dataset.referenceRows.forEach((row) => {
    if (!row.created_at) return;

    events.push({
      id: `reference-created-${row.id}`,
      moduleId: 'references',
      entityType: 'reference',
      entityId: row.id,
      eventType: 'reference_created',
      title: normalizeText(row.title, 'Referência sem título'),
      description: 'Nova referência adicionada ao perfil do cliente.',
      occurredAt: row.created_at,
    });
  });

  dataset.taskCommentRows.forEach((row) => {
    if (!row.created_at) return;

    const label = MODULE_LABELS[
      row.entity_type === 'editorial_calendar'
        ? 'calendar'
        : row.entity_type === 'approval_post'
        ? 'approval'
        : row.entity_type === 'idea'
        ? 'ideas'
        : 'references'
    ];

    events.push({
      id: `workspace-comment-${row.id}`,
      moduleId:
        row.entity_type === 'editorial_calendar'
          ? 'calendar'
          : row.entity_type === 'approval_post'
          ? 'approval'
          : row.entity_type === 'idea'
          ? 'ideas'
          : 'references',
      entityType: row.entity_type,
      entityId: row.entity_id,
      eventType: 'workspace_comment',
      title: normalizeText(row.author_name, 'Equipe'),
      description: normalizeText(row.content, `Comentário interno registrado em ${label}.`),
      occurredAt: row.created_at,
    });
  });

  dataset.notes.forEach((note) => {
    events.push({
      id: `note-${note.id}`,
      moduleId: 'notes',
      eventType: 'note_created',
      title: 'Nota interna',
      description: note.content,
      occurredAt: note.createdAt,
    });
  });

  return events.sort((firstEvent, secondEvent) => {
    return new Date(secondEvent.occurredAt).getTime() - new Date(firstEvent.occurredAt).getTime();
  });
};

const loadCentralClientProfiles = async () => {
  if (!supabase) {
    return [];
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    return [];
  }

  const { data: ownProfilesData, error: ownProfilesError } = await supabase
    .from('client_profiles')
    .select('id, profile_name, avatar_url, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (ownProfilesError) throw ownProfilesError;

  const ownProfiles = (ownProfilesData ?? []) as ClientProfileRow[];

  // In the Central de Clientes, the master account's own profiles define its client base.
  // We only fall back to shared profiles when the logged-in account is member-only.
  if (ownProfiles.length > 0) {
    return ownProfiles;
  }

  const { data: membershipsData, error: membershipsError } = await supabase
    .from('workspace_members')
    .select('profile_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (membershipsError) throw membershipsError;

  const sharedProfileIds = unique(
    ((membershipsData ?? []) as WorkspaceMembershipRow[])
      .map((membership) => membership.profile_id)
      .filter((profileId): profileId is string => !!profileId)
      .filter((profileId) => !ownProfiles.some((profile) => profile.id === profileId))
  );

  let sharedProfiles: ClientProfileRow[] = [];

  if (sharedProfileIds.length > 0) {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('id, profile_name, avatar_url, created_at')
      .in('id', sharedProfileIds)
      .order('created_at', { ascending: true });

    if (error) throw error;
    sharedProfiles = (data ?? []) as ClientProfileRow[];
  }

  return [...ownProfiles, ...sharedProfiles];
};

const loadNotes = async (profileId: string): Promise<ClientProfileNote[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('client_profile_notes')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return ((data ?? []) as ClientProfileNoteRow[]).map(mapNoteRow);
  } catch (error) {
    if (hasMissingRelationError(error)) {
      return [];
    }

    throw error;
  }
};

const loadNotesByProfileIds = async (profileIds: string[]) => {
  const notesByProfileId = new Map<string, ClientProfileNote[]>();

  if (!supabase || profileIds.length === 0) {
    return notesByProfileId;
  }

  try {
    const { data, error } = await supabase
      .from('client_profile_notes')
      .select('*')
      .in('profile_id', profileIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    ((data ?? []) as ClientProfileNoteRow[]).forEach((row) => {
      const mappedRow = mapNoteRow(row);
      const currentNotes = notesByProfileId.get(mappedRow.profileId) ?? [];
      notesByProfileId.set(mappedRow.profileId, [...currentNotes, mappedRow]);
    });

    return notesByProfileId;
  } catch (error) {
    if (hasMissingRelationError(error)) {
      return notesByProfileId;
    }

    throw error;
  }
};

const loadApprovalFeedbackRows = async (
  approvalRows: ApprovalPostRow[]
): Promise<ApprovalFeedbackRow[]> => {
  if (!supabase || approvalRows.length === 0) {
    return [];
  }

  const postIds = approvalRows.map((row) => row.id);
  const profileIdByPostId = new Map(approvalRows.map((row) => [row.id, row.profile_id]));

  const withProfileIdResult = await supabase
    .from('approval_feedback')
    .select('id, post_id, profile_id, reviewer_name, comment, status, created_at')
    .in('post_id', postIds)
    .order('created_at', { ascending: false });

  if (!withProfileIdResult.error) {
    return ((withProfileIdResult.data ?? []) as Array<{
      id: string;
      post_id: string;
      profile_id?: string | null;
      reviewer_name: string | null;
      comment: string | null;
      status: string | null;
      created_at: string | null;
    }>).map((row) => ({
      id: row.id,
      post_id: row.post_id,
      profile_id: row.profile_id ?? profileIdByPostId.get(row.post_id) ?? '',
      reviewer_name: row.reviewer_name,
      comment: row.comment,
      status: row.status,
      created_at: row.created_at,
    }));
  }

  if (!hasMissingColumnError(withProfileIdResult.error, 'profile_id')) {
    throw withProfileIdResult.error;
  }

  const fallbackResult = await supabase
    .from('approval_feedback')
    .select('id, post_id, reviewer_name, comment, status, created_at')
    .in('post_id', postIds)
    .order('created_at', { ascending: false });

  if (fallbackResult.error) {
    throw fallbackResult.error;
  }

  return ((fallbackResult.data ?? []) as Array<{
    id: string;
    post_id: string;
    reviewer_name: string | null;
    comment: string | null;
    status: string | null;
    created_at: string | null;
  }>).map((row) => ({
    id: row.id,
    post_id: row.post_id,
    profile_id: profileIdByPostId.get(row.post_id) ?? '',
    reviewer_name: row.reviewer_name,
    comment: row.comment,
    status: row.status,
    created_at: row.created_at,
  }));
};

const loadProfileDataset = async (profileId: string): Promise<ClientProfileDataset | null> => {
  if (!supabase || !profileId) {
    return null;
  }

  const accessibleProfiles = await loadCentralClientProfiles();
  const profile = accessibleProfiles.find((currentProfile) => currentProfile.id === profileId);

  if (!profile) {
    return null;
  }

  const [
    calendarResult,
    approvalResult,
    ideaResult,
    referenceResult,
    taskCommentResult,
    assignmentResult,
    notes,
  ] = await Promise.all([
    supabase
      .from('editorial_calendar')
      .select('id, profile_id, title, description, status, scheduled_date, created_at, updated_at')
      .eq('profile_id', profileId),
    supabase
      .from('approval_posts')
      .select('id, profile_id, title, caption, status, created_at, updated_at')
      .eq('profile_id', profileId),
    supabase
      .from('ideas')
      .select('id, profile_id, title, description, status, created_at, updated_at')
      .eq('profile_id', profileId),
    supabase
      .from('reference_items')
      .select('id, profile_id, title, description, platform, source, created_at, updated_at')
      .eq('profile_id', profileId),
    supabase
      .from('workspace_task_comments')
      .select('id, profile_id, entity_type, entity_id, author_name, content, created_at')
      .eq('profile_id', profileId),
    supabase
      .from('workspace_task_assignments')
      .select('id, profile_id, entity_type, entity_id, member_id, created_at')
      .eq('profile_id', profileId),
    loadNotes(profileId),
  ]);

  if (calendarResult.error) throw calendarResult.error;
  if (approvalResult.error) throw approvalResult.error;
  if (ideaResult.error) throw ideaResult.error;
  if (referenceResult.error) throw referenceResult.error;
  if (taskCommentResult.error) throw taskCommentResult.error;
  if (assignmentResult.error) throw assignmentResult.error;

  const approvalRows = (approvalResult.data ?? []) as ApprovalPostRow[];
  const approvalFeedbackRows = await loadApprovalFeedbackRows(approvalRows);

  return {
    profile,
    calendarRows: (calendarResult.data ?? []) as CalendarRow[],
    approvalRows,
    approvalFeedbackRows,
    ideaRows: (ideaResult.data ?? []) as IdeaRow[],
    referenceRows: (referenceResult.data ?? []) as ReferenceRow[],
    taskCommentRows: (taskCommentResult.data ?? []) as WorkspaceTaskCommentRow[],
    assignmentRows: (assignmentResult.data ?? []) as WorkspaceTaskAssignmentRow[],
    notes,
  };
};

export const clientOperationsService = {
  async getClientProfilesSummary(): Promise<ClientProfileSummary[]> {
    if (!supabase) {
      return [];
    }

    const accessibleProfiles = await loadCentralClientProfiles();
    if (accessibleProfiles.length === 0) {
      return [];
    }

    const profileIds = accessibleProfiles.map((profile) => profile.id);
    const [
      calendarResult,
      approvalResult,
      ideaResult,
      referenceResult,
      taskCommentResult,
      assignmentResult,
      notesByProfileId,
    ] = await Promise.all([
      supabase
        .from('editorial_calendar')
        .select('id, profile_id, status, created_at, updated_at')
        .in('profile_id', profileIds),
      supabase
        .from('approval_posts')
        .select('id, profile_id, status, created_at, updated_at')
        .in('profile_id', profileIds),
      supabase
        .from('ideas')
        .select('id, profile_id, created_at, updated_at')
        .in('profile_id', profileIds),
      supabase
        .from('reference_items')
        .select('id, profile_id, created_at, updated_at')
        .in('profile_id', profileIds),
      supabase
        .from('workspace_task_comments')
        .select('id, profile_id, created_at')
        .in('profile_id', profileIds),
      supabase
        .from('workspace_task_assignments')
        .select('id, profile_id, entity_type, entity_id, created_at')
        .in('profile_id', profileIds),
      loadNotesByProfileIds(profileIds),
    ]);

    if (calendarResult.error) throw calendarResult.error;
    if (approvalResult.error) throw approvalResult.error;
    if (ideaResult.error) throw ideaResult.error;
    if (referenceResult.error) throw referenceResult.error;
    if (taskCommentResult.error) throw taskCommentResult.error;
    if (assignmentResult.error) throw assignmentResult.error;

    const calendarRows = (calendarResult.data ?? []) as Array<{
      id: string;
      profile_id: string;
      status: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>;
    const approvalRows = (approvalResult.data ?? []) as Array<{
      id: string;
      profile_id: string;
      status: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>;
    const ideaRows = (ideaResult.data ?? []) as Array<{
      id: string;
      profile_id: string;
      created_at: string | null;
      updated_at: string | null;
    }>;
    const referenceRows = (referenceResult.data ?? []) as Array<{
      id: string;
      profile_id: string;
      created_at: string | null;
      updated_at: string | null;
    }>;
    const taskCommentRows = (taskCommentResult.data ?? []) as Array<{
      id: string;
      profile_id: string;
      created_at: string | null;
    }>;
    const assignmentRows = (assignmentResult.data ?? []) as WorkspaceTaskAssignmentRow[];
    const approvalFeedbackRows = await loadApprovalFeedbackRows(
      approvalRows.map((row) => ({
        id: row.id,
        profile_id: row.profile_id,
        title: null,
        caption: null,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }))
    );

    return accessibleProfiles
      .map((profile) => {
        const profileCalendarRows = calendarRows.filter((row) => row.profile_id === profile.id);
        const profileApprovalRows = approvalRows.filter((row) => row.profile_id === profile.id);
        const profileIdeaRows = ideaRows.filter((row) => row.profile_id === profile.id);
        const profileReferenceRows = referenceRows.filter((row) => row.profile_id === profile.id);
        const profileCommentRows = taskCommentRows.filter((row) => row.profile_id === profile.id);
        const profileAssignmentRows = assignmentRows.filter((row) => row.profile_id === profile.id);
        const profileFeedbackRows = approvalFeedbackRows.filter(
          (row) => row.profile_id === profile.id
        );
        const notes = notesByProfileId.get(profile.id) ?? [];

        const lastActivityAt = getLatestIsoDate([
          ...profileCalendarRows.flatMap((row) => [row.updated_at, row.created_at]),
          ...profileApprovalRows.flatMap((row) => [row.updated_at, row.created_at]),
          ...profileIdeaRows.flatMap((row) => [row.updated_at, row.created_at]),
          ...profileReferenceRows.flatMap((row) => [row.updated_at, row.created_at]),
          ...profileCommentRows.map((row) => row.created_at),
          ...profileAssignmentRows.map((row) => row.created_at),
          ...profileFeedbackRows.map((row) => row.created_at),
          ...notes.map((note) => note.createdAt),
        ]);

        const stats = buildStats(
          profileCalendarRows.map((row) => ({
            id: row.id,
            profile_id: row.profile_id,
            title: null,
            description: null,
            status: row.status,
            scheduled_date: null,
            created_at: row.created_at,
            updated_at: row.updated_at,
          })),
          profileApprovalRows.map((row) => ({
            id: row.id,
            profile_id: row.profile_id,
            title: null,
            caption: null,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
          })),
          profileAssignmentRows,
          notes,
          lastActivityAt
        );

        return {
          id: profile.id,
          name: normalizeText(profile.profile_name, 'Cliente sem nome'),
          avatarUrl: profile.avatar_url ?? undefined,
          createdAt: profile.created_at ?? null,
          postsInCalendarCount: stats.postsInCalendarCount,
          pendingApprovalsCount: stats.pendingApprovalsCount,
          inProgressTasksCount: stats.inProgressTasksCount,
          openCalendarItemsCount: stats.openCalendarItemsCount,
          openApprovalItemsCount: stats.openApprovalItemsCount,
          assignedIdeaTasksCount: stats.assignedIdeaTasksCount,
          assignedReferenceTasksCount: stats.assignedReferenceTasksCount,
          lastActivityAt: stats.lastActivityAt,
          status: stats.status,
        };
      })
      .sort((firstProfile, secondProfile) => {
        const secondTime = new Date(secondProfile.lastActivityAt ?? secondProfile.createdAt ?? 0).getTime();
        const firstTime = new Date(firstProfile.lastActivityAt ?? firstProfile.createdAt ?? 0).getTime();
        return secondTime - firstTime;
      });
  },

  async getClientStats(profileId: string): Promise<ClientProfileStats | null> {
    const dataset = await loadProfileDataset(profileId);
    if (!dataset) return null;

    const lastActivityAt = getLatestIsoDate([
      ...dataset.calendarRows.flatMap((row) => [row.updated_at, row.created_at]),
      ...dataset.approvalRows.flatMap((row) => [row.updated_at, row.created_at]),
      ...dataset.approvalFeedbackRows.map((row) => row.created_at),
      ...dataset.ideaRows.flatMap((row) => [row.updated_at, row.created_at]),
      ...dataset.referenceRows.flatMap((row) => [row.updated_at, row.created_at]),
      ...dataset.taskCommentRows.map((row) => row.created_at),
      ...dataset.assignmentRows.map((row) => row.created_at),
      ...dataset.notes.map((note) => note.createdAt),
    ]);

    return buildStats(
      dataset.calendarRows,
      dataset.approvalRows,
      dataset.assignmentRows,
      dataset.notes,
      lastActivityAt
    );
  },

  async getClientTimeline(profileId: string): Promise<ClientTimelineEvent[]> {
    const dataset = await loadProfileDataset(profileId);
    if (!dataset) return [];
    return buildTimeline(dataset);
  },

  async getClientProfileDetail(profileId: string): Promise<ClientProfileDetail | null> {
    const dataset = await loadProfileDataset(profileId);
    if (!dataset) return null;

    const lastActivityAt = getLatestIsoDate([
      ...dataset.calendarRows.flatMap((row) => [row.updated_at, row.created_at]),
      ...dataset.approvalRows.flatMap((row) => [row.updated_at, row.created_at]),
      ...dataset.approvalFeedbackRows.map((row) => row.created_at),
      ...dataset.ideaRows.flatMap((row) => [row.updated_at, row.created_at]),
      ...dataset.referenceRows.flatMap((row) => [row.updated_at, row.created_at]),
      ...dataset.taskCommentRows.map((row) => row.created_at),
      ...dataset.assignmentRows.map((row) => row.created_at),
      ...dataset.notes.map((note) => note.createdAt),
    ]);

    const stats = buildStats(
      dataset.calendarRows,
      dataset.approvalRows,
      dataset.assignmentRows,
      dataset.notes,
      lastActivityAt
    );

    const tasks = await buildTasks(
      profileId,
      dataset.calendarRows,
      dataset.approvalRows,
      dataset.ideaRows,
      dataset.referenceRows,
      dataset.assignmentRows
    );

    return {
      profile: {
        id: dataset.profile.id,
        name: normalizeText(dataset.profile.profile_name, 'Cliente sem nome'),
        avatarUrl: dataset.profile.avatar_url ?? undefined,
        createdAt: dataset.profile.created_at ?? null,
      },
      stats,
      timeline: buildTimeline(dataset),
      recentApprovals: buildRecentApprovals(dataset.approvalRows),
      scheduledContent: buildScheduledContent(dataset.calendarRows),
      tasks,
      notes: dataset.notes,
    };
  },

  async listClientProfileNotes(profileId: string) {
    return loadNotes(profileId);
  },

  async createClientProfileNote(profileId: string, content: string): Promise<ClientProfileNote> {
    if (!supabase) {
      throw new Error('Supabase não está configurado.');
    }

    const trimmedContent = content.trim();

    if (!profileId) {
      throw new Error('Selecione um cliente válido antes de salvar a nota.');
    }

    if (!trimmedContent) {
      throw new Error('Escreva uma observação antes de salvar.');
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      throw new Error('Usuário não autenticado.');
    }

    try {
      const { data, error } = await supabase
        .from('client_profile_notes')
        .insert({
          profile_id: profileId,
          user_id: user.id,
          content: trimmedContent,
        })
        .select('*')
        .single();

      if (error) throw error;

      return mapNoteRow(data as ClientProfileNoteRow);
    } catch (error) {
      if (hasMissingRelationError(error)) {
        throw new Error(
          'A tabela de notas do cliente ainda não está disponível. Rode as migrations do Supabase e tente novamente.'
        );
      }

      throw error;
    }
  },
};
