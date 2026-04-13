import {
  Calendar,
  CheckCircle2,
  KanbanSquare,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import * as React from 'react';

export type TeamPermissionId =
  | 'scripts'
  | 'ideas'
  | 'approval'
  | 'calendar'
  | 'kanban'
  | 'references'
  | 'scheduler'
  | 'reports'
  | 'performance';

export type TeamMemberRole = 'owner' | 'admin' | 'editor' | 'reviewer';
export type TeamMemberStatus = 'invited' | 'active' | 'disabled';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  permissions: TeamPermissionId[];
  createdAt: string;
  inviteSentAt: string;
  userId?: string | null;
}

export interface TeamPermissionOption {
  id: TeamPermissionId;
  label: string;
  description: string;
  icon: React.ElementType;
}

export const WORKSPACE_PERMISSION_OPTIONS: TeamPermissionOption[] = [
  {
    id: 'ideas',
    label: 'Ideias',
    description: 'Organizar pautas, referências e prioridades criativas.',
    icon: Lightbulb,
  },
  {
    id: 'approval',
    label: 'Aprovações',
    description: 'Responder feedbacks e validar entregas.',
    icon: CheckCircle2,
  },
  {
    id: 'calendar',
    label: 'Calendário',
    description: 'Planejar campanhas e movimentar a agenda editorial.',
    icon: Calendar,
  },
  {
    id: 'kanban',
    label: 'Kanban',
    description: 'Atualizar status e acompanhar produção das tarefas.',
    icon: KanbanSquare,
  },
  {
    id: 'references',
    label: 'Referências',
    description: 'Organizar referências visuais, links e materiais de apoio.',
    icon: Sparkles,
  },
  {
    id: 'scheduler',
    label: 'Publicação',
    description: 'Agendar conteúdos e gerenciar fila de postagem.',
    icon: Sparkles,
  },
  {
    id: 'reports',
    label: 'Relatórios',
    description: 'Montar e exportar relatórios do cliente.',
    icon: ShieldCheck,
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'Consultar métricas e acompanhar resultados.',
    icon: TrendingUp,
  },
];

export const DEFAULT_MEMBER_PERMISSIONS: TeamPermissionId[] = ['ideas', 'kanban'];
