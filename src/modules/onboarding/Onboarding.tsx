import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, 
  CheckCircle2, 
  ArrowRight, 
  LayoutDashboard, 
  FileText, 
  CheckCircle, 
  Calendar,
  Zap
} from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { cn } from '../../shared/utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../app/context/AppContext';

const STEPS = [
  {
    id: 'profile',
    title: 'Complete seu perfil',
    description: 'Adicione os detalhes da sua marca e os @ das suas redes sociais para personalizar sua experiência.',
    icon: Zap,
    completed: true,
  },
  {
    id: 'integrations',
    title: 'Conecte suas contas',
    description: 'Vincule suas contas do Instagram, TikTok e YouTube para começar a gerenciar conteúdo.',
    icon: Zap,
    completed: false,
  },
  {
    id: 'first-script',
    title: 'Gere seu primeiro roteiro',
    description: 'Use nosso Gerador de Roteiros com IA para criar conteúdos de alta conversão em segundos.',
    icon: FileText,
    completed: false,
  },
  {
    id: 'approval',
    title: 'Configure o fluxo de aprovação',
    description: 'Convide seus clientes ou membros da equipe para revisar e aprovar seu conteúdo.',
    icon: CheckCircle,
    completed: false,
  },
];

export const Onboarding = () => {
  const [activeStep, setActiveStep] = React.useState(1);
  const navigate = useNavigate();
  const { setActiveModule } = useApp();

  const handleFinish = () => {
    setActiveModule('dashboard');
    navigate('/workspace/dashboard');
  };

  const handleOpenGenerator = () => {
    setActiveModule('scripts');
    navigate('/workspace/scripts');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 py-8">
      <div className="text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand mb-4">
          <Rocket className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Bem-vindo ao PostHub!</h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto">
          Vamos configurar tudo para o seu sucesso. Complete estas etapas para liberar todo o potencial do seu workspace de redes sociais.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-6">
            <h3 className="font-bold text-text-primary mb-6 flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand" />
              Seu Progresso
            </h3>
            <div className="space-y-6">
              {STEPS.map((step, index) => (
                <div key={step.id} className="relative flex items-start gap-4">
                  {index !== STEPS.length - 1 && (
                    <div className="absolute left-2.5 top-6 bottom-[-24px] w-0.5 bg-gray-100" />
                  )}
                  <div className={cn(
                    "relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-300",
                    step.completed 
                      ? "bg-brand border-brand text-white" 
                      : index === activeStep 
                        ? "border-brand bg-white" 
                        : "border-gray-200 bg-white"
                  )}>
                    {step.completed ? <CheckCircle2 className="h-3 w-3" /> : <div className={cn("h-1.5 w-1.5 rounded-full", index === activeStep ? "bg-brand" : "bg-transparent")} />}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-bold transition-colors",
                      step.completed ? "text-text-primary" : index === activeStep ? "text-brand" : "text-gray-400"
                    )}>
                      {step.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-brand/5 border-brand/10 p-6">
            <h4 className="font-bold text-brand mb-2">Precisa de ajuda?</h4>
            <p className="text-xs text-text-secondary mb-4">Nosso time de suporte está disponível 24/7 para ajudar você a começar.</p>
            <Button variant="outline" size="sm" className="w-full text-brand border-brand hover:bg-brand hover:text-white">
              Falar com o Suporte
            </Button>
          </Card>
        </div>

        {/* Active Step Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-8 min-h-[400px] flex flex-col">
                <div className="flex-1">
                  <div className="h-12 w-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-6">
                    {React.createElement(STEPS[activeStep].icon, { className: "h-6 w-6" })}
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary mb-4">{STEPS[activeStep].title}</h2>
                  <p className="text-text-secondary mb-8 leading-relaxed">
                    {STEPS[activeStep].description}
                  </p>

                  {activeStep === 1 && (
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      {['Instagram', 'TikTok', 'YouTube', 'LinkedIn'].map(p => (
                        <div key={p} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-brand hover:bg-brand/5 transition-all cursor-pointer group">
                          <span className="font-medium text-text-primary">{p}</span>
                          <Button variant="ghost" size="sm" className="text-brand group-hover:bg-brand group-hover:text-white">Conectar</Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 mb-8">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-10 w-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                          <FileText className="h-5 w-5 text-brand" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary">Gerador de Roteiros com IA</p>
                          <p className="text-xs text-text-secondary">Crie roteiros para qualquer plataforma</p>
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleOpenGenerator}>Abrir Gerador</Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-gray-100">
                  <Button variant="ghost" onClick={() => setActiveStep(Math.max(0, activeStep - 1))} disabled={activeStep === 0}>
                    Anterior
                  </Button>
                  <Button className="gap-2" onClick={() => activeStep === STEPS.length - 1 ? handleFinish() : setActiveStep(Math.min(STEPS.length - 1, activeStep + 1))}>
                    {activeStep === STEPS.length - 1 ? 'Finalizar Configuração' : 'Continuar'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
