import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Calendar,
  Lightbulb,
  BarChart3,
  LayoutDashboard,
  KanbanSquare,
  ShieldCheck,
  BrainCircuit,
  Star,
} from 'lucide-react';
import { Button } from '../shared/components/Button';
import { Card } from '../shared/components/Card';

import logoFull from '../assets/branding/logo-full-white.png';
import logoIcon from '../assets/branding/logo-icon.png';

const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/SEU_LINK_AQUI';

const features = [
  {
    title: 'Banco de Ideias',
    description:
      'Centralize referências, temas e oportunidades para nunca mais travar na hora de planejar o próximo conteúdo.',
    icon: Lightbulb,
  },
  {
    title: 'Gerador de Roteiros',
    description:
      'Transforme ideias em roteiros mais estratégicos com estrutura pensada para retenção, clareza e conversão.',
    icon: BrainCircuit,
  },
  {
    title: 'Calendário Editorial',
    description:
      'Visualize o mês inteiro, organize entregas e tenha clareza do que precisa ser produzido, revisado e publicado.',
    icon: Calendar,
  },
  {
    title: 'Kanban de Produção',
    description:
      'Acompanhe cada conteúdo do planejamento até a publicação com um fluxo operacional simples e visual.',
    icon: KanbanSquare,
  },
  {
    title: 'Aprovação de Conteúdo',
    description:
      'Envie materiais para aprovação, receba feedback e mantenha o processo mais profissional com clientes e equipe.',
    icon: ShieldCheck,
  },
  {
    title: 'Performance',
    description:
      'Conecte estratégia e resultado analisando métricas importantes para tomar decisões melhores sobre conteúdo.',
    icon: BarChart3,
  },
];

const benefits = [
  'Planejamento, produção e análise no mesmo lugar',
  'Mais clareza para organizar as redes sociais',
  'Menos retrabalho e mais consistência no conteúdo',
  'Fluxo profissional para equipes, freelancers e agências',
  'Estrutura para transformar conteúdo em processo',
];

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(55,93,255,0.16),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(0,229,255,0.10),transparent_25%),linear-gradient(180deg,#050816_0%,#070b1d_40%,#050816_100%)]" />

      <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#050816]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src={logoFull}
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
        <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pt-20">
          <div>
            <HeroBadge>
              <Sparkles className="h-3.5 w-3.5" />
              Organização, estratégia e execução no mesmo sistema
            </HeroBadge>

            <h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-7xl">
              A plataforma para
              <span className="bg-gradient-to-r from-white via-cyan-200 to-brand bg-clip-text text-transparent">
                {' '}gestão de redes sociais
              </span>
              {' '}e estratégia de conteúdo de forma profissional.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              A PostHub foi criada para quem quer parar de operar conteúdo no improviso.
              Planeje ideias, organize a produção, gere roteiros, acompanhe o calendário e visualize
              a performance em um só lugar.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a href={STRIPE_CHECKOUT_URL} target="_blank" rel="noreferrer">
                <Button size="lg" className="w-full rounded-2xl px-8 py-6 text-base sm:w-auto">
                  Assinar por R$ 147,90
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

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-white/60">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <Star className="h-4 w-4 text-yellow-400" />
                Feito para social medias, freelancers e agências
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Fluxo mais organizado do início ao fim
              </div>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              {benefits.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/75"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-brand/20 via-cyan-400/10 to-transparent blur-3xl" />
            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_20px_120px_rgba(0,0,0,0.45)]">
              <div className="rounded-[28px] border border-white/10 bg-[#0b1023] p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                  <div className="h-3 w-3 rounded-full bg-green-400/80" />
                </div>

                <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/90">
                      <LayoutDashboard className="h-4 w-4 text-brand" />
                      Workspace
                    </div>
                    <div className="space-y-2">
                      {['Dashboard', 'Ideias', 'Roteiros', 'Calendário', 'Kanban', 'Performance'].map((item) => (
                        <div
                          key={item}
                          className={`rounded-xl px-3 py-2 text-sm ${
                            item === 'Calendário'
                              ? 'bg-brand/20 text-white'
                              : 'text-white/55'
                          }`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-dashed border-white/15 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white/90">PlaceHolder do Mockup Principal</p>
                        <p className="text-sm text-white/50">
                          Substitua esta área por um mockup do sistema
                        </p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        Hero Preview
                      </div>
                    </div>

                    <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-brand/30 bg-[linear-gradient(180deg,rgba(59,130,246,0.08),rgba(255,255,255,0.02))] text-center">
                      <div>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                          <img
                            src={logoIcon}
                            alt="PostHub Icon"
                            className="h-8 w-8 object-contain"
                          />
                        </div>
                        <p className="text-lg font-semibold text-white/90">Mockup do sistema aqui</p>
                        <p className="mt-2 max-w-sm text-sm text-white/50">
                          Ideal para colocar uma imagem da PostHub em desktop, seguindo a estética premium da landing page.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 md:grid-cols-4">
            {[
              ['Conteúdo com mais processo', 'Planeje, produza e acompanhe tudo com clareza.'],
              ['Mais consistência', 'Visualize a rotina de publicação e não dependa da memória.'],
              ['Mais controle', 'Organize o fluxo com calendário, kanban e aprovações.'],
              ['Mais visão estratégica', 'Conecte produção com análise e tomada de decisão.'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-white/55">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="max-w-3xl">
            <HeroBadge>Principais ferramentas da PostHub</HeroBadge>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Tudo o que você precisa para operar conteúdo com mais clareza.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/65">
              A PostHub junta planejamento, organização, produção e acompanhamento em um único sistema.
              Em vez de espalhar o processo em várias ferramentas, você centraliza a operação em um só lugar.
            </p>
          </div>

          <div className="mt-14 space-y-6">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-0 shadow-none"
              >
                <div className="grid gap-0 lg:grid-cols-[1fr_1.05fr]">
                  <div className="p-8 lg:p-10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                      <feature.icon className="h-6 w-6" />
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
                        Recurso {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <h3 className="mt-5 text-2xl font-bold text-white">{feature.title}</h3>
                    <p className="mt-4 max-w-xl text-base leading-7 text-white/65">
                      {feature.description}
                    </p>

                    <ul className="mt-6 space-y-3">
                      {[
                        'Fluxo mais organizado',
                        'Mais velocidade para executar',
                        'Mais clareza para a equipe ou operação',
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-3 text-sm text-white/70">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-white/10 p-6 lg:border-l lg:border-t-0 lg:p-8">
                    <div className="flex h-full min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-brand/30 bg-[linear-gradient(180deg,rgba(59,130,246,0.08),rgba(255,255,255,0.02))] text-center">
                      <div>
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                          <feature.icon className="h-7 w-7" />
                        </div>
                        <p className="text-lg font-semibold text-white/90">
                          Placeholder da tela de {feature.title}
                        </p>
                        <p className="mt-2 max-w-sm text-sm text-white/50">
                          Substitua esta área pela captura da ferramenta dentro da PostHub.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
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
              Pare de depender de vários apps desconectados. Tenha planejamento, produção, organização e acompanhamento em um sistema só.
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
                      Ideal para social medias, criadores, freelancers e operações que querem organizar a gestão de redes sociais de forma profissional.
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
                src={logoFull}
                alt="PostHub"
                className="h-10 w-auto object-contain"
              />
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Se conteúdo é parte da sua operação, ele precisa de processo.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/65">
              A PostHub foi pensada para transformar redes sociais em algo mais organizado, previsível e estratégico.
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
