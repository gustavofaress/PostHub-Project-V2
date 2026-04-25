import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  Compass,
  FileCheck2,
  FolderKanban,
  ImageIcon,
  Layers3,
  MessageCircleWarning,
  MousePointerClick,
  PanelTop,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { BrandLogo } from '../assets/branding/BrandLogo';

type SystemCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type PainItem = {
  text: string;
};

type FeatureBlock = {
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  checks: string[];
  reversed?: boolean;
};

const systemCards: SystemCard[] = [
  {
    title: 'Planejamento estratégico',
    description: 'Organize ideias, campanhas e referências antes da produção começar.',
    icon: Compass,
  },
  {
    title: 'Produção centralizada',
    description: 'Acompanhe cada conteúdo com status, responsáveis e próximos passos claros.',
    icon: FolderKanban,
  },
  {
    title: 'Aprovação sem ruído',
    description: 'Troque prints e mensagens soltas por um fluxo profissional de aprovação.',
    icon: FileCheck2,
  },
];

const painItems: PainItem[] = [
  { text: 'Ideias se perdem entre WhatsApp, anotações e conversas de última hora.' },
  { text: 'A equipe não sabe exatamente o que está em produção, revisão ou aprovado.' },
  { text: 'O cliente comenta em lugares diferentes e o retrabalho vira rotina.' },
  { text: 'Você sente que está apagando incêndio em vez de controlar a operação.' },
];

const featureBlocks: FeatureBlock[] = [
  {
    eyebrow: 'Interface completa',
    title: 'Tenha todo o processo de conteúdo em uma única plataforma.',
    body:
      'Da primeira ideia ao acompanhamento de performance, a PostHub conecta as etapas que normalmente ficam espalhadas em planilhas, grupos e ferramentas soltas.',
    image: '/kanban.png',
    imageAlt: 'Kanban editorial da PostHub',
    checks: [
      'Visão clara do que precisa ser criado',
      'Status de produção sempre atualizado',
      'Mais controle sem aumentar a cobrança manual',
    ],
  },
  {
    eyebrow: 'Rotina conectada',
    title: 'Acompanhe sua operação pelo computador e pelo celular.',
    body:
      'A experiência foi pensada para quem vive entre reuniões, gravações, revisões e aprovações. Tudo fica fácil de visualizar, mesmo fora da mesa.',
    image: '/membros.png',
    imageAlt: 'Visão de workspace e membros da PostHub',
    checks: [
      'Acesse informações importantes em poucos cliques',
      'Mantenha equipe e clientes na mesma direção',
      'Ganhe presença operacional sem depender de mensagens soltas',
    ],
    reversed: true,
  },
  {
    eyebrow: 'Calendário editorial',
    title: 'Tenha uma visão clara de tudo que será publicado.',
    body:
      'Planeje semanas e campanhas com uma visualização limpa, onde datas, canais e prioridades deixam de ficar escondidos em planilhas.',
    image: '/calendario-editorial.png',
    imageAlt: 'Calendário editorial da PostHub',
    checks: [
      'Planejamento visual por período',
      'Organização por cliente, formato e canal',
      'Menos conflito de prazo entre demandas',
    ],
  },
  {
    eyebrow: 'Kanban editorial',
    title: 'Organize cada etapa com um fluxo visual de produção.',
    body:
      'Veja o que está em rascunho, produção, revisão e aprovação. A operação deixa de depender da memória e passa a funcionar como processo.',
    image: '/kanban.png',
    imageAlt: 'Quadro kanban de produção da PostHub',
    checks: [
      'Colunas para cada fase da produção',
      'Demandas com contexto e prioridade',
      'Fluxo claro para social medias e agências',
    ],
    reversed: true,
  },
  {
    eyebrow: 'Referências',
    title: 'Salve referências com mood e contexto criativo.',
    body:
      'Guarde inspirações, exemplos e ideias no lugar certo para transformar repertório em briefing, pauta e produção com mais direção.',
    image: '/banco-de-ideias.png',
    imageAlt: 'Banco de ideias e referências da PostHub',
    checks: [
      'Repertório centralizado por tema',
      'Ideias prontas para virar conteúdo',
      'Menos tempo perdido procurando referências',
    ],
  },
];

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const SectionHeading = ({
  eyebrow,
  title,
  body,
  centered = false,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  centered?: boolean;
}) => (
  <div className={cx('mx-auto max-w-3xl', centered && 'text-center')}>
    {eyebrow ? (
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#38B6FF]">{eyebrow}</p>
    ) : null}
    <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#050505] sm:text-4xl lg:text-5xl">
      {title}
    </h2>
    {body ? <p className="mt-5 text-lg leading-8 text-[#64748B]">{body}</p> : null}
  </div>
);

const PrimaryButton = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <Link
    to="/signup"
    className={cx(
      'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#38B6FF] px-7 py-3 text-base font-bold text-white shadow-[0_18px_36px_rgba(56,182,255,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#229ee8] hover:shadow-[0_22px_42px_rgba(56,182,255,0.34)] focus:outline-none focus:ring-2 focus:ring-[#38B6FF]/40 focus:ring-offset-2',
      className
    )}
  >
    {children}
    <ArrowRight className="h-4 w-4" />
  </Link>
);

const BrowserMockup = ({
  image,
  alt,
  className,
}: {
  image: string;
  alt: string;
  className?: string;
}) => (
  <div
    className={cx(
      'overflow-hidden rounded-[18px] border border-[#DCEAF5] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.16)]',
      className
    )}
  >
    <div className="flex h-10 items-center gap-2 border-b border-[#E7F0F8] bg-[#F8FCFF] px-4">
      <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
      <div className="ml-3 h-5 flex-1 rounded-full bg-white" />
    </div>
    <img src={image} alt={alt} className="block aspect-[16/9] w-full object-cover object-top" />
  </div>
);

const PhoneMockup = () => (
  <div className="w-[132px] rounded-[28px] border-[7px] border-[#0B1220] bg-[#0B1220] shadow-[0_22px_45px_rgba(15,23,42,0.28)] sm:w-[168px]">
    <div className="overflow-hidden rounded-[20px] bg-white">
      <div className="bg-[#38B6FF] px-3 py-4 text-white">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Dashboard</span>
          <PanelTop className="h-4 w-4" />
        </div>
        <p className="text-lg font-extrabold leading-tight">Sua rotina no controle</p>
      </div>
      <div className="grid gap-2 p-3">
        {['Ideias', 'Aprovação', 'Calendário'].map((item, index) => (
          <div key={item} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-2">
            <p className="text-[10px] font-semibold text-[#64748B]">{item}</p>
            <div className="mt-2 h-2 rounded-full bg-[#38B6FF]" style={{ width: `${66 + index * 12}%` }} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const HeroProduct = () => (
  <div className="relative mx-auto mt-12 max-w-5xl px-4 sm:px-8">
    <div className="relative mx-auto max-w-4xl">
      <BrowserMockup image="/kanban.png" alt="Dashboard e kanban editorial da PostHub" />
      <div className="absolute -right-1 bottom-7 hidden sm:block lg:-right-10">
        <PhoneMockup />
      </div>
      <div className="mx-auto h-5 w-[86%] rounded-b-[28px] bg-gradient-to-b from-[#CBD5E1] to-[#94A3B8] shadow-[0_18px_28px_rgba(15,23,42,0.20)]" />
    </div>
  </div>
);

const SystemCard = ({ item }: { item: SystemCard }) => {
  const Icon = item.icon;

  return (
    <div className="rounded-[18px] border border-[#BFEAFF] bg-[#EAF8FF] p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#38B6FF] text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-extrabold text-[#050505]">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#475569]">{item.description}</p>
    </div>
  );
};

const PainPanel = () => (
  <div className="relative mx-auto flex min-h-[390px] max-w-[340px] items-center justify-center rounded-[26px] bg-[#38B6FF] p-5 shadow-[0_24px_60px_rgba(56,182,255,0.26)]">
    <div className="absolute inset-x-8 top-8 h-20 rounded-full bg-white/20 blur-2xl" />
    <div className="relative w-full rounded-[24px] bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <MessageCircleWarning className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#050505]">Operação travada</p>
          <p className="text-xs text-[#64748B]">muitos canais, pouco controle</p>
        </div>
      </div>
      <div className="space-y-3">
        {['WhatsApp', 'Planilhas', 'Aprovações', 'Prazos'].map((item) => (
          <div key={item} className="flex items-center justify-between rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] p-3">
            <span className="text-sm font-semibold text-[#334155]">{item}</span>
            <CircleAlert className="h-4 w-4 text-red-500" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const FeatureSection = ({ item }: { item: FeatureBlock }) => (
  <section className="border-t border-[#E5E7EB] bg-white px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
    <div
      className={cx(
        'mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16',
        item.reversed && 'lg:grid-cols-[1.05fr_0.95fr]'
      )}
    >
      <div className={cx(item.reversed && 'lg:order-2')}>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#38B6FF]">{item.eyebrow}</p>
        <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#050505] sm:text-4xl">
          {item.title}
        </h2>
        <p className="mt-5 text-lg leading-8 text-[#64748B]">{item.body}</p>
        <div className="mt-7 space-y-3">
          {item.checks.map((check) => (
            <div key={check} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-3.5 w-3.5" />
              </span>
              <p className="leading-7 text-[#334155]">{check}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={cx(item.reversed && 'lg:order-1')}>
        <BrowserMockup image={item.image} alt={item.imageAlt} />
      </div>
    </div>
  </section>
);

export const FocusedLandingPage = () => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#050505] selection:bg-[#38B6FF] selection:text-white">
      <header className="bg-white px-5 pb-3 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-center">
          <Link to="/lp" aria-label="PostHub">
            <BrandLogo variant="full" imgClassName="h-9 w-auto object-contain" />
          </Link>
        </div>
      </header>

      <main>
        <section className="bg-white px-5 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24">
          <div className="mx-auto max-w-6xl text-center">
            <h1 className="mx-auto max-w-5xl text-4xl font-extrabold leading-[1.05] text-[#050505] sm:text-6xl lg:text-7xl">
              A sua gestão de conteúdo
              <span className="block text-[#38B6FF]">nunca foi tão organizada!</span>
            </h1>
            <HeroProduct />
            <p className="mx-auto mt-12 max-w-3xl text-xl leading-9 text-[#38B6FF] sm:text-2xl">
              Com a <strong>PostHub</strong>, você <strong>elimina o caos da gestão de conteúdo</strong>{' '}
              com sistemas inteligentes e <strong>garante organização, clareza e controle</strong> em
              toda sua operação digital.
            </p>
            <div className="mt-8 flex justify-center">
              <PrimaryButton>Teste grátis</PrimaryButton>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              centered
              title="O que é PostHub?"
              body="A PostHub é uma plataforma de gestão de conteúdo criada para transformar a rotina de social medias, agências e negócios que precisam produzir com consistência, aprovar com clareza e crescer com processo."
            />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {systemCards.map((item) => (
                <SystemCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F8FCFF] px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <PainPanel />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#38B6FF]">O cenário atual</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#050505] sm:text-4xl lg:text-5xl">
                Você sente que luta contra o tempo ao invés de manter seu conteúdo no controle?
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#64748B]">
                Quando tudo depende de mensagens, cobranças e arquivos espalhados, a operação fica
                pesada. A PostHub existe para devolver clareza ao processo.
              </p>
              <div className="mt-7 space-y-3">
                {painItems.map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <CircleAlert className="h-3.5 w-3.5" />
                    </span>
                    <p className="leading-7 text-[#334155]">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <PrimaryButton>Começar agora</PrimaryButton>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
              <div>
                <SectionHeading
                  eyebrow="Organização visível"
                  title="Veja sua operação inteira ganhar forma."
                  body="A página do Figma destaca a PostHub como uma plataforma visual. Por isso, cada módulo abaixo aparece com screenshots reais do produto, mantendo a sensação de sistema profissional."
                />
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {[
                    { icon: Layers3, label: 'Fluxo único' },
                    { icon: CalendarDays, label: 'Calendário claro' },
                    { icon: ImageIcon, label: 'Referências salvas' },
                    { icon: Target, label: 'Controle da operação' },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-[#DCEAF5] bg-[#F8FCFF] p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#38B6FF] text-white">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="font-bold text-[#050505]">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="relative">
                <div className="absolute -bottom-6 -right-6 h-28 w-28 bg-[#38B6FF]" />
                <BrowserMockup image="/calendario-editorial.png" alt="Calendário editorial da PostHub" className="relative" />
              </div>
            </div>
          </div>
        </section>

        {featureBlocks.map((item) => (
          <FeatureSection key={item.title} item={item} />
        ))}

        <section className="bg-[#F8FCFF] px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-5xl text-center">
            <BrandLogo variant="full" imgClassName="mx-auto h-10 w-auto object-contain" />
            <h2 className="mx-auto mt-8 max-w-3xl text-4xl font-extrabold leading-tight text-[#050505] sm:text-5xl">
              Faça o teste grátis e pare de viver no caos da sua criação.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#64748B]">
              Organize seu primeiro fluxo, visualize os próximos conteúdos e entregue uma operação
              mais profissional para clientes, equipe e negócio.
            </p>
            <div className="relative mx-auto mt-10 max-w-3xl">
              <div className="absolute -bottom-5 left-1/2 h-28 w-[86%] -translate-x-1/2 bg-[#38B6FF]" />
              <BrowserMockup image="/performance.png" alt="Dashboard de performance da PostHub" className="relative" />
            </div>
            <div className="mt-10">
              <PrimaryButton>Começar teste grátis</PrimaryButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E5E7EB] bg-white px-5 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-[#64748B]">PostHub - gestão de conteúdo com organização, clareza e controle.</p>
          <div className="flex items-center gap-4 text-sm font-semibold text-[#64748B]">
            <Link to="/login" className="transition-colors hover:text-[#050505]">
              Entrar
            </Link>
            <Link to="/signup" className="text-[#38B6FF] transition-colors hover:text-[#229ee8]">
              Teste grátis
            </Link>
          </div>
        </div>
      </footer>

      <Link
        to="/signup"
        className="fixed inset-x-4 bottom-4 z-40 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#38B6FF] px-5 text-base font-bold text-white shadow-[0_18px_36px_rgba(56,182,255,0.34)] md:hidden"
      >
        Teste grátis
        <MousePointerClick className="h-4 w-4" />
      </Link>
    </div>
  );
};
