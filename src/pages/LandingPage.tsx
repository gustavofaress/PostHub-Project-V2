import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Menu,
  X,
  Lightbulb,
  FileText,
  Calendar,
  LayoutDashboard,
  CheckCircle,
  BarChart3,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../shared/components/Button';

const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/SEU_LINK_AQUI';

const modules = [
  {
    id: 'ideias',
    title: 'Banco de Ideias',
    description:
      'Nunca mais perca uma boa ideia. Capture, categorize e desenvolva seus insights em um repositório centralizado e organizado.',
    icon: Lightbulb,
    image: '/banco-de-ideias.png',
    topics: [
      'Captura rápida via atalhos',
      'Categorização por tags e temas',
      'Status de maturação da ideia',
      'Integração direta com roteiros',
    ],
  },
  {
    id: 'roteiros',
    title: 'Gerador de Roteiros',
    description:
      'Estruture seus vídeos e posts com templates validados. Do gancho à chamada para ação, crie roteiros que retêm a atenção.',
    icon: FileText,
    image: '/gerador-de-roteiros.png',
    topics: [
      'Templates para Reels, TikTok e YouTube',
      'Estimativa de tempo de leitura e fala',
      'Área de referências e links',
      'Histórico de versões',
    ],
  },
  {
    id: 'calendario',
    title: 'Calendário Editorial',
    description:
      'Tenha visão total da sua estratégia. Planeje semanas ou meses de conteúdo com uma interface visual e intuitiva.',
    icon: Calendar,
    image: '/calendario-editorial.png',
    topics: [
      'Visão mensal, semanal e diária',
      'Filtros por rede social e formato',
      'Arraste e solte para reagendar',
      'Identificação de lacunas de postagem',
    ],
  },
  {
    id: 'kanban',
    title: 'Kanban de Produção',
    description:
      'Acompanhe cada etapa da criação. Saiba exatamente o que está sendo escrito, gravado, editado ou aguardando aprovação.',
    icon: LayoutDashboard,
    image: '/kanban.png',
    topics: [
      'Colunas personalizáveis',
      'Atribuição de responsáveis',
      'Prazos e alertas de atraso',
      'Anexos de arquivos pesados',
    ],
  },
  {
    id: 'aprovacao',
    title: 'Aprovação de Conteúdo',
    description:
      'Elimine o vai-e-vem no WhatsApp. Compartilhe links de aprovação com clientes ou gestores e receba feedback pontual.',
    icon: CheckCircle,
    image: '/aprovacao.png',
    topics: [
      'Links externos seguros',
      'Comentários diretos na peça',
      'Histórico de alterações',
      'Aprovação com um clique',
    ],
  },
  {
    id: 'performance',
    title: 'Performance',
    description:
      'Entenda o que funciona. Analise métricas essenciais para otimizar sua estratégia e focar no que traz resultado real.',
    icon: BarChart3,
    image: '/performance.png',
    topics: [
      'Dashboards consolidados',
      'Métricas de engajamento e alcance',
      'Identificação de melhores formatos',
      'Relatórios automatizados',
    ],
  },
];

const pricingFeatures = [
  'Acesso completo a todos os módulos',
  'Banco de Ideias ilimitado',
  'Gerador de Roteiros com templates',
  'Calendário Editorial interativo',
  'Kanban de produção personalizável',
  'Links de aprovação externos',
  'Dashboards de performance',
  'Suporte prioritário via chat',
];

const howItWorksSteps = [
  {
    num: '01',
    title: 'Capture ideias',
    desc: 'Registre insights no momento em que surgem, antes que se percam na rotina.',
  },
  {
    num: '02',
    title: 'Monte a estratégia',
    desc: 'Transforme ideias soltas em roteiros estruturados e posicione-os no calendário.',
  },
  {
    num: '03',
    title: 'Execute com clareza',
    desc: 'Acompanhe o status de cada peça no kanban. Grave, edite e aprove sem atrito.',
  },
  {
    num: '04',
    title: 'Ajuste com dados',
    desc: 'Analise a performance do que foi publicado e retroalimente seu banco de ideias.',
  },
];

export const LandingPage = () => {
  const [activeModuleId, setActiveModuleId] = React.useState(modules[0].id);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeModule =
    modules.find((module) => module.id === activeModuleId) ?? modules[0];

  const ActiveIcon = activeModule.icon;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050816] text-white selection:bg-[#38B6FF] selection:text-white">
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'border-b border-white/10 bg-[#050816]/80 py-4 backdrop-blur-md'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-12">
          <div className="flex items-center">
            <img
              src="/logo-full-white.png"
              alt="PostHub"
              className="h-10 w-auto object-contain"
            />
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#recursos"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Recursos
            </a>
            <a
              href="#como-funciona"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Como funciona
            </a>
            <a
              href="#preco"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Preço
            </a>
          </nav>

          <div className="hidden items-center gap-6 md:flex">
            <Link
              to="/login"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Login
            </Link>
            <a href={STRIPE_CHECKOUT_URL} target="_blank" rel="noreferrer">
              <Button className="rounded-full px-5 py-2.5 text-sm font-semibold">
                Assinar agora
              </Button>
            </a>
          </div>

          <button
            className="text-white/70 hover:text-white md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 border-b border-white/10 bg-[#0A1023] p-6 shadow-2xl md:hidden"
            >
              <div className="flex flex-col gap-4">
                <a
                  href="#recursos"
                  className="py-2 text-base font-medium text-white/80 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Recursos
                </a>
                <a
                  href="#como-funciona"
                  className="py-2 text-base font-medium text-white/80 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Como funciona
                </a>
                <a
                  href="#preco"
                  className="py-2 text-base font-medium text-white/80 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Preço
                </a>
                <div className="my-2 h-px bg-white/10" />
                <Link
                  to="/login"
                  className="py-2 text-base font-medium text-white/80 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <a
                  href={STRIPE_CHECKOUT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button className="w-full rounded-xl py-3 text-base font-semibold">
                    Assinar agora
                  </Button>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        <section className="relative overflow-hidden pt-32 pb-20 md:pt-48 md:pb-32">
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#38B6FF]/10 blur-[120px]" />

          <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl"
              >
                <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#38B6FF] animate-pulse" />
                  <span className="text-xs font-medium text-white/80">
                    Organização, estratégia e execução no mesmo sistema
                  </span>
                </div>

                <h1 className="mb-6 text-4xl font-bold leading-[1.1] md:text-5xl lg:text-6xl">
                  Pare de criar conteúdo no improviso.{' '}
                  <span className="bg-gradient-to-r from-[#38B6FF] to-cyan-300 bg-clip-text text-transparent">
                    Transforme sua operação em um processo.
                  </span>
                </h1>

                <p className="mb-10 max-w-xl text-lg leading-relaxed text-white/60 md:text-xl">
                  O PostHub centraliza suas ideias, roteiros, planejamento, fluxo
                  de produção e performance em um único lugar. Feito para quem
                  leva conteúdo a sério.
                </p>

                <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <a href={STRIPE_CHECKOUT_URL} target="_blank" rel="noreferrer">
                    <Button className="flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold shadow-[0_0_30px_rgba(56,182,255,0.25)] hover:shadow-[0_0_40px_rgba(56,182,255,0.4)] sm:w-auto">
                      Começar agora
                      <ArrowRight size={18} />
                    </Button>
                  </a>

                  <Link to="/login">
                    <Button
                      variant="secondary"
                      className="flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 sm:w-auto"
                    >
                      Entrar na plataforma
                    </Button>
                  </Link>
                </div>

                <p className="text-sm text-white/40">
                  Assinatura mensal de R$ 147,90. Cancele quando quiser.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative lg:h-[600px] flex items-center justify-center"
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#38B6FF]/20 to-transparent blur-3xl" />
                <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0A1023]/80 shadow-2xl ring-1 ring-white/5 backdrop-blur-sm">
                  <div className="flex h-8 items-center gap-2 border-b border-white/10 bg-[#050816]/50 px-4">
                    <div className="h-3 w-3 rounded-full bg-white/20" />
                    <div className="h-3 w-3 rounded-full bg-white/20" />
                    <div className="h-3 w-3 rounded-full bg-white/20" />
                  </div>
                  <img
                    src="/hero.png"
                    alt="Interface do PostHub"
                    className="block h-auto w-full object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="recursos" className="relative bg-[#0A1023] py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-12">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="mb-6 text-3xl font-bold md:text-4xl">
                O sistema operacional do seu conteúdo
              </h2>
              <p className="text-lg text-white/60">
                Módulos integrados que cobrem 100% do ciclo de vida do conteúdo.
                Da primeira faísca de ideia até a análise de resultados.
              </p>
            </div>

            <div className="hide-scrollbar mb-8 flex gap-2 overflow-x-auto pb-4 justify-start lg:justify-center">
              {modules.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setActiveModuleId(mod.id)}
                  className={`flex items-center gap-2 rounded-full border px-5 py-3 whitespace-nowrap transition-all duration-300 ${
                    activeModule.id === mod.id
                      ? 'border-[#38B6FF]/30 bg-[#38B6FF]/10 text-[#38B6FF]'
                      : 'border-white/5 bg-[#0F152B] text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <mod.icon size={18} />
                  <span className="text-sm font-medium">{mod.title}</span>
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0F152B] p-6 md:p-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid items-center gap-10 lg:grid-cols-12"
                >
                  <div className="order-2 lg:order-1 lg:col-span-5">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[#38B6FF]/20 bg-[#38B6FF]/10">
                      <ActiveIcon className="text-[#38B6FF]" size={24} />
                    </div>

                    <h3 className="mb-4 text-2xl font-bold md:text-3xl">
                      {activeModule.title}
                    </h3>

                    <p className="mb-8 text-lg leading-relaxed text-white/60">
                      {activeModule.description}
                    </p>

                    <ul className="space-y-4">
                      {activeModule.topics.map((topic, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#38B6FF]/20">
                            <div className="h-2 w-2 rounded-full bg-[#38B6FF]" />
                          </div>
                          <span className="text-white/80">{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="order-1 lg:order-2 lg:col-span-7">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-[#050816] shadow-2xl md:aspect-[16/10]">
                      <img
                        src={activeModule.image}
                        alt={activeModule.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="bg-[#050816] py-24">
          <div className="mx-auto max-w-7xl px-6 md:px-12">
            <div className="mb-16">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                O método PostHub
              </h2>
              <p className="max-w-2xl text-lg text-white/60">
                Um fluxo de trabalho lógico e sequencial que elimina a ansiedade
                da criação de conteúdo.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {howItWorksSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="group rounded-3xl border border-white/5 bg-[#0A1023] p-8 transition-all duration-300 hover:border-white/10 hover:bg-[#0F152B]"
                >
                  <div className="mb-6 text-5xl font-bold text-white/5 transition-colors group-hover:text-[#38B6FF]/20">
                    {step.num}
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{step.title}</h3>
                  <p className="leading-relaxed text-white/60">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="preco" className="relative overflow-hidden bg-[#0A1023] py-24">
          <div className="pointer-events-none absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-[#38B6FF]/5 blur-[100px]" />

          <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#38B6FF]/20 bg-[#38B6FF]/10 px-3 py-1.5">
                  <span className="text-xs font-medium text-[#38B6FF]">
                    Plano da PostHub
                  </span>
                </div>

                <h2 className="mb-6 text-3xl font-bold leading-tight md:text-5xl">
                  Tudo que você precisa por um valor único.
                </h2>

                <p className="mb-8 max-w-md text-lg leading-relaxed text-white/60">
                  Sem planos complexos ou taxas escondidas. Assine e tenha acesso
                  imediato a todo o ecossistema PostHub para estruturar sua
                  operação.
                </p>
              </div>

              <div className="relative rounded-[2rem] border border-white/10 bg-[#050816] p-8 shadow-2xl md:p-12">
                <div className="absolute top-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#38B6FF]/50 to-transparent" />

                <div className="mb-8">
                  <h3 className="mb-2 text-2xl font-bold">PostHub</h3>
                  <p className="text-sm text-white/60">
                    A solução definitiva para criadores e gestores.
                  </p>
                </div>

                <div className="mb-8 flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight">
                    R$ 147,90
                  </span>
                  <span className="text-white/50">/ mês</span>
                </div>

                <a href={STRIPE_CHECKOUT_URL} target="_blank" rel="noreferrer">
                  <Button className="mb-10 w-full rounded-xl py-4 text-base font-bold shadow-[0_0_20px_rgba(56,182,255,0.2)] hover:shadow-[0_0_30px_rgba(56,182,255,0.4)]">
                    Assinar agora
                  </Button>
                </a>

                <div className="space-y-4">
                  <p className="mb-4 text-sm font-medium text-white/80">
                    O que está incluído:
                  </p>
                  {pricingFeatures.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#38B6FF]/10">
                        <Check size={12} className="text-[#38B6FF]" />
                      </div>
                      <span className="text-sm text-white/70">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-white/5 bg-[#050816] py-24">
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-[#38B6FF]/10 blur-[120px]" />

          <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
            <div className="mb-8 mx-auto">
              <img
                src="/logo-full-white.png"
                alt="PostHub"
                className="mx-auto h-12 w-auto object-contain"
              />
            </div>

            <h2 className="mb-6 text-4xl font-bold leading-tight md:text-5xl">
              Se conteúdo é parte da sua operação,{' '}
              <span className="bg-gradient-to-r from-[#38B6FF] to-cyan-300 bg-clip-text text-transparent">
                ele precisa de processo.
              </span>
            </h2>

            <p className="mx-auto mb-10 max-w-2xl text-xl text-white/60">
              Junte-se aos profissionais que pararam de apagar incêndios e
              começaram a construir ativos de forma previsível e organizada.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href={STRIPE_CHECKOUT_URL} target="_blank" rel="noreferrer">
                <Button className="w-full rounded-full px-8 py-4 text-base font-semibold shadow-[0_0_30px_rgba(56,182,255,0.25)] hover:shadow-[0_0_40px_rgba(56,182,255,0.4)] sm:w-auto">
                  Assinar agora
                </Button>
              </a>

              <Link to="/login">
                <Button
                  variant="secondary"
                  className="w-full rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 sm:w-auto"
                >
                  Entrar na PostHub
                </Button>
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-32 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 px-6 pt-8 text-sm text-white/40 md:flex-row">
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
        </section>
      </main>
    </div>
  );
};
