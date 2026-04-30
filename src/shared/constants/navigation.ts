import * as React from 'react';
import {
  LayoutDashboard,
  Lightbulb,
  Calendar,
  Trello,
  Building2,
  Settings,
  User,
  CheckCircle,
  BarChart3,
  MessageSquare,
  Clock,
  BookOpen,
  Share2,
  HelpCircle,
  CreditCard,
  Rocket,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';

export type WorkspaceModule =
  | 'onboarding'
  | 'dashboard'
  | 'consultant'
  | 'scripts'
  | 'ideas'
  | 'approval'
  | 'calendar'
  | 'kanban'
  | 'clients'
  | 'scheduler'
  | 'performance'
  | 'reports'
  | 'references'
  | 'integrations'
  | 'settings'
  | 'account'
  | 'credits'
  | 'support'
  | 'admin';

export interface Profile {
  id: string;
  name: string;
  image?: string;
  handle: string;
}

export const MOCK_PROFILES: Profile[] = [
  {
    id: '1',
    name: 'Acme Corp',
    handle: '@acme_corp',
    image: 'https://picsum.photos/seed/acme/100/100',
  },
  {
    id: '2',
    name: 'Personal Brand',
    handle: '@gustavo_fares',
    image: 'https://picsum.photos/seed/gustavo/100/100',
  },
  {
    id: '3',
    name: 'Tech Agency',
    handle: '@tech_agency',
    image: 'https://picsum.photos/seed/tech/100/100',
  },
];

export interface NavSubItem {
  label: string;
  path: string;
}

export interface NavItem {
  id: WorkspaceModule;
  label: string;
  description?: string;
  icon: React.ElementType;
  path: string;
  subItems?: NavSubItem[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const HIDDEN_WORKSPACE_MODULE_IDS: WorkspaceModule[] = [
  'scheduler',
  'performance',
  'integrations',
];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Visão Geral',
    items: [
      {
        id: 'onboarding',
        label: 'Guia de Configuração',
        description: 'Configure seu workspace e conecte seus canais sociais.',
        icon: Rocket,
        path: '/workspace/onboarding',
        subItems: [
          { label: 'Tutorial de Boas-Vindas', path: '/workspace/onboarding' },
          { label: 'Conectar Contas', path: '/workspace/onboarding?tab=accounts' },
          { label: 'Convidar Equipe', path: '/workspace/onboarding?tab=team' },
          { label: 'Configurar Marca', path: '/workspace/onboarding?tab=brand' },
        ],
      },
      {
        id: 'dashboard',
        label: 'Visão Geral do Workspace',
        description: 'Seu painel central para operações de conteúdo e tarefas do dia a dia.',
        icon: LayoutDashboard,
        path: '/workspace/dashboard',
        subItems: [
          { label: 'Atividade Recente', path: '/workspace/dashboard' },
          { label: 'Próximos Prazos', path: '/workspace/dashboard?tab=deadlines' },
          { label: 'Ações Rápidas', path: '/workspace/dashboard?tab=actions' },
          { label: 'Atualizações da Equipe', path: '/workspace/dashboard?tab=updates' },
        ],
      },
    ],
  },
  {
    label: 'Criação de Conteúdo',
    items: [
      {
        id: 'ideas',
        label: 'Banco de Ideias',
        description: 'Capture, organize e priorize seus insights criativos.',
        icon: Lightbulb,
        path: '/workspace/ideas',
        subItems: [
          { label: 'Banco de Ideias', path: '/workspace/ideas' },
          { label: 'Tags e Prioridades', path: '/workspace/ideas?tab=tags' },
          { label: 'Inspirações', path: '/workspace/ideas?tab=inspiration' },
          { label: 'Alertas de Tendência', path: '/workspace/ideas?tab=trends' },
        ],
      },
      {
        id: 'approval',
        label: 'Revisão e Aprovação',
        description: 'Acompanhe status, mockups e histórico das aprovações vindas do calendário.',
        icon: CheckCircle,
        path: '/workspace/approval',
        subItems: [
          { label: 'Central de Aprovações', path: '/workspace/approval' },
          { label: 'Status dos Posts', path: '/workspace/approval?tab=status' },
          { label: 'Mockups e Preview', path: '/workspace/approval?tab=preview' },
          { label: 'Histórico de Aprovação', path: '/workspace/approval?tab=history' },
        ],
      },
    ],
  },
  {
    label: 'Gestão',
    items: [
      {
        id: 'calendar',
        label: 'Calendário Editorial',
        description: 'Visualize e organize todo o seu fluxo de produção de conteúdo.',
        icon: Calendar,
        path: '/workspace/calendar',
        subItems: [
          { label: 'Planejamento Editorial', path: '/workspace/calendar' },
          { label: 'Visão Mensal', path: '/workspace/calendar?view=month' },
          { label: 'Organização de Conteúdo', path: '/workspace/calendar?view=org' },
          { label: 'Campanhas', path: '/workspace/calendar?view=campaigns' },
        ],
      },
      {
        id: 'kanban',
        label: 'Quadro de Produção',
        description: 'Acompanhe o status do conteúdo da ideia até a entrega final.',
        icon: Trello,
        path: '/workspace/kanban',
        subItems: [
          { label: 'Sprints Ativos', path: '/workspace/kanban' },
          { label: 'Etapa de Revisão', path: '/workspace/kanban?tab=review' },
          { label: 'Pronto para Publicar', path: '/workspace/kanban?tab=ready' },
          { label: 'Tarefas Arquivadas', path: '/workspace/kanban?tab=archived' },
        ],
      },
      {
        id: 'clients',
        label: 'Central de Clientes',
        description:
          'Centralize agenda, aprovações, histórico, tarefas e notas internas de cada cliente em um único painel.',
        icon: Building2,
        path: '/workspace/clients',
        subItems: [
          { label: 'Visão por Cliente', path: '/workspace/clients' },
          { label: 'Atividade Recente', path: '/workspace/clients?view=activity' },
          { label: 'Notas Internas', path: '/workspace/clients?view=notes' },
        ],
      },
    ],
  },
  {
    label: 'Estratégia e Crescimento',
    items: [
      {
        id: 'performance',
        label: 'Análises e Insights',
        description: 'Meça impacto, acompanhe crescimento e otimize sua estratégia.',
        icon: BarChart3,
        path: '/workspace/performance',
        subItems: [
          { label: 'Visão Geral Multicanal', path: '/workspace/performance' },
          { label: 'Instagram Uploads', path: '/workspace/performance?tab=instagram-uploads' },
          { label: 'Demografia da Audiência', path: '/workspace/performance?tab=audience' },
          { label: 'Posts com Melhor Desempenho', path: '/workspace/performance?tab=top' },
          { label: 'Relatórios Personalizados', path: '/workspace/performance?tab=reports' },
        ],
      },
      {
        id: 'reports',
        label: 'Relatórios',
        description:
          'Monte relatórios profissionais white-label para clientes, configure períodos, escolha seções, visualize o resultado e exporte em PDF.',
        icon: TrendingUp,
        path: '/workspace/reports',
        subItems: [
          { label: 'Construtor de Relatórios', path: '/workspace/reports' },
          { label: 'Seleção de Período', path: '/workspace/reports?tab=period' },
          { label: 'Seções Incluídas', path: '/workspace/reports?tab=sections' },
          { label: 'Prévia e Observações', path: '/workspace/reports?tab=preview' },
          { label: 'Exportar PDF', path: '/workspace/reports?tab=export' },
        ],
      },
      {
        id: 'references',
        label: 'Referências',
        description: 'Organize conteúdos inspiradores e acompanhe estratégias da concorrência.',
        icon: BookOpen,
        path: '/workspace/references',
        subItems: [
          { label: 'Links Salvos', path: '/workspace/references' },
          { label: 'Monitoramento de Concorrentes', path: '/workspace/references?tab=competitors' },
          { label: 'Biblioteca de Áudio', path: '/workspace/references?tab=audio' },
          { label: 'Recursos Visuais', path: '/workspace/references?tab=assets' },
        ],
      },
    ],
  },
  {
    label: 'Sistema',
    items: [
      {
        id: 'integrations',
        label: 'Integrações',
        description: 'Gerencie contas sociais conectadas e ferramentas de terceiros.',
        icon: Share2,
        path: '/workspace/integrations',
        subItems: [
          { label: 'Plataformas Sociais', path: '/workspace/integrations' },
          { label: 'Armazenamento em Nuvem', path: '/workspace/integrations?tab=storage' },
          { label: 'Webhooks da API', path: '/workspace/integrations?tab=webhooks' },
        ],
      },
      {
        id: 'settings',
        label: 'Organização de Demandas',
        description: 'Gerencie membros, acessos, responsáveis e a operação das demandas do workspace.',
        icon: Settings,
        path: '/workspace/settings',
        subItems: [
          { label: 'Gestão da Equipe', path: '/workspace/settings' },
          { label: 'Demandas do Workspace', path: '/workspace/settings?tab=demands' },
          { label: 'Credenciais de Membros', path: '/workspace/settings?tab=members' },
          { label: 'Permissões Operacionais', path: '/workspace/settings?tab=permissions' },
        ],
      },
      {
        id: 'account',
        label: 'Perfil Pessoal',
        description: 'Gerencie seus dados pessoais e configurações de segurança.',
        icon: User,
        path: '/workspace/account',
        subItems: [
          { label: 'Dados do Perfil', path: '/workspace/account' },
          { label: 'Segurança e Senha', path: '/workspace/account?tab=security' },
          { label: 'Sessões Ativas', path: '/workspace/account?tab=sessions' },
        ],
      },
      {
        id: 'credits',
        label: 'Uso de IA',
        description: 'Acompanhe seus créditos e limites de geração com IA.',
        icon: CreditCard,
        path: '/workspace/credits',
        subItems: [
          { label: 'Saldo Atual', path: '/workspace/credits' },
          { label: 'Histórico de Uso', path: '/workspace/credits?tab=history' },
          { label: 'Fazer Upgrade', path: '/workspace/credits?tab=upgrade' },
        ],
      },
      {
        id: 'support',
        label: 'Central de Ajuda',
        description: 'Acesse tutoriais, documentação e suporte ao cliente.',
        icon: HelpCircle,
        path: '/workspace/support',
        subItems: [
          { label: 'Base de Conhecimento', path: '/workspace/support' },
          { label: 'Tutoriais em Vídeo', path: '/workspace/support?tab=videos' },
          { label: 'Falar com o Suporte', path: '/workspace/support?tab=contact' },
          { label: 'Solicitações de Funcionalidade', path: '/workspace/support?tab=requests' },
        ],
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        id: 'admin',
        label: 'Painel Administrativo',
        description: 'Gerencie usuários e acompanhe o progresso do onboarding.',
        icon: ShieldAlert,
        path: '/workspace/admin',
        subItems: [{ label: 'Gestão de Usuários', path: '/workspace/admin' }],
      },
    ],
  },
];
