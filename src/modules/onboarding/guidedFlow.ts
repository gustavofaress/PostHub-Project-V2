import type { WorkspaceModule } from '../../shared/constants/navigation';

export type GuidedFlowStepId =
  | 'references'
  | 'ideas'
  | 'calendar'
  | 'kanban'
  | 'approval';

export type GuidedTourStepId =
  | 'references-nav'
  | 'references-open-add'
  | 'references-save'
  | 'ideas-nav'
  | 'ideas-open-add'
  | 'ideas-save'
  | 'calendar-nav'
  | 'calendar-open-add'
  | 'calendar-save'
  | 'kanban-nav'
  | 'kanban-open-add'
  | 'kanban-save'
  | 'approval-nav'
  | 'approval-open-create'
  | 'approval-save';

export type GuidedPopoverPlacement = 'right' | 'bottom' | 'top';

export interface GuidedFlowStep {
  id: GuidedFlowStepId;
  title: string;
  description: string;
  module: WorkspaceModule;
  path: string;
}

export interface GuidedTourStep {
  id: GuidedTourStepId;
  parentStepId: GuidedFlowStepId;
  targetId: string;
  fallbackTargetId?: string;
  title: string;
  description: string;
  fallbackDescription?: string;
  buttonLabel: string;
  placement: GuidedPopoverPlacement;
  advanceMode: 'immediate' | 'manual_success';
}

export const GUIDED_FLOW_STEPS: GuidedFlowStep[] = [
  {
    id: 'references',
    title: 'Módulo de Referências',
    description: 'Comece organizando inspirações, prints, links e materiais do cliente.',
    module: 'references',
    path: '/workspace/references',
  },
  {
    id: 'ideas',
    title: 'Banco de Ideias',
    description: 'Transforme as referências em ideias e pautas organizadas.',
    module: 'ideas',
    path: '/workspace/ideas',
  },
  {
    id: 'calendar',
    title: 'Calendário Editorial',
    description: 'Mostre como as ideias entram no planejamento editorial.',
    module: 'calendar',
    path: '/workspace/calendar',
  },
  {
    id: 'kanban',
    title: 'Kanban de Produção',
    description: 'Apresente o acompanhamento do conteúdo dentro da operação.',
    module: 'kanban',
    path: '/workspace/kanban',
  },
  {
    id: 'approval',
    title: 'Aprovação',
    description: 'Finalize mostrando como o cliente acompanha e aprova as entregas.',
    module: 'approval',
    path: '/workspace/approval',
  },
];

export const GUIDED_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'references-nav',
    parentStepId: 'references',
    targetId: 'sidebar-references',
    title: 'Passo #1',
    description: 'Vá ao módulo de referência para começar o processo guiado.',
    buttonLabel: 'Próximo',
    placement: 'right',
    advanceMode: 'immediate',
  },
  {
    id: 'references-open-add',
    parentStepId: 'references',
    targetId: 'references-add-button',
    title: 'Passo #1',
    description: 'Abra a criação de referência para adicionar uma nova sugestão de conteúdo.',
    buttonLabel: 'Próximo',
    placement: 'bottom',
    advanceMode: 'immediate',
  },
  {
    id: 'references-save',
    parentStepId: 'references',
    targetId: 'references-save-button',
    fallbackTargetId: 'references-add-button',
    title: 'Passo #1',
    description: 'Preencha os campos e clique em Próximo para salvar a referência.',
    fallbackDescription:
      'Abra o modal de referência novamente. Depois o balão vai seguir para o botão de salvar.',
    buttonLabel: 'Próximo',
    placement: 'top',
    advanceMode: 'manual_success',
  },
  {
    id: 'ideas-nav',
    parentStepId: 'ideas',
    targetId: 'sidebar-ideas',
    title: 'Passo #2',
    description: 'Agora vá ao banco de ideias para transformar a referência em pauta.',
    buttonLabel: 'Próximo',
    placement: 'right',
    advanceMode: 'immediate',
  },
  {
    id: 'ideas-open-add',
    parentStepId: 'ideas',
    targetId: 'ideas-add-button',
    title: 'Passo #2',
    description: 'Abra a criação de ideia para registrar uma nova sugestão.',
    buttonLabel: 'Próximo',
    placement: 'bottom',
    advanceMode: 'immediate',
  },
  {
    id: 'ideas-save',
    parentStepId: 'ideas',
    targetId: 'ideas-save-button',
    fallbackTargetId: 'ideas-add-button',
    title: 'Passo #2',
    description: 'Preencha a ideia e clique em Próximo para salvar.',
    fallbackDescription:
      'Abra o modal de ideia novamente. Depois o balão vai acompanhar o botão de salvar.',
    buttonLabel: 'Próximo',
    placement: 'top',
    advanceMode: 'manual_success',
  },
  {
    id: 'calendar-nav',
    parentStepId: 'calendar',
    targetId: 'sidebar-calendar',
    title: 'Passo #3',
    description: 'Agora vá ao calendário editorial para planejar o conteúdo.',
    buttonLabel: 'Próximo',
    placement: 'right',
    advanceMode: 'immediate',
  },
  {
    id: 'calendar-open-add',
    parentStepId: 'calendar',
    targetId: 'calendar-add-button',
    title: 'Passo #3',
    description: 'Abra o formulário de agendamento para criar um novo post.',
    buttonLabel: 'Próximo',
    placement: 'bottom',
    advanceMode: 'immediate',
  },
  {
    id: 'calendar-save',
    parentStepId: 'calendar',
    targetId: 'calendar-save-button',
    fallbackTargetId: 'calendar-add-button',
    title: 'Passo #3',
    description: 'Preencha o agendamento e clique em Próximo para salvar o post.',
    fallbackDescription:
      'Abra o modal do calendário novamente. Depois o balão vai seguir para salvar o post.',
    buttonLabel: 'Próximo',
    placement: 'top',
    advanceMode: 'manual_success',
  },
  {
    id: 'kanban-nav',
    parentStepId: 'kanban',
    targetId: 'sidebar-kanban',
    title: 'Passo #4',
    description: 'Vá ao Kanban para acompanhar o conteúdo dentro da operação.',
    buttonLabel: 'Próximo',
    placement: 'right',
    advanceMode: 'immediate',
  },
  {
    id: 'kanban-open-add',
    parentStepId: 'kanban',
    targetId: 'kanban-add-button',
    title: 'Passo #4',
    description: 'Abra a criação de tarefa para colocar esse conteúdo em produção.',
    buttonLabel: 'Próximo',
    placement: 'bottom',
    advanceMode: 'immediate',
  },
  {
    id: 'kanban-save',
    parentStepId: 'kanban',
    targetId: 'kanban-save-button',
    fallbackTargetId: 'kanban-add-button',
    title: 'Passo #4',
    description: 'Preencha a tarefa e clique em Próximo para salvar no Kanban.',
    fallbackDescription:
      'Abra o modal da tarefa novamente. Depois o balão vai seguir para salvar no Kanban.',
    buttonLabel: 'Próximo',
    placement: 'top',
    advanceMode: 'manual_success',
  },
  {
    id: 'approval-nav',
    parentStepId: 'approval',
    targetId: 'sidebar-approval',
    title: 'Passo #5',
    description: 'Agora vá ao módulo de aprovação para fechar o fluxo com o cliente.',
    buttonLabel: 'Próximo',
    placement: 'right',
    advanceMode: 'immediate',
  },
  {
    id: 'approval-open-create',
    parentStepId: 'approval',
    targetId: 'approval-open-create-button',
    title: 'Passo #5',
    description: 'Abra a criação da solicitação de aprovação.',
    buttonLabel: 'Próximo',
    placement: 'bottom',
    advanceMode: 'immediate',
  },
  {
    id: 'approval-save',
    parentStepId: 'approval',
    targetId: 'approval-save-button',
    fallbackTargetId: 'approval-open-create-button',
    title: 'Passo #5',
    description: 'Preencha a solicitação e clique em Próximo para concluir o setup.',
    fallbackDescription:
      'Abra a criação de aprovação novamente. Depois o balão vai acompanhar o botão de concluir.',
    buttonLabel: 'Concluir',
    placement: 'top',
    advanceMode: 'manual_success',
  },
];

export const isGuidedFlowStepId = (value: string | null | undefined): value is GuidedFlowStepId =>
  GUIDED_FLOW_STEPS.some((step) => step.id === value);

export const isGuidedTourStepId = (value: string | null | undefined): value is GuidedTourStepId =>
  GUIDED_TOUR_STEPS.some((step) => step.id === value);

export const getGuidedFlowStep = (stepId: GuidedFlowStepId) =>
  GUIDED_FLOW_STEPS.find((step) => step.id === stepId) ?? GUIDED_FLOW_STEPS[0];

export const getGuidedFlowStepByTourStep = (tourStepId: GuidedTourStepId) => {
  const tourStep = GUIDED_TOUR_STEPS.find((step) => step.id === tourStepId) ?? GUIDED_TOUR_STEPS[0];
  return getGuidedFlowStep(tourStep.parentStepId);
};

export const getGuidedTourStep = (stepId: GuidedTourStepId) =>
  GUIDED_TOUR_STEPS.find((step) => step.id === stepId) ?? GUIDED_TOUR_STEPS[0];

export const getFirstTourStepForFlowStep = (stepId: GuidedFlowStepId) =>
  GUIDED_TOUR_STEPS.find((step) => step.parentStepId === stepId) ?? GUIDED_TOUR_STEPS[0];

export const getNextGuidedTourStep = (stepId: GuidedTourStepId) => {
  const currentIndex = GUIDED_TOUR_STEPS.findIndex((step) => step.id === stepId);
  if (currentIndex === -1) return null;
  return GUIDED_TOUR_STEPS[currentIndex + 1] ?? null;
};

export const normalizeCompletedGuidedSteps = (value: unknown): GuidedFlowStepId[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((stepId): stepId is GuidedFlowStepId => isGuidedFlowStepId(String(stepId)));
};

export const getCurrentGuidedTourStepId = (
  currentStep: string | null | undefined,
  completedSteps: GuidedFlowStepId[],
  setupCompleted = false
): GuidedTourStepId | null => {
  if (setupCompleted) return null;

  if (isGuidedTourStepId(currentStep)) return currentStep;
  if (isGuidedFlowStepId(currentStep)) return getFirstTourStepForFlowStep(currentStep).id;

  const firstPendingStep = GUIDED_FLOW_STEPS.find((step) => !completedSteps.includes(step.id));
  return firstPendingStep ? getFirstTourStepForFlowStep(firstPendingStep.id).id : GUIDED_TOUR_STEPS[0].id;
};
