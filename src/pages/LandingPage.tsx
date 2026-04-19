import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle,
  LayoutDashboard,
  Lightbulb,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '../shared/components/Button';
import { STRIPE_PAYMENT_LINKS, type PlanId } from '../shared/constants/plans';
import { trackMetaEvent } from '../services/meta-conversions.service';

type LandingModule = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  image?: string;
  eyebrow: string;
  topics: string[];
  outcomes: string[];
};

const navItems = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#preco', label: 'Planos' },
];

const heroSignals: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: 'Fluxo visivel do briefing a aprovacao',
    description:
      'Cada etapa fica clara para quem cria, aprova e acompanha o conteudo no dia a dia.',
    icon: Workflow,
  },
  {
    title: 'Menos improviso, mais consistencia',
    description:
      'Ideias, roteiros e planejamento deixam de viver em ferramentas soltas e avancam com contexto.',
    icon: Zap,
  },
  {
    title: 'Aprovacao sem ruido',
    description:
      'Pare de depender de WhatsApp, prints e mensagens perdidas para fechar uma entrega.',
    icon: ShieldCheck,
  },
];

const heroMetrics = [
  { value: '5 modulos', label: 'integrados em um fluxo unico' },
  { value: '4 etapas', label: 'para sair do caos e operar com clareza' },
  { value: '7 dias', label: 'de teste gratis para explorar a plataforma' },
];

const workflowPills = ['Ideias', 'Calendario', 'Kanban', 'Aprovacao', 'Membros'];

const modules: LandingModule[] = [
  {
    id: 'ideias',
    title: 'Banco de Ideias',
    description:
      'Nunca mais perca uma boa ideia. Capture, categorize e desenvolva seus insights em um repositorio centralizado e organizado.',
    icon: Lightbulb,
    image: '/banco-de-ideias.png',
    eyebrow: 'Capte o que merece virar pauta',
    topics: [
      'Captura rapida via atalhos',
      'Categorizacao por tags e temas',
      'Status de maturacao da ideia',
      'Integracao direta com roteiros',
    ],
    outcomes: [
      'Centralize referencias e insights antes que eles virem retrabalho.',
      'Leve cada ideia para o modulo certo sem perder timing nem contexto.',
    ],
  },
  {
    id: 'calendario',
    title: 'Calendario Editorial',
    description:
      'Tenha visao total da sua estrategia. Planeje semanas ou meses de conteudo com uma interface visual e intuitiva.',
    icon: Calendar,
    image: '/calendario-editorial.png',
    eyebrow: 'Planejamento com visao de calendario',
    topics: [
      'Visao mensal, semanal e diaria',
      'Filtros por rede social e formato',
      'Arraste e solte para reagendar',
      'Identificacao de lacunas de postagem',
    ],
    outcomes: [
      'Organize campanhas, formatos e prioridades sem perder o panorama das proximas semanas.',
      'Reaja rapido a mudancas de prazo sem desmontar toda a operacao.',
    ],
  },
  {
    id: 'kanban',
    title: 'Kanban de Producao',
    description:
      'Acompanhe cada etapa da criacao. Saiba exatamente o que esta sendo escrito, gravado, editado ou aguardando aprovacao.',
    icon: LayoutDashboard,
    image: '/kanban.png',
    eyebrow: 'Producao com dono, status e prazo',
    topics: [
      'Colunas personalizaveis',
      'Atribuicao de responsaveis',
      'Prazos e alertas de atraso',
      'Anexos de arquivos pesados',
    ],
    outcomes: [
      'Deixe visivel o que esta travado, em andamento e pronto para seguir adiante.',
      'Reduza cobrancas manuais com um quadro que mostra a operacao em tempo real.',
    ],
  },
  {
    id: 'aprovacao',
    title: 'Aprovacao de Conteudo',
    description:
      'Elimine o vai-e-vem no WhatsApp. Compartilhe links de aprovacao com clientes ou gestores e receba feedback pontual.',
    icon: CheckCircle,
    image: '/aprovacao.png',
    eyebrow: 'Feedback no lugar certo',
    topics: [
      'Links externos seguros',
      'Comentarios diretos na peca',
      'Historico de alteracoes',
      'Aprovacao com um clique',
    ],
    outcomes: [
      'Concentre comentarios, ajustes e status no mesmo espaco em que a peca sera aprovada.',
      'Mostre mais profissionalismo ao cliente sem criar um fluxo paralelo fora da plataforma.',
    ],
  },
  {
    id: 'membros',
    title: 'Membros',
    description:
      'Centralize membros, permissoes, vinculos de tarefas e comentarios operacionais do workspace no mesmo lugar.',
    icon: UsersRound,
    image: '/membros.png',
    eyebrow: 'Equipe, acessos e responsabilidades',
    topics: [
      'Convite e gestao de membros no workspace',
      'Permissoes por modulo e nivel de acesso',
      'Demandas vinculadas a responsaveis',
      'Visibilidade operacional por perfil ativo',
    ],
    outcomes: [
      'Organize quem pode acessar cada area sem depender de controles manuais fora da plataforma.',
      'Deixe claro quem responde por cada demanda e mantenha a operacao mais segura para crescer em equipe.',
    ],
  },
];

const pricingPlans: Array<{
  id: PlanId;
  name: string;
  price: string;
  value: number;
  description: string;
  benefits: string[];
  highlighted?: boolean;
}> = [
  {
    id: 'start',
    name: 'Start',
    price: 'R$57',
    value: 57,
    description: 'Para organizar o essencial sem depender de planilhas soltas.',
    benefits: [
      'Planeje seus conteudos com mais clareza',
      'Acompanhe cada entrega do rascunho a publicacao',
      'Guarde boas ideias antes que elas se percam',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'R$117',
    value: 117,
    description: 'Para transformar rotina em processo e mostrar mais contexto ao cliente.',
    benefits: [
      'Use referencias para criar com mais direcao',
      'Monte relatorios simples para fechar ciclos',
      'Ganhe mais visibilidade sem aumentar o ruido',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$147,90',
    value: 147.9,
    description: 'Para operar como uma equipe profissional, com aprovacao, IA e colaboracao.',
    highlighted: true,
    benefits: [
      'Envie conteudos para aprovacao com um clique',
      'Transforme ideias em roteiros prontos para gravar',
      'Traga sua equipe para o fluxo sem perder controle',
      'Conecte a operacao para reduzir tarefas manuais',
    ],
  },
];

const howItWorksSteps = [
  {
    num: '01',
    title: 'Capture ideias',
    desc: 'Registre insights no momento em que surgem, antes que se percam na rotina.',
    tag: 'Entrada organizada',
  },
  {
    num: '02',
    title: 'Monte a estrategia',
    desc: 'Transforme ideias soltas em roteiros estruturados e posicione-os no calendario.',
    tag: 'Planejamento claro',
  },
  {
    num: '03',
    title: 'Execute com clareza',
    desc: 'Acompanhe o status de cada peca no kanban. Grave, edite e aprove sem atrito.',
    tag: 'Producao alinhada',
  },
  {
    num: '04',
    title: 'Ajuste com dados',
    desc: 'Analise a performance do que foi publicado e retroalimente seu banco de ideias.',
    tag: 'Melhoria continua',
  },
];

const HERO_VIMEO_EMBED_URL =
  'https://player.vimeo.com/video/1184592877?autoplay=1&muted=1&loop=0&autopause=1&title=0&byline=0&portrait=0&playsinline=1';

const ApprovalPreview = () => (
  <div className="grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,16,32,0.98),rgba(4,8,18,0.95))] p-4 shadow-[0_18px_50px_rgba(2,8,23,0.35)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[#7CCEFF]">
            Link de aprovacao
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            Feedback e decisao no mesmo fluxo
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[0.7rem] font-semibold text-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          Seguro
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-[#0A1328]">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(56,182,255,0.26),transparent_42%),linear-gradient(135deg,#132445_0%,#091120_100%)] p-5">
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Reel campanha de lancamento</p>
                <p className="mt-1 text-xs text-white/55">
                  Cliente visualiza a peca, contexto e observacoes sem sair do link.
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.65rem] font-semibold text-white/75">
                Instagram
              </span>
            </div>

            <div className="mt-4 rounded-[20px] border border-white/10 bg-[#050B16] p-4">
              <div className="flex items-center justify-between">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Status
                </p>
                <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[0.7rem] font-semibold text-amber-200">
                  Em revisao
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-[18px] bg-white/5 px-3 py-3 text-sm text-white/80">
                  Titulo: Manifesto da nova operacao de conteudo
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/60">
                  Observacao do cliente: destacar CTA final e trazer mais clareza no beneficio.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-white/[0.03] px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/40">
                Comentarios
              </p>
              <p className="mt-2 text-sm text-white/78">
                Comentarios ligados ao item certo, sem prints perdidos.
              </p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/40">
                Decisao
              </p>
              <p className="mt-2 text-sm text-white/78">
                Ajustar, aprovar ou validar com historico registrado.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="space-y-4">
      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#38B6FF]/12 text-[#7CCEFF]">
          <MessageCircle className="h-5 w-5" />
        </div>
        <p className="mt-5 text-lg font-semibold text-white">Feedback com contexto</p>
        <p className="mt-3 text-sm leading-7 text-white/60">
          Cliente e time comentam em cima da mesma entrega, com menos ruído e menos retrabalho.
        </p>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/14 text-indigo-200">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <p className="mt-5 text-lg font-semibold text-white">Mais profissionalismo</p>
        <p className="mt-3 text-sm leading-7 text-white/60">
          Envie um link limpo, seguro e facil de aprovar em vez de sustentar um fluxo paralelo.
        </p>
      </div>
    </div>
  </div>
);

const ImageModulePreview = ({ module }: { module: LandingModule }) => (
  <div className="relative flex h-full items-center justify-center">
    <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_center,rgba(56,182,255,0.16),transparent_62%)] blur-2xl" />
    <img
      src={module.image}
      alt={module.title}
      className="relative z-10 max-h-[460px] w-full object-contain drop-shadow-[0_28px_60px_rgba(2,8,23,0.45)] md:max-h-[560px]"
    />
  </div>
);

const ModulePreview = ({ module }: { module: LandingModule }) => {
  return module.image ? (
    <div className="xl:pl-4">
      <ImageModulePreview module={module} />
    </div>
  ) : null;
};

export const LandingPage = () => {
  const [activeModuleId, setActiveModuleId] = React.useState(modules[0].id);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeModule =
    modules.find((module) => module.id === activeModuleId) ?? modules[0];

  const ActiveIcon = activeModule.icon;

  const handleCheckoutClick = (plan: (typeof pricingPlans)[number]) => {
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
    <div className="min-h-screen overflow-x-hidden bg-[#030711] text-white selection:bg-[#38B6FF] selection:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(56,182,255,0.18),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(99,102,241,0.14),transparent_26%),linear-gradient(180deg,#030711_0%,#050916_44%,#040814_100%)]" />
      <div className="pointer-events-none fixed left-[-8rem] top-24 h-72 w-72 rounded-full bg-[#38B6FF]/12 blur-3xl" />
      <div className="pointer-events-none fixed right-[-10rem] top-32 h-96 w-96 rounded-full bg-indigo-500/12 blur-3xl" />

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
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
          <Link to="/" className="flex shrink-0 items-center">
            <img
              src="/logo-full-white.png"
              alt="PostHub"
              className="h-10 w-auto object-contain md:h-11"
            />
          </Link>

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
            <Link to="/login">
              <Button
                variant="ghost"
                className="rounded-full px-5 text-sm text-white/70 hover:bg-white/6 hover:text-white"
              >
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="rounded-full px-6 text-sm font-semibold shadow-[0_18px_34px_rgba(56,182,255,0.28)]">
                Testar gratis
              </Button>
            </Link>
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

                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="secondary"
                    className="w-full rounded-2xl border-white/10 bg-white/5 text-sm text-white hover:bg-white/10"
                  >
                    Login
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="mt-2 w-full rounded-2xl text-sm font-semibold">
                    Testar gratis
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main className="relative z-10">
        <section className="relative overflow-hidden px-6 pb-20 pt-32 md:px-12 md:pb-24 md:pt-44">
          <div className="mx-auto max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[#38B6FF]/20 bg-[#38B6FF]/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8DD7FF]">
                <Sparkles className="h-3.5 w-3.5" />
                Organizacao, estrategia e execucao no mesmo sistema
              </div>

              <h1 className="mx-auto mt-8 max-w-[12ch] text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl lg:text-[5.2rem]">
                Pare de operar no improviso.
                <span className="mt-2 block bg-gradient-to-r from-[#8DDBFF] via-[#4ABEFF] to-[#7C8CFF] bg-clip-text text-transparent">
                  Faca o conteudo avancar com clareza.
                </span>
              </h1>

              <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-white/64 md:text-xl">
                O PostHub centraliza ideias, roteiros, planejamento, fluxo de producao,
                aprovacao e performance em um unico lugar. Feito para quem precisa publicar com
                consistencia sem depender de ferramentas soltas.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {workflowPills.map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/68"
                  >
                    {pill}
                  </span>
                ))}
              </div>

              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="flex w-full items-center justify-center gap-2 rounded-full px-8 shadow-[0_20px_40px_rgba(56,182,255,0.3)] sm:w-auto"
                  >
                    Comecar teste gratis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <a href="#recursos" className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex w-full items-center justify-center rounded-full border-white/10 bg-white/6 px-8 text-white hover:bg-white/10 sm:w-auto"
                  >
                    Ver o produto
                  </Button>
                </a>
              </div>

              <p className="mt-5 text-sm text-white/42">
                Teste gratis por 7 dias. Depois, continue no plano completo por R$ 147,90/mes.
              </p>
            </motion.div>
          </div>

          <motion.iframe
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            src={HERO_VIMEO_EMBED_URL}
            title="Apresentacao da PostHub"
            className="relative left-1/2 mt-14 block aspect-video w-[calc(100vw-1rem)] max-w-none -translate-x-1/2 rounded-[24px] border-0 bg-black sm:w-[calc(100vw-1.5rem)] md:w-[calc(100vw-3rem)] lg:w-[calc(100vw-4rem)]"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
            allowFullScreen
          />

          <div className="mx-auto mt-6 max-w-7xl">
            <div className="grid gap-3 border-y border-white/10 py-5 md:grid-cols-3">
              {heroMetrics.map((metric) => (
                <div key={metric.value} className="px-1 text-center md:px-5 md:text-left">
                  <p className="text-lg font-semibold text-white">{metric.value}</p>
                  <p className="mt-1 text-sm leading-6 text-white/48">{metric.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {heroSignals.map((signal) => (
                <div
                  key={signal.title}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-[#8DD7FF]">
                    <signal.icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold text-white">{signal.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-white/62">{signal.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="recursos" className="relative border-t border-white/8 bg-[#050A16]/90 px-6 py-24 md:px-12 md:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#38B6FF]/18 bg-[#38B6FF]/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8DD7FF]">
                <Sparkles className="h-3.5 w-3.5" />
                O sistema operacional do seu conteudo
              </div>
              <h2 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-white md:text-5xl">
                Tudo o que sua operacao precisa para sair do improviso.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/62">
                Os modulos da PostHub cobrem o ciclo completo do conteudo e compartilham o mesmo
                contexto. Voce para de alternar entre ferramentas e passa a enxergar o fluxo com
                clareza.
              </p>
            </div>

            <div className="hide-scrollbar mt-12 flex justify-start gap-2 overflow-x-auto pb-4 lg:justify-center">
              {modules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setActiveModuleId(module.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-5 py-3 text-sm font-medium transition-all duration-300 ${
                    activeModule.id === module.id
                      ? 'border-[#38B6FF]/30 bg-[#38B6FF]/12 text-[#8DD7FF] shadow-[0_12px_28px_rgba(56,182,255,0.14)]'
                      : 'border-white/8 bg-white/[0.03] text-white/60 hover:border-white/14 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <module.icon className="h-4 w-4" />
                  {module.title}
                </button>
              ))}
            </div>

            <div className="mt-8 overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,16,32,0.98),rgba(4,8,18,0.96))] p-5 shadow-[0_30px_100px_rgba(2,8,23,0.45)] md:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.28 }}
                  className="grid items-start gap-8 xl:grid-cols-[0.88fr_1.12fr]"
                >
                  <div className="flex h-full flex-col">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/55">
                      <ActiveIcon className="h-3.5 w-3.5 text-[#8DD7FF]" />
                      {activeModule.eyebrow}
                    </div>

                    <h3 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                      {activeModule.title}
                    </h3>

                    <p className="mt-4 text-lg leading-8 text-white/64">
                      {activeModule.description}
                    </p>

                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      {activeModule.outcomes.map((outcome) => (
                        <div
                          key={outcome}
                          className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
                        >
                          <p className="text-sm leading-7 text-white/76">{outcome}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 space-y-4">
                      {activeModule.topics.map((topic) => (
                        <div key={topic} className="flex items-start gap-3">
                          <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#38B6FF]/14">
                            <Check className="h-3 w-3 text-[#8DD7FF]" />
                          </div>
                          <span className="text-sm leading-7 text-white/76 md:text-base">{topic}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                      <Link to="/signup">
                        <Button className="w-full rounded-full px-7 text-sm font-semibold sm:w-auto">
                          Testar o fluxo completo
                        </Button>
                      </Link>
                      <a href="#preco" className="w-full sm:w-auto">
                        <Button
                          variant="secondary"
                          className="w-full rounded-full border-white/10 bg-white/5 px-7 text-sm text-white hover:bg-white/10 sm:w-auto"
                        >
                          Ver planos
                        </Button>
                      </a>
                    </div>
                  </div>

                  <div>
                    <ModulePreview module={activeModule} />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="relative border-t border-white/8 bg-[#040814] px-6 py-24 md:px-12 md:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#38B6FF]/18 bg-[#38B6FF]/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8DD7FF]">
                  <Workflow className="h-3.5 w-3.5" />
                  O metodo PostHub
                </div>
                <h2 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-white md:text-5xl">
                  Uma sequencia clara para reduzir ansiedade e mover o conteudo adiante.
                </h2>
              </div>

              <p className="max-w-2xl text-lg leading-8 text-white/60">
                Em vez de apagar incendios, sua operacao passa a seguir um fluxo previsivel:
                capturar, planejar, produzir, aprovar e usar os dados para melhorar a proxima rodada.
              </p>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-4">
              {howItWorksSteps.map((step) => (
                <div
                  key={step.num}
                  className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,16,32,0.92),rgba(4,8,18,0.96))] p-7 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-[#38B6FF]/50 to-transparent" />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-5xl font-semibold tracking-[-0.04em] text-white/10 transition-colors group-hover:text-[#38B6FF]/30">
                      {step.num}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/48">
                      {step.tag}
                    </span>
                  </div>

                  <h3 className="mt-8 text-2xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/60 md:text-base">{step.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.04] px-6 py-5 backdrop-blur-sm md:flex md:items-center md:justify-between">
              <p className="max-w-2xl text-sm leading-7 text-white/66 md:text-base">
                O resultado e um fluxo que fica mais facil de operar, revisar e escalar ao longo das semanas.
              </p>
              <Link to="/signup" className="mt-4 inline-flex md:mt-0">
                <Button className="rounded-full px-6 text-sm font-semibold">
                  Criar workspace gratis
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section
          id="preco"
          className="relative border-t border-white/8 bg-[#050A16]/90 px-6 py-24 md:px-12 md:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#38B6FF]/18 bg-[#38B6FF]/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8DD7FF]">
                <Sparkles className="h-3.5 w-3.5" />
                Planos PostHub
              </div>
              <h2 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-white md:text-5xl">
                Escolha o plano para profissionalizar sua operacao de conteudo.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/60">
                Comece com o essencial, avance com mais clareza e desbloqueie no PRO o fluxo
                completo para aprovar, criar com IA e trabalhar em equipe.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex h-full flex-col rounded-[30px] border p-8 shadow-[0_24px_70px_rgba(2,8,23,0.35)] ${
                    plan.highlighted
                      ? 'border-[#38B6FF]/40 bg-[linear-gradient(180deg,rgba(8,16,32,1),rgba(4,9,19,1))] ring-1 ring-[#38B6FF]/30'
                      : 'border-white/10 bg-[linear-gradient(180deg,rgba(9,16,32,0.94),rgba(4,8,18,0.96))]'
                  }`}
                >
                  {plan.highlighted ? (
                    <div className="absolute right-6 top-6 rounded-full bg-[#38B6FF] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white">
                      Mais usado
                    </div>
                  ) : null}

                  <div className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8DD7FF]">
                      {plan.name}
                    </p>
                    <div className="mt-4 flex items-end gap-2">
                      <span className="text-5xl font-semibold tracking-[-0.04em] text-white">
                        {plan.price}
                      </span>
                      <span className="pb-2 text-sm text-white/45">/ mes</span>
                    </div>
                    <p className="mt-5 min-h-[88px] text-sm leading-7 text-white/62">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-8 flex-1 space-y-4">
                    {plan.benefits.map((benefit) => (
                      <div key={benefit} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#38B6FF]/14">
                          <Check className="h-3 w-3 text-[#8DD7FF]" />
                        </div>
                        <span className="text-sm leading-7 text-white/78">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  <a
                    href={STRIPE_PAYMENT_LINKS[plan.id]}
                    rel="noreferrer"
                    onClick={() => handleCheckoutClick(plan)}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold transition-all ${
                      plan.highlighted
                        ? 'bg-[#38B6FF] text-white shadow-[0_18px_35px_rgba(56,182,255,0.24)] hover:bg-[#2da1e6]'
                        : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    Comecar agora
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-6 text-white/42">
              O modulo de performance esta em preparacao e sera liberado no PRO quando estiver pronto para uso.
            </p>
          </div>
        </section>

        <section className="relative border-t border-white/8 bg-[#040814] px-6 py-20 md:px-12 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#07111f_0%,#09172d_58%,#0d1330_100%)] px-6 py-10 shadow-[0_30px_100px_rgba(2,8,23,0.45)] md:px-10 md:py-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,182,255,0.24),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.18),transparent_28%)]" />

              <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <img
                    src="/logo-full-white.png"
                    alt="PostHub"
                    className="h-11 w-auto object-contain"
                  />

                  <h2 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-white md:text-5xl">
                    Se conteudo faz parte da sua operacao, ele precisa de processo.
                  </h2>
                  <p className="mt-5 text-lg leading-8 text-white/66">
                    Junte-se a quem quer trocar retrabalho por clareza. Centralize o bastidor,
                    publique com mais consistencia e mantenha o controle de cada etapa.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {workflowPills.slice(0, 5).map((pill) => (
                      <span
                        key={pill}
                        className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-medium text-white/72"
                      >
                        {pill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link to="/signup">
                    <Button className="w-full rounded-full px-7 text-sm font-semibold shadow-[0_18px_35px_rgba(56,182,255,0.24)] sm:w-auto">
                      Comecar teste gratis
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button
                      variant="secondary"
                      className="w-full rounded-full border-white/12 bg-white/8 px-7 text-sm text-white hover:bg-white/14 sm:w-auto"
                    >
                      Entrar na PostHub
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/40 md:flex-row">
              <p>© {new Date().getFullYear()} PostHub. Todos os direitos reservados.</p>
              <div className="flex gap-6">
                <a href="#" className="transition-colors hover:text-white">
                  Termos de Uso
                </a>
                <a href="#" className="transition-colors hover:text-white">
                  Privacidade
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
