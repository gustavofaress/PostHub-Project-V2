import type { TeamMember } from './workspaceMembers';

export type DemandEntityType =
  | 'editorial_calendar'
  | 'idea'
  | 'reference'
  | 'approval_post';

export type DemandModuleId = 'calendar' | 'kanban' | 'ideas' | 'references' | 'approval';

export interface WorkspaceTaskAssignment {
  id: string;
  profileId: string;
  entityType: DemandEntityType;
  entityId: string;
  memberId: string;
  createdAt: string;
}

export interface WorkspaceTaskComment {
  id: string;
  profileId: string;
  entityType: DemandEntityType;
  entityId: string;
  authorUserId?: string | null;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface WorkspaceDemandItem {
  id: string;
  profileId: string;
  entityType: DemandEntityType;
  moduleId: DemandModuleId;
  moduleLabel: string;
  title: string;
  description: string;
  status: string;
  updatedAt: string;
  metadata?: string[];
}

export const DEMAND_ENTITY_META: Record<
  DemandEntityType,
  { moduleId: DemandModuleId; moduleLabel: string; emptyCommentLabel: string }
> = {
  editorial_calendar: {
    moduleId: 'calendar',
    moduleLabel: 'Calendário / Kanban',
    emptyCommentLabel: 'Nenhum comentário neste card ainda.',
  },
  idea: {
    moduleId: 'ideas',
    moduleLabel: 'Ideias',
    emptyCommentLabel: 'Nenhum comentário nesta ideia ainda.',
  },
  reference: {
    moduleId: 'references',
    moduleLabel: 'Referências',
    emptyCommentLabel: 'Nenhum comentário nesta referência ainda.',
  },
  approval_post: {
    moduleId: 'approval',
    moduleLabel: 'Aprovação',
    emptyCommentLabel: 'Nenhum comentário neste item de aprovação ainda.',
  },
};

export const buildMemberMentionHandle = (member: Pick<TeamMember, 'name' | 'email'>) => {
  const base = (member.name || member.email.split('@')[0] || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

  return base || member.email.split('@')[0].toLowerCase();
};
