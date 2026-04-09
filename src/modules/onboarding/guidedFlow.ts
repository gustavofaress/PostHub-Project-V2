import type { WorkspaceModule } from '../../shared/constants/navigation';

export type GuidedFlowStepId =
  | 'references'
  | 'ideas'
  | 'calendar'
  | 'kanban'
  | 'approval';

export interface GuidedFlowStep {
  id: GuidedFlowStepId;
  title: string;
  description: string;
  module: WorkspaceModule;
  path: string;
  nextLabel: string;
}

export const GUIDED_FLOW_STEPS: GuidedFlowStep[] = [
  {
    id: 'references',
    title: 'Módulo de Referência',
    description: 'Comece entendendo onde guardar inspirações, links e materiais do cliente.',
    module: 'references',
    path: '/workspace/references',
    nextLabel: 'Próximo: Ideias',
  },
  {
    id: 'ideas',
    title: 'Banco de Ideias',
    description: 'Aqui o cliente visualiza onde transformar referências em pautas e ideias.',
    module: 'ideas',
    path: '/workspace/ideas',
    nextLabel: 'Próximo: Calendário',
  },
  {
    id: 'calendar',
    title: 'Calendário Editorial',
    description: 'Mostre como o planejamento sai das ideias e vira organização editorial.',
    module: 'calendar',
    path: '/workspace/calendar',
    nextLabel: 'Próximo: Kanban',
  },
  {
    id: 'kanban',
    title: 'Kanban de Produção',
    description: 'Apresente o acompanhamento do conteúdo dentro do fluxo operacional.',
    module: 'kanban',
    path: '/workspace/kanban',
    nextLabel: 'Próximo: Aprovação',
  },
  {
    id: 'approval',
    title: 'Aprovação',
    description: 'Finalize mostrando como o cliente acompanha e aprova as entregas.',
    module: 'approval',
    path: '/workspace/approval',
    nextLabel: 'Concluir setup',
  },
];

export const isGuidedFlowStepId = (value: string | null | undefined): value is GuidedFlowStepId =>
  GUIDED_FLOW_STEPS.some((step) => step.id === value);

export const getGuidedFlowStep = (stepId: string | null | undefined) =>
  GUIDED_FLOW_STEPS.find((step) => step.id === stepId) ?? GUIDED_FLOW_STEPS[0];

export const getNextGuidedFlowStep = (stepId: GuidedFlowStepId) => {
  const currentIndex = GUIDED_FLOW_STEPS.findIndex((step) => step.id === stepId);
  if (currentIndex === -1) return null;
  return GUIDED_FLOW_STEPS[currentIndex + 1] ?? null;
};

export const normalizeCompletedGuidedSteps = (value: unknown): GuidedFlowStepId[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((stepId): stepId is GuidedFlowStepId => isGuidedFlowStepId(String(stepId)));
};

export const getCurrentGuidedFlowStepId = (
  currentStep: string | null | undefined,
  completedSteps: GuidedFlowStepId[],
  setupCompleted = false
): GuidedFlowStepId | null => {
  if (setupCompleted) return null;
  if (isGuidedFlowStepId(currentStep)) return currentStep;

  const firstPendingStep = GUIDED_FLOW_STEPS.find((step) => !completedSteps.includes(step.id));
  return firstPendingStep?.id ?? GUIDED_FLOW_STEPS[GUIDED_FLOW_STEPS.length - 1].id;
};
