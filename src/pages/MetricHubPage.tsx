import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  FolderUp,
  Instagram,
  Menu,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../app/context/AuthContext';
import { Button } from '../shared/components/Button';
import {
  buildMetricHubPaymentLink,
  isMetricHubPaymentLinkConfigured,
} from '../shared/constants/plans';
import { Badge } from '../shared/components/Badge';
import { trackMetaEvent } from '../services/meta-conversions.service';
import { affiliateAttributionService } from '../services/affiliate-attribution.service';
import { buildAuthPath, METRIC_HUB_APP_PATH } from '../shared/utils/authPaths';

const navItems = [
  { href: '#mobile', label: 'Mobile' },
  { href: '#fluxo', label: 'Fluxo' },
  { href: '#compra', label: 'Compra' },
];

const supportedPlatforms: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  accentClassName: string;
  cardClassName: string;
}> = [
  {
    title: 'Instagram',
    description: 'Reels, carrosseis, feed e stories organizados no mesmo historico.',
    icon: Instagram,
    accentClassName: 'text-[#D946EF]',
    cardClassName: 'border-[#F3D8FA] bg-[#FFF5FD]',
  },
  {
    title: 'TikTok',
    description: 'Centralize os prints que normalmente ficam espalhados no rolo da camera.',
    icon: Clapperboard,
    accentClassName: 'text-[#0F172A]',
    cardClassName: 'border-[#DDE7F3] bg-[#F7FAFC]',
  },
  {
    title: 'YouTube',
    description: 'Curto, longo e cortes no mesmo fluxo, sem depender de planilhas separadas.',
    icon: Youtube,
    accentClassName: 'text-[#DC2626]',
    cardClassName: 'border-[#F6D5D9] bg-[#FFF7F8]',
  },
];

const workflowSteps = [
  {
    number: '01',
    title: 'Suba prints',
    description: 'Escolha imagens ou PDFs direto do celular e forme um lote por campanha ou periodo.',
  },
  {
    number: '02',
    title: 'Revise o lote',
    description: 'Ajuste o que precisa e aprove as entradas que devem compor o historico.',
  },
  {
    number: '03',
    title: 'Consulte depois',
    description: 'Volte para comparar recortes, clientes e formatos em uma linha do tempo propria.',
  },
];

const mobileReasons = [
  {
    title: 'Feito para polegar',
    description: 'Tudo em cards empilhados, botao grande e leitura curta para quem resolve no celular.',
    icon: Smartphone,
  },
  {
    title: 'Sem misturar com o PostHub',
    description: 'O MetricHub nasce como um produto separado, com foco total no historico de metricas.',
    icon: ShieldCheck,
  },
  {
    title: 'Compra avulsa via Stripe',
    description: 'Cada usuario pode ativar o acesso do MetricHub sem precisar entrar em um plano completo.',
    icon: CheckCircle2,
  },
];

const PhonePreview = () => (
  <div className="mx-auto w-full max-w-[380px] rounded-[36px] border border-white/10 bg-[#07111E]/90 p-3 shadow-[0_28px_80px_rgba(3,17,30,0.45)] backdrop-blur-xl">
    <div className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,#0B1A2A_0%,#0F243A_100%)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8DD7FF]">
            MetricHub
          </p>
          <p className="mt-1 text-sm font-semibold text-white">Historico no celular</p>
        </div>
        <Badge className="border border-white/10 bg-white/10 text-white">Mobile</Badge>
      </div>

      <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-3">
        <div className="flex items-center gap-2">
          <Badge className="border border-white/10 bg-white/10 text-white">Instagram</Badge>
          <Badge className="border border-white/10 bg-white/10 text-white">TikTok</Badge>
          <Badge className="border border-white/10 bg-white/10 text-white">YouTube</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: 'Lotes', value: '12' },
            { label: 'Views', value: '184k' },
            { label: 'ER medio', value: '6.8%' },
            { label: 'Entradas', value: '39' },
          ].map((item) => (
            <div key={item.label} className="rounded-[20px] bg-white/[0.05] px-3 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-white/48">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.05] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Maio 2026 - shorts e collabs</p>
              <p className="mt-1 text-xs text-white/52">6 arquivos • 11 entradas</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/52" />
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/8">
            <div className="h-2 w-[72%] rounded-full bg-[#38B6FF]" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-[22px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#38B6FF]/10 text-[#8DD7FF]">
              <FolderUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Subir novos prints</p>
              <p className="text-xs text-white/52">Imagem ou PDF</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-white/52" />
        </div>
      </div>
    </div>
  </div>
);

export const MetricHubPage = () => {
  const { user } = useAuth();
  const affiliateCode = affiliateAttributionService.getSnapshot().affiliateCode;
  const checkoutConfigured = isMetricHubPaymentLinkConfigured();
  const metricHubCheckoutLink = buildMetricHubPaymentLink({ affiliateCode });
  const loginPath = buildAuthPath('/login', {
    redirectTo: METRIC_HUB_APP_PATH,
    product: 'metric-hub',
    affiliateCode,
  });
  const signupPath = buildAuthPath('/signup', {
    redirectTo: METRIC_HUB_APP_PATH,
    product: 'metric-hub',
    affiliateCode,
  });
  const appPath = METRIC_HUB_APP_PATH;

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCheckoutClick = () => {
    trackMetaEvent({
      eventName: 'InitiateCheckout',
      customData: {
        content_category: 'standalone_product',
        content_ids: ['metric_hub'],
        content_name: 'MetricHub',
        contents: [{ id: 'metric_hub', quantity: 1 }],
        currency: 'BRL',
      },
    });
  };

  const mobilePrimaryHref = checkoutConfigured ? metricHubCheckoutLink : user ? appPath : signupPath;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030711] text-white selection:bg-[#38B6FF] selection:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(56,182,255,0.2),transparent_35%),radial-gradient(circle_at_85%_16%,rgba(125,211,252,0.16),transparent_25%),linear-gradient(180deg,#030711_0%,#06101A_52%,#07111C_100%)]" />
      <div className="pointer-events-none fixed left-[-8rem] top-24 h-72 w-72 rounded-full bg-[#38B6FF]/12 blur-3xl" />
      <div className="pointer-events-none fixed right-[-10rem] top-32 h-96 w-96 rounded-full bg-cyan-400/12 blur-3xl" />

      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          isScrolled ? 'px-3 pt-3 md:px-6' : 'px-0 pt-0'
        }`}
      >
        <div
          className={`mx-auto flex max-w-7xl items-center justify-between transition-all duration-300 ${
            isScrolled
              ? 'rounded-[28px] border border-white/10 bg-[#07101f]/80 px-5 py-3 shadow-[0_20px_60px_rgba(2,8,23,0.45)] backdrop-blur-xl md:px-7'
              : 'border-b border-white/8 bg-transparent px-6 py-5 md:px-12'
          }`}
        >
          <div className="flex items-center gap-3">
            <Link to="/" className="flex shrink-0 items-center">
              <img
                src="/logo-full-white.png"
                alt="PostHub"
                className="h-10 w-auto object-contain md:h-11"
              />
            </Link>
            <div className="hidden rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/74 sm:block">
              MetricHub
            </div>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-white/66 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to={loginPath}>
              <Button
                variant="ghost"
                className="rounded-full px-5 text-sm text-white/70 hover:bg-white/6 hover:text-white"
              >
                Login
              </Button>
            </Link>
            {checkoutConfigured ? (
              <a href={metricHubCheckoutLink} rel="noreferrer" onClick={handleCheckoutClick}>
                <Button className="rounded-full px-6 text-sm font-semibold shadow-[0_18px_34px_rgba(56,182,255,0.28)]">
                  Comprar no Stripe
                </Button>
              </a>
            ) : (
              <Link to={signupPath}>
                <Button className="rounded-full px-6 text-sm font-semibold shadow-[0_18px_34px_rgba(56,182,255,0.28)]">
                  Abrir experiencia
                </Button>
              </Link>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/72 transition-colors hover:bg-white/8 md:hidden"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mx-3 mt-3 rounded-[28px] border border-white/10 bg-[#07101f]/92 p-5 shadow-[0_20px_60px_rgba(2,8,23,0.5)] backdrop-blur-xl md:hidden"
            >
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl px-4 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}

                <div className="my-2 h-px bg-white/10" />

                <Link to={loginPath} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="secondary"
                    className="w-full rounded-2xl border-white/10 bg-white/5 text-sm text-white hover:bg-white/10"
                  >
                    Login
                  </Button>
                </Link>

                {checkoutConfigured ? (
                  <a
                    href={metricHubCheckoutLink}
                    rel="noreferrer"
                    onClick={() => {
                      handleCheckoutClick();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Button className="mt-2 w-full rounded-2xl text-sm font-semibold">
                      Comprar no Stripe
                    </Button>
                  </a>
                ) : (
                  <Link to={signupPath} onClick={() => setMobileMenuOpen(false)}>
                    <Button className="mt-2 w-full rounded-2xl text-sm font-semibold">
                      Abrir experiencia
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main className="relative z-10 pb-28 md:pb-12">
        <section className="px-6 pb-18 pt-28 md:px-12 md:pb-20 md:pt-40">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="text-left"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[#38B6FF]/20 bg-[#38B6FF]/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8DD7FF]">
                <Sparkles className="h-3.5 w-3.5" />
                Produto separado da PostHub
              </div>

              <h1 className="mt-8 max-w-[11ch] text-5xl font-semibold leading-[0.94] tracking-[-0.04em] text-white sm:text-6xl lg:text-[5.1rem]">
                Seu historico de metricas,
                <span className="mt-2 block bg-gradient-to-r from-[#8DDBFF] via-[#4ABEFF] to-[#7CDAFF] bg-clip-text text-transparent">
                  agora pensado para mobile.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/64 md:text-xl">
                O MetricHub foi desenhado para quem recebe prints de Instagram, TikTok e YouTube o
                dia inteiro e quer transformar isso em historico proprio, limpo e consultavel.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {supportedPlatforms.map((platform) => (
                  <span
                    key={platform.title}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/68"
                  >
                    {platform.title}
                  </span>
                ))}
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                {checkoutConfigured ? (
                  <a href={metricHubCheckoutLink} rel="noreferrer" onClick={handleCheckoutClick}>
                    <Button
                      size="lg"
                      className="flex w-full items-center justify-center gap-2 rounded-full px-8 shadow-[0_20px_40px_rgba(56,182,255,0.3)] sm:w-auto"
                    >
                      Comprar no Stripe
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                ) : (
                  <Link to={user ? appPath : signupPath}>
                    <Button
                      size="lg"
                      className="flex w-full items-center justify-center gap-2 rounded-full px-8 shadow-[0_20px_40px_rgba(56,182,255,0.3)] sm:w-auto"
                    >
                      {user ? 'Abrir painel mobile' : 'Criar conta e abrir app'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}

                <Link to={user ? appPath : loginPath} className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex w-full items-center justify-center rounded-full border-white/10 bg-white/6 px-8 text-white hover:bg-white/10 sm:w-auto"
                  >
                    {user ? 'Entrar no MetricHub' : 'Ver fluxo de acesso'}
                  </Button>
                </Link>
              </div>

              <p className="mt-5 max-w-xl text-sm leading-6 text-white/42">
                Compra separada da PostHub, com fluxo focado em celular e acesso rapido ao painel
                de historico.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12 }}
            >
              <PhonePreview />
            </motion.div>
          </div>
        </section>

        <section id="mobile" className="border-t border-white/8 bg-[#050C17]/88 px-6 py-20 md:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8DD7FF]">
                Feito para celular
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                Menos pinch-zoom, mais decisao rapida.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/62 sm:text-lg">
                O layout foi pensado do mobile para cima: cards verticais, leitura curta, CTA fixo
                e historico facil de retomar entre uma reuniao e outra.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {mobileReasons.map((reason) => (
                <div
                  key={reason.title}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-[#8DD7FF]">
                    <reason.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-white">{reason.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/62">{reason.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="fluxo" className="px-6 py-20 md:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8DD7FF]">
                  Fluxo do produto
                </p>
                <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                  Um unico objetivo: salvar e organizar metricas que nasceram em print.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/62 sm:text-lg">
                  Nada de misturar aprovacao, calendario e kanban. Aqui a jornada inteira gira em
                  torno de subir, revisar e consultar historico.
                </p>
              </div>

              <div className="space-y-4">
                {workflowSteps.map((step) => (
                  <div
                    key={step.number}
                    className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#38B6FF]/14 text-sm font-semibold text-[#8DD7FF]">
                        {step.number}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-white/62">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#050C17]/88 px-6 py-20 md:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8DD7FF]">
                Plataformas suportadas
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                Um historico unico, mesmo quando as redes falam linguas diferentes.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {supportedPlatforms.map((platform) => (
                <div
                  key={platform.title}
                  className={`rounded-[28px] border p-6 ${platform.cardClassName}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <platform.icon className={`h-5 w-5 ${platform.accentClassName}`} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{platform.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{platform.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="compra" className="px-6 py-20 md:px-12">
          <div className="mx-auto max-w-5xl">
            <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(56,182,255,0.12),rgba(255,255,255,0.04))] p-6 shadow-[0_20px_70px_rgba(2,8,23,0.32)] backdrop-blur-xl sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white">
                    <BarChart3 className="h-4 w-4" />
                    MetricHub
                  </div>

                  <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                    Um produto separado, com compra avulsa e foco total em metricas.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-white/64 sm:text-lg">
                    Ideal para creators, social medias e times enxutos que nao precisam do stack
                    inteiro da PostHub, mas precisam guardar historico e contexto de performance.
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-[#07111D]/84 p-5">
                  <div className="space-y-3 text-sm text-white/70">
                    <div className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#8DD7FF]" />
                      <p>Historico por perfil e por plataforma.</p>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#8DD7FF]" />
                      <p>Upload de imagem e PDF no celular.</p>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#8DD7FF]" />
                      <p>Jornada curta, sem misturar com os modulos do PostHub.</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    {checkoutConfigured ? (
                      <a href={metricHubCheckoutLink} rel="noreferrer" onClick={handleCheckoutClick}>
                        <Button className="w-full gap-2 rounded-2xl">
                          Comprar no Stripe
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </a>
                    ) : (
                      <Link to={user ? appPath : signupPath}>
                        <Button className="w-full gap-2 rounded-2xl">
                          {user ? 'Abrir painel mobile' : 'Criar conta e abrir app'}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}

                    <Link to={user ? appPath : loginPath}>
                      <Button
                        variant="secondary"
                        className="w-full rounded-2xl border-white/10 bg-white/6 text-white hover:bg-white/10"
                      >
                        {user ? 'Entrar no MetricHub' : 'Acessar fluxo de login'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#07111D]/94 px-4 pb-4 pt-3 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        <div className="mx-auto flex max-w-7xl gap-3">
          <a
            href={mobilePrimaryHref}
            rel={checkoutConfigured ? 'noreferrer' : undefined}
            onClick={checkoutConfigured ? handleCheckoutClick : undefined}
            className="flex-1"
          >
            <Button className="w-full rounded-2xl">
              {checkoutConfigured ? 'Comprar' : user ? 'Abrir app' : 'Criar conta'}
            </Button>
          </a>
          <Link to={user ? appPath : loginPath} className="flex-1">
            <Button
              variant="secondary"
              className="w-full rounded-2xl border-white/10 bg-white/6 text-white hover:bg-white/10"
            >
              {user ? 'Entrar' : 'Login'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
