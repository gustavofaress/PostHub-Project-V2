import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  Calendar,
  Zap,
  Lightbulb,
  Check,
  BookOpen,
  Trello,
  CheckCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../shared/components/Button';
import { cn } from '../../shared/utils/cn';
import { useApp } from '../../app/context/AppContext';
import { useAuth } from '../../app/context/AuthContext';
import { onboardingService } from '../../services/onboarding.service';
import { useIsMobile } from '../mobile/hooks/useIsMobile';
import { GUIDED_FLOW_STEPS, type GuidedFlowStepId } from './guidedFlow';
import {
  TOUR_COMPLETION_CELEBRATION_KEY,
  useTrialGuidedFlow,
} from './hooks/useTrialGuidedFlow';

const QUIZ_QUESTIONS = [
  {
    id: 'work_model',
    title: 'Qual é seu modelo de trabalho hoje?',
    options: [
      'Social Media Autônomo',
      'Agência de Marketing',
      'Equipe de marketing interna',
      'Gestor de empresa',
      'Criador de Conteúdo Profissional',
    ],
  },
  {
    id: 'operation_size',
    title: 'Qual o tamanho da sua operação?',
    options: ['1 a 5 clientes', '6 a 10 clientes', '11 a 20 clientes', '20+ clientes'],
  },
  {
    id: 'current_process',
    title: 'Como está sua operação de conteúdo hoje?',
    options: [
      'Uso algumas ferramentas genéricas',
      'Uso planilhas para gerir a operação',
      'Gerencio tudo pelo WhatsApp / mensagens',
      'Ainda não tenho um processo estruturado',
    ],
  },
] as const;

type QuizAnswerKey = (typeof QUIZ_QUESTIONS)[number]['id'];

type QuizAnswers = {
  work_model: string;
  operation_size: string;
  current_process: string;
};

const CELEBRATION_CONFETTI = [
  { left: '8%', color: '#38B6FF', delay: 0, rotate: -28 },
  { left: '14%', color: '#FBBF24', delay: 0.12, rotate: 32 },
  { left: '20%', color: '#34D399', delay: 0.24, rotate: -24 },
  { left: '28%', color: '#F87171', delay: 0.1, rotate: 26 },
  { left: '34%', color: '#A78BFA', delay: 0.28, rotate: -34 },
  { left: '42%', color: '#38B6FF', delay: 0.18, rotate: 18 },
  { left: '50%', color: '#FBBF24', delay: 0.36, rotate: -20 },
  { left: '58%', color: '#34D399', delay: 0.06, rotate: 30 },
  { left: '66%', color: '#F87171', delay: 0.21, rotate: -18 },
  { left: '74%', color: '#38B6FF', delay: 0.3, rotate: 24 },
  { left: '82%', color: '#A78BFA', delay: 0.14, rotate: -30 },
  { left: '90%', color: '#FBBF24', delay: 0.4, rotate: 22 },
] as const;

const STEP_SHORT_LABELS: Record<GuidedFlowStepId, string> = {
  references: 'Referências',
  ideas: 'Ideias',
  calendar: 'Calendário',
  kanban: 'Produção',
  approval: 'Aprovação',
};

const STEP_ACTION_LABELS: Record<GuidedFlowStepId, string> = {
  references: 'Organizar referências',
  ideas: 'Criar primeiras ideias',
  calendar: 'Planejar no calendário',
  kanban: 'Acompanhar produção',
  approval: 'Revisar aprovações',
};

export const Onboarding = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { setActiveModule } = useApp();
  const { user, refreshUser } = useAuth();
  const {
    currentStep,
    completedCount,
    continueJourney,
    goToStep,
    isCurrentStep,
    isStepCompleted,
    steps,
  } = useTrialGuidedFlow();

  const hasQuizCompleted = !!user?.onboarding?.quiz_completed;

  const [showQuiz, setShowQuiz] = React.useState(!hasQuizCompleted);
  const [quizDismissedLocally, setQuizDismissedLocally] = React.useState(hasQuizCompleted);
  const [isSavingQuiz, setIsSavingQuiz] = React.useState(false);
  const [isTransitioningQuizStep, setIsTransitioningQuizStep] = React.useState(false);
  const [quizError, setQuizError] = React.useState('');
  const [quizStep, setQuizStep] = React.useState(-1);
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [expandedStepId, setExpandedStepId] = React.useState<GuidedFlowStepId | null>(
    currentStep?.id ?? GUIDED_FLOW_STEPS[0].id
  );
  const quizAutoAdvanceTimeoutRef = React.useRef<number | null>(null);
  const [quizAnswers, setQuizAnswers] = React.useState<QuizAnswers>({
    work_model: user?.onboarding?.work_model ?? '',
    operation_size: user?.onboarding?.operation_size ?? '',
    current_process: user?.onboarding?.current_process ?? '',
  });
  const STEP_ICONS: Record<GuidedFlowStepId, typeof BookOpen> = {
    references: BookOpen,
    ideas: Lightbulb,
    calendar: Calendar,
    kanban: Trello,
    approval: CheckCircle,
  };

  React.useEffect(() => {
    if (hasQuizCompleted) {
      setShowQuiz(false);
      setQuizDismissedLocally(true);
    }
  }, [hasQuizCompleted]);

  React.useEffect(() => {
    setQuizAnswers((prev) => ({
      work_model: user?.onboarding?.work_model ?? prev.work_model,
      operation_size: user?.onboarding?.operation_size ?? prev.operation_size,
      current_process: user?.onboarding?.current_process ?? prev.current_process,
    }));
  }, [
    user?.onboarding?.work_model,
    user?.onboarding?.operation_size,
    user?.onboarding?.current_process,
  ]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const shouldCelebrate =
      window.sessionStorage.getItem(TOUR_COMPLETION_CELEBRATION_KEY) === 'pending';

    if (!shouldCelebrate) return;

    window.sessionStorage.removeItem(TOUR_COMPLETION_CELEBRATION_KEY);
    setShowCelebration(true);
  }, [user?.onboarding?.guided_flow_completed_at]);

  React.useEffect(() => {
    return () => {
      if (quizAutoAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(quizAutoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (currentStep?.id) {
      setExpandedStepId(currentStep.id);
    }
  }, [currentStep?.id]);

  const shouldRenderQuiz = showQuiz && !quizDismissedLocally && !hasQuizCompleted;

  const currentQuestion = quizStep >= 0 ? QUIZ_QUESTIONS[quizStep] : null;
  const selectedOption = currentQuestion
    ? quizAnswers[currentQuestion.id as QuizAnswerKey]
    : null;
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Usuário';
  const remainingSteps = Math.max(steps.length - completedCount, 0);
  const summaryMessage = currentStep
    ? `Faltam ${remainingSteps} ${remainingSteps === 1 ? 'etapa' : 'etapas'} para concluir a configuração principal do seu workspace.`
    : 'Todos os passos principais do setup já foram concluídos.';
  const journeyCards = [
    {
      id: 'dashboard' as const,
      label: 'Meu PostHub',
    },
    ...GUIDED_FLOW_STEPS.map((step) => ({
      id: step.id,
      label: STEP_SHORT_LABELS[step.id],
    })),
  ];

  const handleOptionSelect = (option: string) => {
    if (!currentQuestion || isSavingQuiz || isTransitioningQuizStep) return;

    setQuizError('');
    setQuizAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: option,
    }));

    if (quizStep < QUIZ_QUESTIONS.length - 1) {
      setIsTransitioningQuizStep(true);
      quizAutoAdvanceTimeoutRef.current = window.setTimeout(() => {
        quizAutoAdvanceTimeoutRef.current = null;
        setIsTransitioningQuizStep(false);
        setQuizStep((prev) => prev + 1);
      }, 250);
    }
  };

  const handleFinishQuiz = async () => {
    if (!user || isSavingQuiz) return;

    const hasAllAnswers =
      !!quizAnswers.work_model &&
      !!quizAnswers.operation_size &&
      !!quizAnswers.current_process;

    if (!hasAllAnswers) return;

    try {
      setIsSavingQuiz(true);
      setQuizError('');

      const saved = await onboardingService.saveQuizAnswers(user.id, quizAnswers);
      console.log('Quiz salvo com sucesso:', saved);
      await refreshUser();

      setQuizDismissedLocally(true);
      setShowQuiz(false);
      setQuizStep(-1);
    } catch (error: any) {
      console.error('Erro ao salvar quiz:', error);
      setQuizError(
        error?.message || 'Não foi possível salvar o quiz. Tente novamente.'
      );
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handlePrimaryAction = () => {
    if (currentStep) {
      continueJourney();
      return;
    }

    setActiveModule('dashboard');
    navigate('/workspace/dashboard');
  };

  const handleJourneyCardClick = (cardId: 'dashboard' | GuidedFlowStepId) => {
    if (cardId === 'dashboard') {
      setActiveModule('dashboard');
      navigate('/workspace/dashboard');
      return;
    }

    setExpandedStepId(cardId);

    if (isCurrentStep(cardId) || isStepCompleted(cardId)) {
      goToStep(cardId);
    }
  };

  return (
    <div className="min-h-full bg-[#F7FAFC]">
      <AnimatePresence>
        {shouldRenderQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'fixed inset-0 z-[130] flex bg-slate-950/45 backdrop-blur-sm',
              isMobile ? 'items-end justify-stretch px-0 pb-0 pt-8' : 'items-center justify-center p-4'
            )}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={cn(
                'w-full overflow-y-auto border border-[#D7E7F6] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.18)]',
                isMobile
                  ? 'max-h-[88vh] min-h-[76vh] rounded-t-[32px] border-b-0 px-0 pb-[calc(1rem+env(safe-area-inset-bottom))]'
                  : 'max-h-[calc(100vh-2rem)] max-w-[560px] rounded-[32px]'
              )}
            >
              <div className="h-1.5 w-full bg-[#E8F3FC]">
                <div
                  className="h-full bg-[#38B6FF] transition-all duration-500 ease-out"
                  style={{
                    width:
                      quizStep === -1
                        ? '0%'
                        : `${((quizStep + 1) / QUIZ_QUESTIONS.length) * 100}%`,
                  }}
                />
              </div>

              <div className={cn(isMobile ? 'px-5 pb-5 pt-5' : 'p-6 sm:p-8')}>
                {quizStep === -1 ? (
                  <motion.div
                    key="intro"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      'space-y-6 text-center',
                      isMobile ? 'flex min-h-[calc(76vh-3rem)] flex-col justify-between py-1' : 'py-2 sm:py-4'
                    )}
                  >
                    <div>
                      <div className="mx-auto mb-2 inline-flex h-20 w-20 items-center justify-center rounded-[28px] bg-[linear-gradient(180deg,rgba(56,182,255,0.16)_0%,rgba(56,182,255,0.06)_100%)] text-[#38B6FF] shadow-[0_18px_45px_rgba(56,182,255,0.16)]">
                        <Rocket className="h-10 w-10" />
                      </div>

                      <div className="space-y-3">
                        <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#38B6FF]">
                          Guia de configuração
                        </span>
                        <h2 className="text-2xl font-bold leading-tight text-[#111827] sm:text-[2rem]">
                          Vamos preparar o seu workspace para o fluxo da PostHub
                        </h2>
                        <p className="mx-auto max-w-sm text-[#6B7280]">
                          Responda algumas perguntas rápidas para deixar o checklist inicial mais
                          alinhado ao seu cenário.
                        </p>
                      </div>
                    </div>

                    <Button
                      className="mt-4 w-full rounded-2xl bg-[#38B6FF] py-6 text-lg text-white shadow-[0_18px_40px_rgba(56,182,255,0.24)] hover:bg-[#38B6FF]/90"
                      onClick={() => setQuizStep(0)}
                    >
                      Começar
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`quiz-${quizStep}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="mb-6">
                      <p className="mb-2 text-sm font-medium text-gray-500">
                        Etapa {quizStep + 1} de {QUIZ_QUESTIONS.length}
                      </p>
                      <h2 className="text-2xl font-bold text-[#111827] sm:text-[2rem]">
                        {currentQuestion?.title}
                      </h2>
                    </div>

                    <div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={quizStep}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            'space-y-3',
                            isMobile ? 'min-h-[22rem]' : 'min-h-[280px]'
                          )}
                        >
                          {currentQuestion?.options.map((option) => {
                            const isSelected = selectedOption === option;

                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleOptionSelect(option)}
                                disabled={isSavingQuiz || isTransitioningQuizStep}
                                className={cn(
                                  'w-full rounded-2xl border px-5 py-4 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70',
                                  isSelected
                                    ? 'border-[#38B6FF] bg-[#38B6FF]/6 shadow-[0_12px_30px_rgba(56,182,255,0.1)]'
                                    : 'border-[#D8E8F5] bg-white/90 hover:border-[#38B6FF]'
                                )}
                              >
                                <span
                                  className={cn(
                                    'text-base font-medium',
                                    isSelected ? 'text-[#38B6FF]' : 'text-gray-700'
                                  )}
                                >
                                  {option}
                                </span>
                              </button>
                            );
                          })}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {quizError && (
                      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {quizError}
                      </div>
                    )}

                    {quizStep === QUIZ_QUESTIONS.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'mt-8 border-t border-gray-100 pt-6',
                          isMobile && 'sticky bottom-0 mx-[-1.25rem] bg-[linear-gradient(180deg,rgba(247,251,255,0.2)_0%,rgba(247,251,255,0.96)_18%,rgba(247,251,255,1)_100%)] px-5 pb-1 backdrop-blur-xl'
                        )}
                      >
                        <Button
                          className="w-full rounded-2xl bg-[#38B6FF] py-6 text-lg text-white shadow-[0_18px_40px_rgba(56,182,255,0.24)] hover:bg-[#38B6FF]/90"
                          disabled={!selectedOption || isSavingQuiz}
                          isLoading={isSavingQuiz}
                          onClick={handleFinishQuiz}
                        >
                          Continuar setup
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[135] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="relative w-full max-w-[560px] overflow-hidden rounded-[32px] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {CELEBRATION_CONFETTI.map((piece, index) => (
                  <motion.span
                    key={`${piece.left}-${index}`}
                    className="absolute top-[-18%] h-4 w-2 rounded-full"
                    style={{ left: piece.left, backgroundColor: piece.color }}
                    initial={{ y: -40, opacity: 0, rotate: 0, scale: 0.8 }}
                    animate={{
                      y: [0, 110, 260],
                      opacity: [0, 1, 1, 0],
                      rotate: [0, piece.rotate, piece.rotate * 1.8],
                      scale: [0.8, 1, 0.9],
                    }}
                    transition={{
                      duration: 2.3,
                      delay: piece.delay,
                      ease: 'easeIn',
                      repeat: Infinity,
                      repeatDelay: 0.5,
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10 text-center">
                <div className="mx-auto mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#38B6FF]/10 text-[#38B6FF]">
                  <Rocket className="h-9 w-9" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#38B6FF]">
                  Setup finalizado
                </p>
                <h2 className="mt-4 text-3xl font-bold leading-tight text-[#111827]">
                  O seu PostHub está pronto para você agora! Parabéns
                </h2>
                <p className="mt-3 text-base text-gray-500">
                  Seu tour guiado foi concluído e o setup guide já está com todas as etapas marcadas.
                </p>

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    className="border-[#38B6FF]/20 text-[#38B6FF] hover:bg-[#38B6FF]/5"
                    onClick={() => setShowCelebration(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    className="bg-[#38B6FF] text-white hover:bg-[#38B6FF]/90"
                    onClick={() => {
                      setShowCelebration(false);
                      setActiveModule('dashboard');
                      navigate('/workspace/dashboard');
                    }}
                  >
                    Ir para o dashboard
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-[1120px] space-y-5 px-3 py-4 sm:px-5 sm:py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] bg-[#EEF2F6] px-4 py-5 sm:px-5 sm:py-6"
        >
          <h1 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-[#1E293B] sm:text-[2.2rem]">
            Bem-vindo, {firstName}!
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[0.98rem]">
            {summaryMessage}
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[24px] border border-[#E6ECF2] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
        >
          <div className="px-4 py-5 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[1.15rem] font-semibold text-[#1E293B] sm:text-[1.2rem]">
                Minha Jornada
              </h2>
              <Button
                data-tour-id="setup-guide-start-button"
                className="rounded-xl bg-[#38B6FF] px-4 text-white hover:bg-[#38B6FF]/90"
                onClick={handlePrimaryAction}
              >
                {currentStep ? 'Continuar' : 'Dashboard'}
              </Button>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible xl:grid-cols-6">
              {journeyCards.map((card) => {
                const isDashboardCard = card.id === 'dashboard';
                const isActiveCard = isDashboardCard ? !currentStep : currentStep?.id === card.id;

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleJourneyCardClick(card.id)}
                    className={cn(
                      'min-w-[168px] rounded-[18px] border bg-white px-4 py-4 text-left transition-colors sm:min-w-0',
                      isActiveCard
                        ? 'border-[#CBE8FB] bg-[#FBFDFF]'
                        : 'border-[#E8EDF3] hover:border-[#D9EAF8]'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-full border',
                        isActiveCard
                          ? 'border-[#D6EEFD] bg-[#EAF6FE] text-[#38B6FF]'
                          : 'border-[#E5EAF0] bg-[#FAFBFC] text-slate-400'
                      )}
                    >
                      {isDashboardCard ? (
                        <img
                          src="/logo-icon.png"
                          alt="PostHub"
                          className="h-5 w-5 object-contain"
                        />
                      ) : (
                        React.createElement(STEP_ICONS[card.id], { className: 'h-5 w-5' })
                      )}
                    </div>

                    <p
                      className={cn(
                        'mt-5 text-sm font-medium',
                        isActiveCard ? 'text-[#2C89C8]' : 'text-slate-500'
                      )}
                    >
                      {card.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[24px] border border-[#E6ECF2] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
        >
          <div className="border-b border-[#E9EEF4] px-4 py-5 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[1.25rem] font-semibold text-[#1E293B]">Fluxo do Workspace</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Abra os módulos na ordem recomendada para concluir sua configuração.
                </p>
              </div>

              <div className="inline-flex items-center justify-center rounded-full border border-[#D7E7F6] bg-[#F7FBFE] px-4 py-2 text-sm font-medium text-[#2C89C8]">
                <Zap className="mr-2 h-4 w-4" />
                {completedCount}/{steps.length} passos completos
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-white px-3 py-3 sm:px-4 sm:py-4">
            {GUIDED_FLOW_STEPS.map((step) => {
              const isCompleted = isStepCompleted(step.id);
              const isNext = isCurrentStep(step.id);
              const isExpanded = expandedStepId === step.id;
              const canOpenModule = isCompleted || isNext;
              const completedStepsLabel = `${isCompleted ? 1 : 0}/1 passo completo`;
              const StepIcon = STEP_ICONS[step.id];

              return (
                <div
                  key={step.id}
                  className="overflow-hidden rounded-[18px] border border-[#E8EDF3] bg-white"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedStepId((prev) => (prev === step.id ? null : step.id))
                    }
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                  >
                    <span className="text-[1rem] font-semibold text-[#2C89C8] sm:text-[1.05rem]">
                      {step.title}
                    </span>

                    <span className="flex items-center gap-3">
                      <span className="hidden rounded-full border border-[#E6EBF1] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-slate-500 sm:inline-flex">
                        {completedStepsLabel}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-[#EDF2F7] bg-white px-4 py-4 sm:px-5">
                      <button
                        type="button"
                        disabled={!canOpenModule}
                        onClick={() => goToStep(step.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-4 rounded-[16px] border px-4 py-4 text-left transition-colors',
                          canOpenModule
                            ? 'border-[#EDF2F7] bg-[#FBFCFD] hover:border-[#D9EAF8]'
                            : 'border-[#EDF2F7] bg-[#FBFCFD] text-slate-400'
                        )}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={cn(
                              'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                              isCompleted
                                ? 'bg-[#EAF7EF] text-[#2E9B5F]'
                                : isNext
                                  ? 'bg-[#EAF6FE] text-[#38B6FF]'
                                  : 'bg-[#F1F5F9] text-slate-400'
                            )}
                          >
                            {isCompleted ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <StepIcon className="h-4 w-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p
                              className={cn(
                                'text-[0.98rem] font-semibold',
                                canOpenModule ? 'text-[#2C89C8]' : 'text-slate-400'
                              )}
                            >
                              {STEP_ACTION_LABELS[step.id]}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {step.description}
                            </p>
                          </div>
                        </div>

                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
                            canOpenModule
                              ? 'border-[#D9EAF8] bg-white text-[#38B6FF]'
                              : 'border-[#E8EDF3] bg-[#F8FAFC] text-slate-300'
                          )}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
};
