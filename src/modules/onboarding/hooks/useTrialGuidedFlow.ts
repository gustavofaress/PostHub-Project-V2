import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../app/context/AppContext';
import { useAuth } from '../../../app/context/AuthContext';
import { onboardingService } from '../../../services/onboarding.service';
import {
  getCurrentGuidedFlowStepId,
  getGuidedFlowStep,
  getNextGuidedFlowStep,
  GUIDED_FLOW_STEPS,
  normalizeCompletedGuidedSteps,
  type GuidedFlowStepId,
} from '../guidedFlow';

export const useTrialGuidedFlow = () => {
  const navigate = useNavigate();
  const { setActiveModule } = useApp();
  const { user, refreshUser } = useAuth();
  const [isSaving, setIsSaving] = React.useState(false);

  const completedSteps = React.useMemo(
    () => normalizeCompletedGuidedSteps(user?.onboarding?.guided_steps_completed ?? []),
    [user?.onboarding?.guided_steps_completed]
  );

  const currentStepId = React.useMemo(
    () =>
      getCurrentGuidedFlowStepId(
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

  const currentStep = currentStepId ? getGuidedFlowStep(currentStepId) : null;
  const currentStepIndex = currentStep
    ? GUIDED_FLOW_STEPS.findIndex((step) => step.id === currentStep.id)
    : -1;
  const isActive =
    user?.accessStatus === 'trial_active' &&
    !!user?.onboarding?.quiz_completed &&
    !user?.onboarding?.setup_completed;

  const goToStep = React.useCallback(
    (stepId: GuidedFlowStepId) => {
      const step = getGuidedFlowStep(stepId);
      setActiveModule(step.module);
      navigate(step.path);
    },
    [navigate, setActiveModule]
  );

  const continueJourney = React.useCallback(() => {
    if (!currentStepId) return;
    goToStep(currentStepId);
  }, [currentStepId, goToStep]);

  const completeStepAndContinue = React.useCallback(
    async (stepId: GuidedFlowStepId) => {
      if (!user?.id || isSaving) return;

      const uniqueCompletedSteps = Array.from(new Set([...completedSteps, stepId]));
      const nextStep = getNextGuidedFlowStep(stepId);

      try {
        setIsSaving(true);
        await onboardingService.updateGuidedFlow(user.id, {
          guided_steps_completed: uniqueCompletedSteps,
          guided_current_step: nextStep?.id ?? stepId,
          guided_flow_completed_at: nextStep ? null : new Date().toISOString(),
          setup_completed: !nextStep,
        });
        await refreshUser();

        if (nextStep) {
          goToStep(nextStep.id);
          return;
        }

        setActiveModule('dashboard');
        navigate('/workspace/dashboard');
      } finally {
        setIsSaving(false);
      }
    },
    [
      completedSteps,
      goToStep,
      isSaving,
      navigate,
      refreshUser,
      setActiveModule,
      user?.id,
    ]
  );

  return {
    isActive,
    isSaving,
    steps: GUIDED_FLOW_STEPS,
    currentStep,
    currentStepId,
    currentStepIndex,
    completedSteps,
    completedCount: completedSteps.length,
    continueJourney,
    goToStep,
    completeStepAndContinue,
    isStepCompleted: (stepId: GuidedFlowStepId) => completedSteps.includes(stepId),
    isCurrentStep: (stepId: GuidedFlowStepId) => currentStepId === stepId,
  };
};
