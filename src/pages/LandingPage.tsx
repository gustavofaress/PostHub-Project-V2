import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Calendar,
  Lightbulb,
  BarChart3,
  KanbanSquare,
  ShieldCheck,
  BrainCircuit,
} from 'lucide-react';
import { Button } from '../shared/components/Button';

const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/SEU_LINK_AQUI';

const modules = [
  {
    id: 'ideas',
    label: 'Banco de Ideias',
    title: 'Banco de Ideias',
    description:
      'Centralize referências, temas e oportunidades para nunca mais travar na hora de planejar o próximo conteúdo.',
    image: '/banco-de-ideias.png',
    icon: Lightbulb,
    topics: [
      'Organize referências e temas em um só lugar',
      'Salve ideias para diferentes formatos de conteúdo',
      'Tenha mais clareza no planejamento editorial',
      'Reduza o bloqueio criativo na operação',
    ],
  },
  {
    id: 'scripts',
    label: 'Gerador de Roteiros',
    title: 'Gerador de Roteiros',
    description:
      'Transforme ideias em roteiros mais estratégicos com estrutura pensada para retenção, clareza e conversão.',
    image: '/gerador-de-roteiros.png',
    icon: BrainCircuit,
    topics: [
      'Estruture vídeos com mais rapidez',
      'Use roteiros com lógica mais estratégica',
      'Ganhe consistência na criação de conteúdo',
      'Acelere a produção sem depender do improviso',
    ],
  },
  {
    id: 'calendar',
    label: 'Calendário Editorial',
    title: 'Calendário Editorial',
    description:
      'Visualize o mês inteiro, organize entregas e tenha clareza do que precisa ser produzido, revisado e publicado.',
    image: '/calendario-editorial.png',
    icon: Calendar,
    topics: [
      'Visualize sua operação com clareza',
      'Planeje publicações e entregas do mês',
      'Organize o fluxo de produção com previsibilidade',
      'Evite atrasos e retrabalho na rotina',
    ],
  },
  {
    id: 'kanban',
    label: 'Kanban de Produção',
    title: 'Kanban de Produção',
    description:
      'Acompanhe cada conteúdo do planejamento até a publicação com um fluxo operacional simples e visual.',
    image: '/kanban.png',
    icon: KanbanSquare,
    topics: [
      'Acompanhe cada etapa da produção',
      'Tenha visão rápida do que está pendente',
      'Organize tarefas de forma visual',
      'Melhore a operação entre equipe e cliente',
    ],
  },
  {
    id: 'approval',
    label: 'Aprovação de Conteúdo',
    title: 'Aprovação de Conteúdo',
    description:
      'Envie materiais para aprovação, receba feedback e mantenha o processo mais profissional com clientes e equipe.',
    image: '/aprovacao.png',
    icon: ShieldCheck,
    topics: [
      'Compartilhe materiais para validação',
      'Receba feedbacks com mais organização',
      'Profissionalize a comunicação com clientes',
      'Reduza ruídos na etapa de aprovação',
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    title: 'Performance',
    description:
      'Conecte estratégia e resultado analisando métricas importantes para tomar decisões melhores sobre conteúdo.',
    image: '/performance.png',
    icon: BarChart3,
    topics: [
      'Acompanhe métricas relevantes da operação',
      'Tome decisões com mais base em dados',
      'Conecte produção com resultado',
      'Tenha mais visão estratégica do conteúdo',
    ],
  },
];

export const LandingPage = () => {
  const [activeModuleId, setActiveModuleId] = React.useState(modules[0].id);

  const activeModule =
    modules.find((module) => module.id === activeModuleId) ?? modules[0];

  const ActiveIcon = activeModule.icon;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(55,93,255,0.16),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(0,229,255,0.10),transparent_25%),linear-gradient(180deg,#050816_0%,#070b1d_40%,#050816_100%)]" />

      <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#050816]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/logo-full-white.png"
              alt="PostHub"
              className="h-10 w-auto object-contain"
            />
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#recursos" className="text-sm text-white/70 transition hover:text-white">
              Recursos
            </a>
            <a href="#como-funciona" className="text-sm text-white/70 transition hover:text-white">
              Como funciona
            </a>
            <a href="#preco" className="text-sm text-white/70 transition hover:text-white">
              Preço
            </a>
            <Link to="/login" className="text-sm font-medium text-white/80 transition hover:text-white">
              Login
            </Link>
            <a href={STRIPE_CHECKOUT_URL} target="_blank" rel="noreferrer">
              <Button size="sm" className="rounded-xl px-5">
                Assinar agora
              </Button>
            </a>
          </div>
        </div>
      </nav>

      <main>
        <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 pt-14 lg:grid-cols-[1fr_0.98fr] lg:items-start lg:px-8 lg:pt-16 xl:gap-10">
          <div className="lg:pt-6">
            <HeroBadge>
              <Sparkles className="h-3.5 w-3.5" />
              Organização, estratégia e execução no mesmo sistema
            </HeroBadge>

            <h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-[0.98] tracking-tight text-white sm:text-5xl lg:text-7xl">
              Pare de criar conteúdo no improviso.
              <span className="bg-gradient-to-r from-white via-cyan-200 to-brand bg-clip-text text-transparent">
                {' '}Transforme sua operação em um processo.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              Planeje ideias, gere roteiros, organize o calendário, acompanhe a produção
              e visualize a performance em um só lugar. A PostHub foi criada para quem
              quer operar conteúdo com mais clareza, consistência e profissionalismo.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a href={STRIPE_CHECKOUT_URL} target="_blank" rel="noreferrer">
                <Button size="lg" className="w-full rounded-2xl px-8 py-6 text-base sm:w-auto">
                  Começar agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>

              <Link to="/login">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-8 py-6 text-base text-white hover:bg-white/10 sm:w-auto"
                >
                  Entrar na plataforma
                </Button>
              </Link>
            </div>

            <p className="mt-5 text-sm text-white/45">
              Assinatura mensal de R$ 147,90
            </p>
          </div>

          <div className="relative lg:-mt-12 xl:-mt-16">
            <div className="overflow-hidden rounded-[32px] border border-white/10 bg-transparent shadow-[0_20px_120px_rgba(0,0,0,0.22)]">
              <img
                src="/hero.png"
                alt="Visão principal da plataforma PostHub"
                className="block w-full object-contain object-top"
              />
            </div>
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="max-w-3xl">
            <HeroBadge>Principais ferramentas da PostHub</HeroBadge>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Uma plataforma para organizar toda a sua operação de conteúdo.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/65">
              Explore os principais módulos da PostHub e veja como cada parte da
              plataforma contribui para uma operação mais organizada, estratégica e previsível.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            {modules.map((module) => {
              const isActive = module.id === activeModuleId;

              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setActiveModuleId(module.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'border-brand bg-brand/15 text-white shadow-[0_0_0_1px_rgba(56,182,255,0.2)]'
                      : 'border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {module.label}
                </button>
              );
            })}
          </div>

          <div className="mt-10 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04]">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-8">
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0f152b] shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
                  <img
                    src={activeModule.image}
                    alt={`Tela do módulo ${activeModule.title}`}
                    className="block h-full min-h-[320px] w-full object-cover object-top"
                  />
                </div>
              </div>

              <div className="p-8 lg:p-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                  <ActiveIcon className="h-6 w-6" />
                </div>

                <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
                  Módulo ativo
                </div>

                <h3 className="mt-5 text-3xl font-bold text-white">{activeModule.title}</h3>

                <p className="mt-4 max-w-xl text-base leading-7 text-white/65">
                  {activeModule.description}
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {activeModule.topics.map((topic) => (
                    <div
                      key={topic}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-sm text-white/75"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 lg:p-12">
            <div className="max-w-3xl">
              <HeroBadge>Como funciona</HeroBadge>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Uma operação simples para quem quer crescer com conteúdo.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/65">
                A lógica da PostHub é transformar a criação de conteúdo em um processo claro:
                pensar, estruturar, produzir, acompanhar e melhorar.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-4">
              {[
                ['01', 'Capture ideias', 'Registre oportunidades de conteúdo e organize referências.'],
                ['02', 'Monte a estratégia', 'Transforme ideias em roteiros, calendário e fluxo de produção.'],
                ['03', 'Execute com clareza', 'Acompanhe as tarefas no Kanban e reduza o retrabalho.'],
                ['04', 'Ajuste com dados', 'Olhe para performance e refine a tomada de decisão.'],
              ].map(([step, title, desc]) => (
                <div key={step} className="rounded-[24px] border border-white/10 bg-black/10 p-6">
                  <div className="text-sm font-bold text-brand">{step}</div>
                  <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/60">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="preco" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <HeroBadge>Plano da PostHub</HeroBadge>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Uma ferramenta para estruturar a sua operação de conteúdo.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/65">
              Pare de depender de vários apps desconectados. Tenha planejamento, produção,
              organização e acompanhamento em um sistema só.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-3xl">
            <div className="relative overflow-hidden rounded-[32px] border border-brand/30 bg-[linear-gradient(180deg,rgba(59,130,246,0.12),rgba(255,255,255,0.04))] p-[1px] shadow-[0_20px_100px_rgba(59,130,246,0.18)]">
              <div className="rounded-[31px] bg-[#0a1023] p-8 lg:p-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex items-center rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                      PLANO PRINCIPAL
                    </div>
                    <h3 className="mt-5 text-3xl font-bold text-white">PostHub</h3>
                    <p className="mt-3 max-w-xl text-base leading-7 text-white/65">
                      Ideal para social medias, criadores, freelancers e operações que querem
                      organizar a gestão de redes sociais de forma profissional.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 lg:min-w-[280px]">
                    <div className="text-sm text-white/55">Assinatura mensal</div>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-5xl font-extrabold tracking-tight text-white">R$ 147,90</span>
                      <span className="pb-1 text-sm text-white/50">/mês</span>
                    </div>
                    <p className="mt-3 text-sm text-white/50">
                      Acesso à plataforma para organizar e operar seu conteúdo em um só lugar.
                    </p>

                    <a
                      href={STRIPE_CHECKOUT_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 block"
                    >
                      <Button size="lg" className="w-full rounded-2xl">
                        Assinar com Stripe
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </a>

                    <p className="mt-3 text-center text-xs text-white/45">
                      Substitua o link acima pelo checkout do Stripe.
                    </p>
                  </div>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  {[
                    'Banco de ideias para organizar temas e referências',
                    'Gerador de roteiros para estruturar vídeos e conteúdos',
                    'Calendário editorial para planejar publicações',
                    'Kanban para acompanhar o fluxo de produção',
                    'Sistema de aprovação para organizar feedbacks',
                    'Área de performance para acompanhar os resultados',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-sm text-white/75"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] px-8 py-12 text-center">
            <div className="mx-auto mb-5 flex justify-center">
              <img
                src="/logo-full-white.png"
                alt="PostHub"
                className="h-10 w-auto object-contain"
              />
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Se conteúdo é parte da sua operação, ele precisa de processo.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/65">
              A PostHub foi pensada para transformar redes sociais em algo mais organizado,
              previsível e estratégico.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <a href={STRIPE_CHECKOUT_URL} target="_blank" rel="noreferrer">
                <Button size="lg" className="w-full rounded-2xl px-8 sm:w-auto">
                  Assinar agora
                </Button>
              </a>
              <Link to="/login">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-8 text-white hover:bg-white/10 sm:w-auto"
                >
                  Entrar na PostHub
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const HeroBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand">
    {children}
  </div>
);
