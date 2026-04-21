import type { WorkspaceModule } from '../../shared/constants/navigation';

export type GuidedFlowStepId =
  | 'references'
  | 'ideas'
  | 'calendar'
  | 'kanban'
  | 'approval';

export type GuidedTourStepId =
  | 'setup-guide-start'
  | 'references-nav'
  | 'references-add'
  | 'ideas-nav'
  | 'ideas-add'
  | 'calendar-nav'
  | 'calendar-schedule'
  | 'calendar-save'
  | 'kanban-move'
  | 'approval-nav'
  | 'approval-create'
  | 'approval-preview';

export type GuidedTourNextAction = 'click_target' | 'advance_only' | 'wait_for_action';

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
  title: string;
  description: string;
  buttonLabel: string;
  placement: GuidedPopoverPlacement;
  nextAction: GuidedTourNextAction;
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
    title: 'Kanban Editorial',
    description: 'Apresente o acompanhamento do conteúdo dentro da operação.',
    module: 'kanban',
    path: '/workspace/kanban',
  },
  {
    id: 'approval',
    title: 'Módulo de Aprovação',
    description: 'Finalize mostrando como o cliente acompanha e aprova as entregas.',
    module: 'approval',
    path: '/workspace/approval',
  },
];

export const GUIDED_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'setup-guide-start',
    parentStepId: 'references',
    targetId: 'setup-guide-start-button',
    title: 'Passo #1',
    description: 'Comece pelo setup guide para iniciar o tour guiado do seu processo criativo.',
    buttonLabel: 'Próximo',
    placement: 'bottom',
    nextAction: 'click_target',
  },
  {
    id: 'references-nav',
    parentStepId: 'references',
    targetId: 'sidebar-references',
    title: 'Passo #2',
    description: 'Abra o módulo de referências pela barra lateral.',
    buttonLabel: 'Próximo',
    placement: 'right',
    nextAction: 'click_target',
  },
  {
    id: 'references-add',
    parentStepId: 'references',
    targetId: 'references-add-button',
    title: 'Passo #3',
    description: 'Agora clique para adicionar uma nova referência.',
    buttonLabel: 'Próximo',
    placement: 'bottom',
    nextAction: 'click_target',
  },
  {
    id: 'ideas-nav',
    parentStepId: 'ideas',
    targetId: 'sidebar-ideas',
    title: 'Passo #4',
    description: 'Siga para o banco de ideias pelo menu lateral.',
    buttonLabel: 'Próximo',
    placement: 'right',
    nextAction: 'click_target',
  },
  {
    id: 'ideas-add',
    parentStepId: 'ideas',
    targetId: 'ideas-add-button',
    title: 'Passo #5',
    description: 'Clique em adicionar ideia para abrir o próximo passo do processo.',
    buttonLabel: 'Próximo',
    placement: 'bottom',
    nextAction: 'click_target',
  },
  {
    id: 'calendar-nav',
    parentStepId: 'calendar',
    targetId: 'sidebar-calendar',
    title: 'Passo #6',
    description: 'Agora vá para o calendário editorial na sidebar.',
    buttonLabel: 'Próximo',
    placement: 'right',
    nextAction: 'click_target',
  },
  {
    id: 'calendar-schedule',
    parentStepId: 'calendar',
    targetId: 'calendar-add-button',
    title: 'Passo #7',
    description: 'Clique em agendar post para abrir o cadastro da tarefa no calendário.',
    buttonLabel: 'Próximo',
    placement: 'bottom',
    nextAction: 'click_target',
  },
  {
    id: 'calendar-save',
    parentStepId: 'calendar',
    targetId: 'calendar-save-button',
    title: 'Passo #8',
    description: 'Preencha o título da tarefa e salve. Depois disso, vamos abrir o Kanban com esse card.',
    buttonLabel: 'Aguardando cadastro',
    placement: 'top',
    nextAction: 'wait_for_action',
  },
  {
    id: 'kanban-move',
    parentStepId: 'kanban',
    targetId: 'kanban-tour-card',
    title: 'Passo #9',
    description: 'Arraste a tarefa criada para a próxima coluna para testar a mudança de fase.',
    buttonLabel: 'Aguardando movimento',
    placement: 'bottom',
    nextAction: 'wait_for_action',
  },
  {
    id: 'approval-nav',
    parentStepId: 'approval',
    targetId: 'sidebar-approval',
    title: 'Passo #10',
    description: 'Siga para o módulo de aprovação pela sidebar.',
    buttonLabel: 'Próximo',
    placement: 'right',
    nextAction: 'click_target',
  },
  {
    id: 'approval-create',
    parentStepId: 'approval',
    targetId: 'approval-open-create-button',
    title: 'Passo #11',
    description: 'Clique em criar aprovação para abrir a área de revisão.',
    buttonLabel: 'Próximo',
    placement: 'bottom',
    nextAction: 'click_target',
  },
  {
    id: 'approval-preview',
    parentStepId: 'approval',
    targetId: 'approval-internal-preview-button',
    title: 'Passo #12',
    description: 'Agora verifique a preview interna para finalizar a configuração guiada.',
    buttonLabel: 'Próximo',
    placement: 'top',
    nextAction: 'click_target',
  },
];

export const DEFAULT_GUIDED_TOUR_STEP_ID = GUIDED_TOUR_STEPS[0].id;

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

  if (currentStep === 'kanban-nav' || currentStep === 'kanban-add') {
    return 'calendar-nav';
  }

  if (isGuidedTourStepId(currentStep)) return currentStep;
  if (isGuidedFlowStepId(currentStep)) return getFirstTourStepForFlowStep(currentStep).id;

  if (completedSteps.length === 0) return DEFAULT_GUIDED_TOUR_STEP_ID;

  const firstPendingStep = GUIDED_FLOW_STEPS.find((step) => !completedSteps.includes(step.id));
  return firstPendingStep ? getFirstTourStepForFlowStep(firstPendingStep.id).id : null;
};
