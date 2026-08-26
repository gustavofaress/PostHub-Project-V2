import * as React from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/context/AuthContext';
import { useProfile } from '../app/context/ProfileContext';
import { useActiveProfileCommercialAccess } from '../hooks/useActiveProfileCommercialAccess';
import { profileBillingService } from '../services/profile-billing.service';
import { trackMetaEvent } from '../services/meta-conversions.service';
import { Badge } from '../shared/components/Badge';
import { Button } from '../shared/components/Button';
import { Card } from '../shared/components/Card';
import {
  resolveProfilePricingState,
  resolveProfileProCheckoutProfileId,
} from '../shared/utils/profilePricing';
import { cn } from '../shared/utils/cn';

const FREE_FEATURES = [
  'Dashboard',
  'Banco de Ideias',
  'Calendário Editorial',
  'Kanban Editorial',
  'Configurações básicas',
  '1 perfil incluído',
  'Owner + até 2 membros adicionais',
];

const PRO_FEATURES = [
  'Tudo do FREE',
  'Referências',
  'Aprovação e links públicos de aprovação',
  'Performance',
  'Métricas e Social Analytics',
  'Relatórios',
  'Membros adicionais ilimitados',
  'Elegibilidade para adquirir perfis adicionais separadamente',
];

const getCheckoutErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return 'Não foi possível iniciar o checkout PRO deste perfil. Tente novamente em instantes.';
};

export const PricingPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { activeProfile, isLoadingProfiles } = useProfile();
  const commercialAccess = useActiveProfileCommercialAccess();
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = React.useState(false);
  const checkoutInFlightRef = React.useRef(false);
  const entitlementStatus = activeProfile?.id
    ? commercialAccess.entitlementStatus
    : isLoadingProfiles
    ? 'loading'
    : 'missing';

  const pricingState = resolveProfilePricingState({
    profileId: activeProfile?.id,
    profileName: activeProfile?.name,
    profileRole: activeProfile?.role,
    isLoadingProfile: isLoadingProfiles,
    entitlementStatus,
    planCode: commercialAccess.entitlements?.plan_code ?? null,
    entitlementSource: commercialAccess.entitlements?.source ?? null,
    isAdmin: !!user?.isAdmin,
    isCheckoutLoading,
  });

  React.useEffect(() => {
    checkoutInFlightRef.current = false;
    setIsCheckoutLoading(false);
    setCheckoutError(null);
  }, [activeProfile?.id]);

  const handleProfileProCheckout = async () => {
    const checkoutProfileId = resolveProfileProCheckoutProfileId(pricingState);

    if (!checkoutProfileId || checkoutInFlightRef.current) {
      return;
    }

    checkoutInFlightRef.current = true;
    setIsCheckoutLoading(true);
    setCheckoutError(null);

    try {
      trackMetaEvent({
        eventName: 'InitiateCheckout',
        customData: {
          content_category: 'profile_subscription',
          content_ids: ['profile_pro'],
          content_name: 'PostHub PRO por perfil',
          contents: [{ id: 'profile_pro', quantity: 1 }],
          currency: 'BRL',
          value: 47.9,
        },
      });

      const result = await profileBillingService.createProfileProCheckout(checkoutProfileId);

      if (!result.checkoutUrl) {
        throw new Error('O checkout PRO não retornou uma URL válida.');
      }

      window.location.assign(result.checkoutUrl);
    } catch (error) {
      checkoutInFlightRef.current = false;
      setIsCheckoutLoading(false);
      setCheckoutError(getCheckoutErrorMessage(error));
    }
  };

  return (
    <main className="min-h-screen bg-bg-main px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to={isAuthenticated ? '/workspace/dashboard' : '/'}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          {isAuthenticated ? 'Voltar para a PostHub' : 'Voltar para o site'}
        </Link>

        <section className="mb-8 grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <Badge
              variant="brand"
              className="mb-4 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em]"
            >
              Planos por perfil
            </Badge>
            <h1 className="max-w-3xl text-3xl font-bold tracking-[-0.04em] text-text-primary md:text-5xl">
              Escolha o plano do perfil que você está gerenciando agora
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary md:text-lg">
              A cobrança do PostHub é vinculada ao perfil ativo. Trocar de perfil também troca o
              plano, os recursos disponíveis e as ações de upgrade.
            </p>
          </div>

          <Card className="border-brand/20 bg-white/90">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                  Plano do perfil
                </p>
                <h2 className="mt-1 text-lg font-bold text-text-primary">
                  {pricingState.profileName ?? 'Nenhum perfil ativo'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {pricingState.isLoading
                    ? 'Carregando o plano materializado deste perfil...'
                    : pricingState.helperMessage ?? 'Gerencie o upgrade somente para este perfil.'}
                </p>
              </div>
            </div>
          </Card>
        </section>

        {!isAuthenticated ? (
          <Card className="mb-6 border-amber-200 bg-amber-50 text-amber-900">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-bold">Entre para gerenciar o plano de um perfil</h2>
                <p className="mt-1 text-sm leading-6">
                  O checkout PRO é liberado apenas dentro de um workspace autenticado.
                </p>
              </div>
              <div className="flex gap-2">
                <Link to="/login">
                  <Button variant="secondary">Entrar</Button>
                </Link>
                <Link to="/signup">
                  <Button>Criar conta FREE</Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : null}

        {activeProfile?.id && (commercialAccess.isError || commercialAccess.isMissingEntitlement) ? (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h2 className="font-bold text-amber-950">
                    Não foi possível identificar o plano deste perfil
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-amber-900">
                    Por segurança, o checkout fica indisponível até a leitura do entitlement
                    materializado ser confirmada.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => void commercialAccess.refetch()}
                className="gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          </Card>
        ) : null}

        {checkoutError ? (
          <Card className="mb-6 border-red-200 bg-red-50 text-red-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm leading-6">{checkoutError}</p>
            </div>
          </Card>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <Card
            padding="lg"
            className={cn(
              'relative flex flex-col border-slate-200 bg-white',
              pricingState.isFreeCurrent && 'ring-2 ring-brand/20'
            )}
          >
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-secondary">
                  FREE
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-4xl font-bold tracking-[-0.04em] text-text-primary">
                    R$ 0
                  </span>
                </div>
                <p className="mt-4 max-w-md text-sm leading-6 text-text-secondary">
                  O essencial para organizar um perfil, produzir conteúdo e trabalhar com uma
                  equipe pequena.
                </p>
              </div>
              {pricingState.freeBadgeLabel ? (
                <Badge variant="brand">{pricingState.freeBadgeLabel}</Badge>
              ) : null}
            </div>

            <div className="mb-8 flex-1 space-y-3">
              {FREE_FEATURES.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <p className="text-sm leading-6 text-text-primary">{feature}</p>
                </div>
              ))}
            </div>

            <Button variant="secondary" className="w-full" disabled>
              {pricingState.isFreeCurrent ? 'Plano atual' : 'Incluído no cadastro'}
            </Button>
          </Card>

          <Card
            padding="lg"
            className={cn(
              'relative flex flex-col overflow-hidden border-brand/50 bg-white shadow-lg ring-1 ring-brand/10',
              pricingState.isProCurrent && 'ring-2 ring-brand/30'
            )}
          >
            <div className="pointer-events-none absolute right-[-20%] top-[-25%] h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
            <div className="relative mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                  PRO
                </p>
                <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <span className="text-4xl font-bold tracking-[-0.04em] text-text-primary">
                    R$ 47,90
                  </span>
                  <span className="pb-1 text-sm font-medium text-text-secondary">
                    / mês / perfil
                  </span>
                </div>
                <p className="mt-4 max-w-md text-sm leading-6 text-text-secondary">
                  Para liberar o fluxo completo daquele perfil, com aprovações, referências,
                  performance e relatórios.
                </p>
              </div>
              {pricingState.proBadgeLabel ? (
                <Badge variant="brand" className="shrink-0">
                  {pricingState.proBadgeLabel}
                </Badge>
              ) : null}
            </div>

            <div className="relative mb-8 flex-1 space-y-3">
              {PRO_FEATURES.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <p className="text-sm leading-6 text-text-primary">{feature}</p>
                </div>
              ))}
            </div>

            <div className="relative space-y-3">
              <Button
                className="w-full gap-2"
                disabled={!pricingState.canStartCheckout}
                isLoading={isCheckoutLoading}
                onClick={handleProfileProCheckout}
              >
                {pricingState.proButtonLabel}
                {pricingState.canStartCheckout ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
              {pricingState.proAction === 'upgrade_to_pro' ? (
                <p className="text-center text-xs leading-5 text-text-secondary">
                  Você será redirecionado para o Checkout seguro do Stripe.
                </p>
              ) : pricingState.helperMessage ? (
                <p className="text-center text-xs leading-5 text-text-secondary">
                  {pricingState.helperMessage}
                </p>
              ) : null}
            </div>
          </Card>
        </section>

        <Card className="mt-6 border-slate-200 bg-slate-50/80">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div>
                <h2 className="font-bold text-text-primary">
                  PRO é por perfil, não por conta inteira
                </h2>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  Perfis adicionais não estão incluídos gratuitamente no PRO. O plano habilita a
                  possibilidade de adquirir perfis adicionais separadamente quando esse fluxo estiver
                  disponível.
                </p>
              </div>
            </div>
            <Sparkles className="hidden h-8 w-8 text-brand/40 md:block" />
          </div>
        </Card>
      </div>
    </main>
  );
};
