import * as React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  History,
  Info,
  Plus,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { useAuth } from '../../app/context/AuthContext';
import {
  normalizePlan,
  STRIPE_PAYMENT_LINKS,
  STRIPE_PRICE_IDS,
  type PlanId,
} from '../../shared/constants/plans';
import { trackMetaEvent } from '../../services/meta-conversions.service';
import { cn } from '../../shared/utils/cn';

interface BillingPlan {
  id: PlanId;
  name: string;
  price: string;
  value: number;
  credits: string;
  description: string;
  benefits: string[];
  highlighted?: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  date: string;
  status: 'concluído' | 'pendente';
  detail: string;
}

const BILLING_PLANS: BillingPlan[] = [
  {
    id: 'start',
    name: 'Start',
    price: 'R$57',
    value: 57,
    credits: '1.000 créditos/mês',
    description: 'Para organizar a produção essencial.',
    benefits: ['Calendário editorial', 'Kanban de conteúdo', 'Banco de ideias'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'R$117',
    value: 117,
    credits: '2.500 créditos/mês',
    description: 'Para uma rotina com mais processo e clareza.',
    benefits: ['Tudo do Start', 'Referências criativas', 'Relatórios'],
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$147,90',
    value: 147.9,
    credits: '5.000 créditos/mês',
    description: 'Para uma operação com equipe, aprovação e IA.',
    benefits: ['Tudo do Growth', 'Gerador de roteiros', 'Consultor IA', 'Aprovação e equipe'],
  },
];

const TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'Assinatura',
    amount: '+1.000 créditos',
    date: 'Recarga mensal',
    status: 'concluído',
    detail: 'Plano Start via Stripe',
  },
  {
    id: '2',
    type: 'Uso',
    amount: '-10 créditos',
    date: 'Hoje',
    status: 'concluído',
    detail: 'Geração de roteiro',
  },
  {
    id: '3',
    type: 'Uso',
    amount: '-25 créditos',
    date: 'Ontem',
    status: 'concluído',
    detail: 'Banco de ideias',
  },
  {
    id: '4',
    type: 'Compra',
    amount: 'Plano ativo',
    date: 'Após checkout',
    status: 'pendente',
    detail: 'Webhook Stripe atualiza o plano do usuário',
  },
];

const PLAN_LABELS: Record<PlanId, string> = {
  start: 'Start',
  growth: 'Growth',
  pro: 'Pro',
};

const formatCurrentPlan = (plan?: string | null) => {
  const normalizedPlan = normalizePlan(plan);
  if (normalizedPlan) return PLAN_LABELS[normalizedPlan];

  const normalizedText = (plan || '').toLowerCase().trim();
  if (normalizedText === 'start_7' || normalizedText === 'teste' || normalizedText === 'trial') {
    return 'Teste grátis';
  }

  if (normalizedText === 'blocked' || normalizedText === 'bloqueado') return 'Bloqueado';

  return 'Sem plano ativo';
};

const getPlanBadgeVariant = (plan?: string | null) => {
  const normalizedPlan = normalizePlan(plan);
  return normalizedPlan ? 'brand' : 'default';
};

export const Credits = () => {
  const { user } = useAuth();
  const currentPlan = normalizePlan(user?.currentPlan);
  const currentPlanLabel = formatCurrentPlan(user?.currentPlan);
  const activePlan = currentPlan
    ? BILLING_PLANS.find((plan) => plan.id === currentPlan) ?? BILLING_PLANS[0]
    : null;

  const handleCheckoutClick = (plan: BillingPlan) => {
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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
            <CreditCard className="h-6 w-6 text-brand" />
            Créditos e Cobrança
          </h1>
          <p className="text-text-secondary">
            Gerencie o plano da PostHub, acompanhe créditos e finalize compras com segurança no Stripe.
          </p>
        </div>
        <a
          href="#stripe-plans"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/50"
        >
          <Plus className="h-4 w-4" />
          Comprar pela Stripe
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="relative overflow-hidden border-none bg-brand text-white">
          <div className="relative z-10">
            <p className="mb-1 text-sm text-white/80">Créditos Disponíveis</p>
            <h2 className="mb-6 text-4xl font-bold">{activePlan ? '1.240' : '0'}</h2>
            <div className="flex w-fit items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3 w-3" />
              {activePlan?.credits ?? 'Escolha um plano para liberar créditos'}
            </div>
          </div>
          <Zap className="absolute bottom-[-20px] right-[-20px] h-32 w-32 rotate-12 text-white/10" />
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="mb-1 text-sm text-text-secondary">Plano Atual</p>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-text-primary">{currentPlanLabel}</h2>
              <Badge variant={getPlanBadgeVariant(user?.currentPlan)}>
                {currentPlan ? 'Ativo' : 'Ação necessária'}
              </Badge>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-text-secondary">
            O webhook do Stripe confirma o pagamento e atualiza o plano no cadastro do usuário.
          </p>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="mb-1 text-sm text-text-secondary">Compra Segura</p>
            <h2 className="text-2xl font-bold text-text-primary">Stripe Checkout</h2>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <p className="text-sm leading-6 text-text-secondary">
              Pagamentos, recibos e métodos de pagamento ficam no ambiente seguro do Stripe.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Créditos</CardTitle>
              <CardDescription>Movimentações principais de compra, recarga e uso.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              Ver tudo
            </Button>
          </div>

          <div className="space-y-4">
            {TRANSACTIONS.map((transaction) => {
              const isCredit = transaction.amount.startsWith('+');

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        isCredit ? 'bg-green-100 text-green-600' : 'bg-brand/10 text-brand'
                      )}
                    >
                      {isCredit ? <Plus className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">{transaction.type}</p>
                      <p className="text-xs text-text-secondary">{transaction.detail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-sm font-bold',
                        isCredit ? 'text-green-600' : 'text-text-primary'
                      )}
                    >
                      {transaction.amount}
                    </p>
                    <p className="text-xs text-text-secondary">{transaction.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-brand" />
              <CardTitle>Créditos Avulsos</CardTitle>
            </div>
            <p className="mb-4 text-sm leading-6 text-text-secondary">
              Pacotes avulsos entram aqui quando os produtos e Price IDs de créditos forem criados no Stripe.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Aguardando produtos no Stripe
            </Button>
          </Card>

          <Card className="border-none bg-gray-900 text-white">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-brand" />
              <h3 className="font-bold">Status da Cobrança</h3>
            </div>
            <p className="mb-4 text-sm leading-6 text-white/70">
              Pagamentos de assinatura usam Payment Links. A confirmação chega pelo webhook
              `stripe-webhook`.
            </p>
            <a
              href="#stripe-plans"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-white transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              Ver planos
              <ArrowRight className="h-4 w-4" />
            </a>
          </Card>
        </div>
      </div>

      <Card id="stripe-plans">
        <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Comprar Plano da Plataforma</CardTitle>
            <CardDescription>
              Escolha um plano e finalize a compra pelo link seguro do Stripe.
            </CardDescription>
          </div>
          <Badge variant="brand">Stripe Billing</Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {BILLING_PLANS.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={cn(
                  'flex flex-col rounded-lg border p-5 transition-colors',
                  plan.highlighted ? 'border-brand bg-brand/5' : 'border-gray-100',
                  isCurrentPlan ? 'ring-2 ring-brand/30' : ''
                )}
              >
                <div className="mb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                    {isCurrentPlan ? <Badge variant="brand">Atual</Badge> : null}
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-text-primary">{plan.price}</span>
                    <span className="pb-1 text-sm text-text-secondary">/ mês</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{plan.description}</p>
                  <p className="mt-3 text-sm font-semibold text-brand">{plan.credits}</p>
                </div>

                <div className="mb-6 flex-1 space-y-3">
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
                    isCurrentPlan
                      ? 'border border-gray-200 bg-white text-text-primary shadow-sm hover:bg-gray-50'
                      : 'bg-brand text-white shadow-sm hover:bg-brand-hover'
                  )}
                >
                  {isCurrentPlan ? 'Renovar no Stripe' : 'Comprar no Stripe'}
                  <ExternalLink className="h-4 w-4" />
                </a>

                <p className="mt-3 text-center text-xs text-text-secondary">
                  Price ID: {STRIPE_PRICE_IDS[plan.id]}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
