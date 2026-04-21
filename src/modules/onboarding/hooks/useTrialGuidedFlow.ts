import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../../app/context/AppContext';
import { useAuth } from '../../../app/context/AuthContext';
import { onboardingService } from '../../../services/onboarding.service';
import {
  getCurrentGuidedTourStepId,
  getFirstTourStepForFlowStep,
  getGuidedFlowStep,
  getGuidedFlowStepByTourStep,
  getGuidedTourStep,
  getNextGuidedTourStep,
  GUIDED_FLOW_STEPS,
  normalizeCompletedGuidedSteps,
  type GuidedFlowStepId,
  type GuidedTourStepId,
} from '../guidedFlow';

export const TOUR_COMPLETION_CELEBRATION_KEY = 'posthub_trial_guided_flow_celebration';

export const useTrialGuidedFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveModule } = useApp();
  const { user, refreshUser } = useAuth();
  const [isSaving, setIsSaving] = React.useState(false);

  const completedSteps = React.useMemo(
    () => normalizeCompletedGuidedSteps(user?.onboarding?.guided_steps_completed ?? []),
    [user?.onboarding?.guided_steps_completed]
  );

  const currentTourStepId = React.useMemo(
    () =>
      getCurrentGuidedTourStepId(
        user?.onboarding?.guided_current_step,
        completedSteps,
        user?.onboarding?.setup_completed
      ),
    [
      completedSteps,
      user?.onboarding?.guided_current_step,
      user?.onboarding?.setup_completed,
    ]
  );

  const currentTourStep = currentTourStepId ? getGuidedTourStep(currentTourStepId) : null;
  const currentStep = currentTourStep
    ? getGuidedFlowStepByTourStep(currentTourStep.id)
    : null;
  const currentStepIndex = currentStep
    ? GUIDED_FLOW_STEPS.findIndex((step) => step.id === currentStep.id)
    : -1;
  const hasCompletedQuiz = !!user?.onboarding?.quiz_completed;
  const hasCompletedSetup = !!user?.onboarding?.setup_completed;

  const isActive =
    !!user &&
    user.accessStatus === 'trial_active' &&
    hasCompletedQuiz &&
    !hasCompletedSetup &&
    (!location.pathname.startsWith('/workspace/onboarding') ||
      currentTourStepId === 'setup-guide-start');

  const persistState = React.useCallback(
    async (
      nextTourStepId: GuidedTourStepId | null,
      nextCompletedSteps: GuidedFlowStepId[],
      setupCompleted = false
    ) => {
      if (!user?.id) return;

      await onboardingService.updateGuidedFlow(user.id, {
        guided_current_step: nextTourStepId,
        guided_steps_completed: nextCompletedSteps,
        guided_flow_completed_at: setupCompleted ? new Date().toISOString() : null,
        setup_completed: setupCompleted,
      });
      await refreshUser();
    },
    [refreshUser, user?.id]
  );

  const goToStep = React.useCallback(
    (stepId: GuidedFlowStepId) => {
      const step = getGuidedFlowStep(stepId);
      setActiveModule(step.module);
      navigate(step.path);
    },
    [navigate, setActiveModule]
  );

  const continueJourney = React.useCallback(() => {
    if (!currentTourStep || !currentStep) return;

    if (!location.pathname.startsWith(currentStep.path)) {
      goToStep(currentStep.id);
      return;
    }

    if (currentTourStep.id.endsWith('-nav')) return;
  }, [currentStep, currentTourStep, goToStep, location.pathname]);

  const advanceTour = React.useCallback(async (options: { clickTarget?: boolean } = {}) => {
    if (!currentTourStep || isSaving) return;

    const nextTourStep = getNextGuidedTourStep(currentTourStep.id);
    const nextFlowStep = nextTourStep ? getGuidedFlowStepByTourStep(nextTourStep.id) : null;
    const shouldCompleteCurrentStep =
      !!currentStep && (!nextFlowStep || nextFlowStep.id !== currentStep.id);
    const nextCompletedSteps = shouldCompleteCurrentStep
      ? Array.from(new Set([...completedSteps, currentStep.id]))
      : completedSteps;
    const primaryTarget = document.querySelector<HTMLElement>(
      `[data-tour-id="${currentTourStep.targetId}"]`
    );
    const target = primaryTarget;

    if (options.clickTarget && currentTourStep.nextAction === 'click_target' && target) {
      target.click();
    }

    if (!user?.id) return;

    try {
      setIsSaving(true);
      await persistState(nextTourStep?.id ?? null, nextCompletedSteps, !nextTourStep);

      if (!nextTourStep) {
        window.sessionStorage.setItem(TOUR_COMPLETION_CELEBRATION_KEY, 'pending');
        setActiveModule('onboarding');
        navigate('/workspace/onboarding');
        return;
      }

      if (nextFlowStep && nextFlowStep.id !== currentStep?.id) {
        goToStep(nextFlowStep.id);
        return;
      }

      if (!target && !location.pathname.startsWith(currentStep?.path || '')) {
        continueJourney();
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    completedSteps,
    continueJourney,
    currentStep?.path,
    currentStep?.id,
    currentTourStep,
    goToStep,
    isSaving,
    location.pathname,
    navigate,
    persistState,
    setActiveModule,
    user?.id,
  ]);

  const handleNext = React.useCallback(async () => {
    if (!currentTourStep || currentTourStep.nextAction === 'wait_for_action') return;

    await advanceTour({ clickTarget: true });
  }, [advanceTour, currentTourStep]);

  const advanceAfterRequiredAction = React.useCallback(async () => {
    if (!currentTourStep || currentTourStep.nextAction !== 'wait_for_action') return;

    await advanceTour();
  }, [advanceTour, currentTourStep]);

  const restartFromStep = React.useCallback(
    async (stepId: GuidedFlowStepId) => {
      if (!user?.id || isSaving) return;

      const nextCompletedSteps = completedSteps.filter((completedStepId) => completedStepId !== stepId);
      const firstTourStep = getFirstTourStepForFlowStep(stepId);

      try {
        setIsSaving(true);
        await persistState(firstTourStep.id, nextCompletedSteps, false);
        goToStep(stepId);
      } finally {
        setIsSaving(false);
      }
    },
    [completedSteps, goToStep, isSaving, persistState, user?.id]
  );

  return {
    isActive,
    isSaving,
    steps: GUIDED_FLOW_STEPS,
    currentStep,
    currentStepId: currentStep?.id ?? null,
    currentStepIndex,
    currentTourStep,
    currentTourStepId,
    completedSteps,
    completedCount: completedSteps.length,
    continueJourney,
    goToStep,
    handleNext,
    advanceAfterRequiredAction,
    restartFromStep,
    isStepCompleted: (stepId: GuidedFlowStepId) => completedSteps.includes(stepId),
    isCurrentStep: (stepId: GuidedFlowStepId) => currentStep?.id === stepId,
  };
};
