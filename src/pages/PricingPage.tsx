import * as React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../shared/components/Card';
import { STRIPE_PAYMENT_LINKS, type PlanId } from '../shared/constants/plans';
import { cn } from '../shared/utils/cn';
import { trackMetaEvent } from '../services/meta-conversions.service';

interface PricingPlan {
  id: PlanId;
  name: string;
  price: string;
  value: number;
  description: string;
  benefits: string[];
  highlighted?: boolean;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'start',
    name: 'Start',
    price: 'R$57',
    value: 57,
    description: 'Para sair da bagunça e organizar a produção essencial.',
    benefits: [
      'Planeje seus conteúdos sem depender de planilhas soltas',
      'Acompanhe cada entrega do primeiro rascunho à publicação',
      'Guarde ideias antes que elas se percam na rotina',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'R$117',
    value: 117,
    description: 'Para transformar rotina em processo e mostrar mais clareza ao cliente.',
    benefits: [
      'Use referências para criar com mais direção',
      'Monte relatórios simples para fechar ciclos com contexto',
      'Mantenha a operação mais visível sem aumentar o ruído',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$147,90',
    value: 147.9,
    description: 'Para operar como uma equipe profissional, com aprovação, IA e acesso multiusuário.',
    highlighted: true,
    benefits: [
      'Envie conteúdos para seus clientes aprovarem com um clique',
      'Transforme ideias em roteiros prontos para gravação',
      'Traga sua equipe para o fluxo sem perder controle',
      'Conecte a operação para reduzir tarefas manuais',
    ],
  },
];

export const PricingPage = () => {
  const handleCheckoutClick = (plan: PricingPlan) => {
    trackMetaEvent({
      eventName: 'InitiateCheckout',
      customData: {
        content_category: 'subscription',
        content_ids: [plan.id],
        content_name: `${plan.name} plan`,
        contents: [{ id: plan.id, quantity: 1 }],
        currency: 'BRL',
        value: plan.value,
      },
    });
  };

  return (
    <main className="min-h-screen bg-[#F9F9F9] px-6 py-8 text-text-primary">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/workspace/dashboard"
          className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a PostHub
        </Link>

        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">
            <Sparkles className="h-4 w-4" />
            Planos PostHub
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Escolha o plano para profissionalizar sua operação de conteúdo
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-text-secondary">
            Comece com o essencial, avance com mais clareza e desbloqueie no PRO o fluxo completo
            para aprovar, criar com IA e trabalhar em equipe.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.id}
              padding="lg"
              className={cn(
                'relative flex flex-col rounded-lg border bg-white shadow-sm',
                plan.highlighted && 'border-brand shadow-md ring-1 ring-brand/20'
              )}
            >
              {plan.highlighted ? (
                <div className="absolute right-5 top-5 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
                  Mais usado
                </div>
              ) : null}

              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  {plan.name}
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-4xl font-bold text-text-primary">{plan.price}</span>
                  <span className="pb-1 text-sm text-text-secondary">/ mês</span>
                </div>
                <p className="mt-4 min-h-[72px] text-sm leading-6 text-text-secondary">
                  {plan.description}
                </p>
              </div>

              <div className="mb-8 flex-1 space-y-3">
                {plan.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <p className="text-sm leading-6 text-text-primary">{benefit}</p>
                  </div>
                ))}
              </div>

              <a
                href={STRIPE_PAYMENT_LINKS[plan.id]}
                rel="noreferrer"
                onClick={() => handleCheckoutClick(plan)}
                className={cn(
                  'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand/50',
                  plan.highlighted
                    ? 'bg-brand text-white shadow-md hover:bg-brand-hover'
                    : 'border border-gray-200 bg-white text-text-primary shadow-sm hover:bg-gray-50'
                )}
              >
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </a>
            </Card>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-6 text-text-secondary">
          O módulo de performance está em preparação e será liberado para o PRO quando estiver
          pronto para uso.
        </p>
      </div>
    </main>
  );
};
