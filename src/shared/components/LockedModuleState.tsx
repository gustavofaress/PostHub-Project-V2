import * as React from 'react';
import { ArrowRight, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { Modal } from './Modal';
import { cn } from '../utils/cn';
import type { PlanFeature } from '../constants/plans';

interface LockedModuleStateProps {
  feature: PlanFeature;
  title?: string;
  description?: string;
  autoOpen?: boolean;
  compact?: boolean;
}

const BENEFITS = [
  'Envie conteúdos para seus clientes aprovarem com um clique',
  'Transforme ideias soltas em roteiros prontos para gravação',
  'Organize a operação com mais pessoas sem perder controle',
];

const MODULE_COPY: Partial<Record<PlanFeature, { title: string; description: string }>> = {
  performance: {
    title: 'Performance está em preparação',
    description:
      'Em breve, seus indicadores entram no fluxo para orientar decisões com mais clareza.',
  },
  team: {
    title: 'Gerenciar equipe é exclusivo do plano PRO',
    description:
      'Traga sua equipe para a mesma operação sem depender de repasses manuais ou acessos improvisados.',
  },
  approval: {
    title: 'Este módulo é exclusivo do plano PRO',
    description:
      'Envie conteúdos para seus clientes aprovarem com um clique e reduza o vai-e-vem antes da publicação.',
  },
  scripts: {
    title: 'Este módulo é exclusivo do plano PRO',
    description:
      'Transforme ideias em roteiros prontos para gravar sem recomeçar do zero a cada conteúdo.',
  },
  consultant: {
    title: 'Este módulo é exclusivo do plano PRO',
    description:
      'Receba direção estratégica para destravar campanhas, pautas e decisões de conteúdo com mais segurança.',
  },
  integrations: {
    title: 'Este módulo é exclusivo do plano PRO',
    description:
      'Conecte sua operação para reduzir tarefas manuais e manter o fluxo de conteúdo mais previsível.',
  },
};

export const LockedModuleState = ({
  feature,
  title,
  description,
  autoOpen = false,
  compact = false,
}: LockedModuleStateProps) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = React.useState(autoOpen);
  const copy = MODULE_COPY[feature] ?? {
    title: 'Este módulo é exclusivo do plano PRO',
    description:
      'Avance para uma operação mais profissional, com menos retrabalho e mais clareza em cada entrega.',
  };

  React.useEffect(() => {
    if (autoOpen) {
      setIsModalOpen(true);
    }
  }, [autoOpen, feature]);

  const goToPricing = () => {
    setIsModalOpen(false);
    navigate('/pricing');
  };

  return (
    <>
      <div
        className={cn(
          'flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-brand/30 bg-white p-6 shadow-sm',
          compact && 'min-h-0 justify-start'
        )}
      >
        <div className="max-w-2xl text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Lock className="h-7 w-7" />
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Plano PRO
          </p>
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
            {title ?? copy.title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-text-secondary">
            {description ?? copy.description}
          </p>

          {feature === 'performance' ? (
            <div className="mt-7 inline-flex rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-text-secondary">
              Em breve
            </div>
          ) : (
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                Fazer upgrade
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={goToPricing}>
                Ver planos
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen && feature !== 'performance'}
        onClose={() => setIsModalOpen(false)}
        title="Desbloquear plano PRO"
        className="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-brand/15 bg-brand/[0.06] p-5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">
              Você está a um passo de profissionalizar sua operação
            </h2>
            <p className="mt-3 leading-7 text-text-secondary">
              O PRO libera os fluxos que reduzem retrabalho, aceleram aprovações e deixam sua
              entrega mais previsível para clientes e equipe.
            </p>
          </div>

          <div className="space-y-3">
            {BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <p className="text-sm leading-6 text-text-primary">{benefit}</p>
              </div>
            ))}
          </div>

          <Button onClick={goToPricing} className="w-full gap-2 py-3 text-base">
            Desbloquear agora
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Modal>
    </>
  );
};
