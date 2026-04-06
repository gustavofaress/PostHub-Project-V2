import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  LayoutDashboard,
  FileText,
  Calendar,
  Zap,
  Lightbulb,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { cn } from '../../shared/utils/cn';
import { useApp } from '../../app/context/AppContext';
import { useAuth } from '../../app/context/AuthContext';
import { onboardingService } from '../../services/onboarding.service';

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

const CHECKLIST_STEPS = [
  {
    id: 'idea',
    title: 'Criar sua primeira ideia',
    description: 'Comece registrando uma ideia de conteúdo',
    cta: 'Criar ideia',
    icon: Lightbulb,
    module: 'ideas',
    path: '/workspace/ideas',
  },
  {
    id: 'structure',
    title: 'Estruturar seu conteúdo',
    description: 'Transforme sua ideia em uma peça de conteúdo mais organizada',
    cta: 'Estruturar conteúdo',
    icon: FileText,
    module: 'scripts',
    path: '/workspace/scripts',
  },
  {
    id: 'calendar',
    title: 'Organizar no calendário',
    description: 'Leve seu conteúdo para o calendário editorial',
    cta: 'Abrir calendário',
    icon: Calendar,
    module: 'calendar',
    path: '/workspace/calendar',
  },
  {
    id: 'finish',
    title: 'Finalizar configuração',
    description: 'Conclua seu primeiro fluxo dentro da plataforma',
    cta: 'Ir para dashboard',
    icon: LayoutDashboard,
    module: 'dashboard',
    path: '/workspace/dashboard',
  },
] as const;

type QuizAnswerKey = (typeof QUIZ_QUESTIONS)[number]['id'];

type QuizAnswers = {
  work_model: string;
  operation_size: string;
  current_process: string;
};

export const Onboarding = () => {
  const navigate = useNavigate();
  const { setActiveModule } = useApp();
  const { user } = useAuth();

  const hasQuizCompleted = !!user?.onboarding?.quiz_completed;

  const [showQuiz, setShowQuiz] = React.useState(!hasQuizCompleted);
  const [quizDismissedLocally, setQuizDismissedLocally] = React.useState(hasQuizCompleted);
  const [isSavingQuiz, setIsSavingQuiz] = React.useState(false);
  const [quizError, setQuizError] = React.useState('');
  const [quizStep, setQuizStep] = React.useState(-1);
  const [quizAnswers, setQuizAnswers] = React.useState<QuizAnswers>({
    work_model: user?.onboarding?.work_model ?? '',
    operation_size: user?.onboarding?.operation_size ?? '',
    current_process: user?.onboarding?.current_process ?? '',
  });
  const [completedSteps, setCompletedSteps] = React.useState<string[]>([]);

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

  const shouldRenderQuiz = showQuiz && !quizDismissedLocally && !hasQuizCompleted;

  const currentQuestion = quizStep >= 0 ? QUIZ_QUESTIONS[quizStep] : null;
  const selectedOption = currentQuestion
    ? quizAnswers[currentQuestion.id as QuizAnswerKey]
    : null;

  const getPersonalizedMessage = React.useCallback(() => {
    if (
      quizAnswers.operation_size === '11 a 20 clientes' ||
      quizAnswers.operation_size === '20+ clientes'
    ) {
      return 'Montamos um fluxo pensado para quem gerencia múltiplos clientes.';
    }

    if (quizAnswers.work_model === 'Criador de Conteúdo Profissional') {
      return 'Montamos um fluxo focado em acelerar sua produção de conteúdo.';
    }

    if (quizAnswers.work_model === 'Agência de Marketing') {
      return 'Montamos um fluxo para dar mais clareza e escala à sua operação com clientes.';
    }

    return 'Montamos um fluxo passo a passo para estruturar sua operação.';
  }, [quizAnswers.operation_size, quizAnswers.work_model]);

  const handleOptionSelect = (option: string) => {
    if (!currentQuestion || isSavingQuiz) return;

    setQuizError('');
    setQuizAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: option,
    }));

    if (quizStep < QUIZ_QUESTIONS.length - 1) {
      window.setTimeout(() => {
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

  const handleStepAction = async (step: (typeof CHECKLIST_STEPS)[number]) => {
    if (step.id === 'finish') {
      try {
        if (user) {
          await onboardingService.markSetupCompleted(user.id);
        }
      } catch (error) {
        console.error('Erro ao finalizar setup:', error);
      }

      if (!completedSteps.includes(step.id)) {
        setCompletedSteps((prev) => [...prev, step.id]);
      }

      setActiveModule('dashboard');
      navigate('/workspace/dashboard');
      return;
    }

    if (!completedSteps.includes(step.id)) {
      setCompletedSteps((prev) => [...prev, step.id]);
    }

    setActiveModule(step.module);
    navigate(step.path);
  };

  return (
    <div className="min-h-full bg-[#F9FAFB]">
      <AnimatePresence>
        {shouldRenderQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-[480px] overflow-hidden rounded-xl bg-white shadow-2xl"
            >
              <div className="h-1.5 w-full bg-gray-100">
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

              <div className="p-8">
                {quizStep === -1 ? (
                  <motion.div
                    key="intro"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 py-4 text-center"
                  >
                    <div className="mx-auto mb-2 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#38B6FF]/10 text-[#38B6FF]">
                      <Rocket className="h-10 w-10" />
                    </div>

                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#38B6FF]">
                        Configuração inicial
                      </span>
                      <h2 className="text-2xl font-bold leading-tight text-[#111827]">
                        Queremos preparar a melhor experiência para o seu PostHub
                      </h2>
                      <p className="text-[#6B7280]">Leva menos de 2 minutos</p>
                    </div>

                    <Button
                      className="mt-8 w-full rounded-xl bg-[#38B6FF] py-6 text-lg text-white hover:bg-[#38B6FF]/90"
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
                      <h2 className="text-2xl font-bold text-[#111827]">
                        {currentQuestion?.title}
                      </h2>
                    </div>

                    <div className="relative min-h-[280px]">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={quizStep}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0 space-y-3"
                        >
                          {currentQuestion?.options.map((option) => {
                            const isSelected = selectedOption === option;

                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleOptionSelect(option)}
                                className={cn(
                                  'w-full rounded-lg border px-5 py-4 text-left transition-all duration-200',
                                  isSelected
                                    ? 'border-[#38B6FF] bg-[#38B6FF]/5'
                                    : 'border-gray-200 bg-white hover:border-[#38B6FF]'
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
                      <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {quizError}
                      </div>
                    )}

                    {quizStep === QUIZ_QUESTIONS.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 border-t border-gray-100 pt-6"
                      >
                        <Button
                          className="w-full rounded-xl bg-[#38B6FF] py-6 text-lg text-white hover:bg-[#38B6FF]/90"
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

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-12">
        <div className="space-y-4 text-center">
          <div className="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#38B6FF]/10 text-[#38B6FF]">
            <Rocket className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Vamos montar sua operação de conteúdo
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-500">
            Siga estes passos para configurar seu workspace e aprender a usar o PostHub
          </p>
        </div>

        {!shouldRenderQuiz && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4 rounded-xl border border-[#38B6FF]/20 bg-[#38B6FF]/5 p-4"
          >
            <div className="mt-0.5 shrink-0 rounded-lg bg-[#38B6FF]/10 p-2 text-[#38B6FF]">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Personalizado para você</h3>
              <p className="mt-1 text-sm text-gray-600">{getPersonalizedMessage()}</p>
            </div>
          </motion.div>
        )}

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Seu progresso</h2>
            <span className="text-sm font-medium text-[#38B6FF]">
              {completedSteps.length}/{CHECKLIST_STEPS.length} etapas concluídas
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#38B6FF] transition-all duration-500 ease-out"
              style={{ width: `${(completedSteps.length / CHECKLIST_STEPS.length) * 100}%` }}
            />
          </div>
        </Card>

        <div className="space-y-4">
          {CHECKLIST_STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isNext =
              !isCompleted &&
              (index === 0 || completedSteps.includes(CHECKLIST_STEPS[index - 1].id));

            return (
              <Card
                key={step.id}
                className={cn(
                  'p-6 transition-all duration-300',
                  isCompleted
                    ? 'border-gray-200 bg-gray-50/50'
                    : isNext
                      ? 'border-[#38B6FF] shadow-md shadow-[#38B6FF]/5'
                      : 'opacity-75'
                )}
              >
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-4">
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors',
                        isCompleted
                          ? 'bg-green-100 text-green-600'
                          : isNext
                            ? 'bg-[#38B6FF]/10 text-[#38B6FF]'
                            : 'bg-gray-100 text-gray-400'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <step.icon className="h-6 w-6" />
                      )}
                    </div>

                    <div>
                      <h3
                        className={cn(
                          'text-lg font-bold',
                          isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                        )}
                      >
                        {step.title}
                      </h3>
                      <p className="mt-1 text-gray-500">{step.description}</p>
                    </div>
                  </div>

                  <div className="sm:shrink-0">
                    {isCompleted ? (
                      <Button
                        variant="outline"
                        className="w-full border-green-200 text-green-600 hover:bg-green-50 sm:w-auto"
                        onClick={() => handleStepAction(step)}
                      >
                        Refazer etapa
                      </Button>
                    ) : (
                      <Button
                        className={cn(
                          'w-full sm:w-auto',
                          isNext ? 'bg-[#38B6FF] text-white hover:bg-[#38B6FF]/90' : ''
                        )}
                        variant={isNext ? 'primary' : 'outline'}
                        disabled={!isNext}
                        onClick={() => handleStepAction(step)}
                      >
                        {step.cta}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
