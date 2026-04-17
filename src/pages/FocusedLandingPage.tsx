import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Layers3,
  Menu,
  MonitorPlay,
  Pause,
  Play,
  Sparkles,
  Smartphone,
  UsersRound,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '../shared/components/Button';

type HighlightItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const highlightItems: HighlightItem[] = [
  {
    icon: Layers3,
    title: 'Tudo no mesmo fluxo',
    description:
      'Ideia, planejamento, produção e aprovação deixam de morar em ferramentas separadas.',
  },
  {
    icon: CheckCircle2,
    title: 'Aprovação sem ruído',
    description:
      'Centralize ajustes, contexto e status sem depender do vai-e-vem no WhatsApp.',
  },
  {
    icon: UsersRound,
    title: 'Equipe alinhada',
    description:
      'Cada entrega já nasce com responsáveis, observações e próximos passos visíveis.',
  },
  {
    icon: Sparkles,
    title: 'Rotina com mais ritmo',
    description:
      'Você sabe o que precisa andar hoje sem reabrir várias abas nem reconstruir contexto.',
  },
];

const dailyWins = [
  {
    title: 'Planeje com contexto',
    description:
      'Cada post já entra no fluxo com título, canal, prazo e briefing organizados no mesmo lugar.',
  },
  {
    title: 'Execute com menos atrito',
    description:
      'O time acompanha prioridades e sabe o que precisa fazer sem depender de cobrança manual.',
  },
  {
    title: 'Aprove com mais clareza',
    description:
      'Feedbacks e ajustes ficam amarrados à peça certa, com menos ruído e menos retrabalho.',
  },
];

const navItems = [
  { href: '#fluxo', label: 'Fluxo' },
  { href: '#superficies', label: 'Produto' },
  { href: '#cta', label: 'Teste grátis' },
];

export const FocusedLandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = React.useState(false);
  const [isInlineVideoMuted, setIsInlineVideoMuted] = React.useState(false);
  const [isInlineVideoPaused, setIsInlineVideoPaused] = React.useState(false);
  const [needsInlineAudioUnlock, setNeedsInlineAudioUnlock] = React.useState(false);
  const inlineVideoRef = React.useRef<HTMLVideoElement | null>(null);

  const enableInlineVideoSound = React.useCallback(async () => {
    const video = inlineVideoRef.current;

    if (!video) return false;

    try {
      video.muted = false;
      video.volume = 1;
      await video.play();
      setIsInlineVideoMuted(false);
      setNeedsInlineAudioUnlock(false);
      return true;
    } catch {
      video.muted = true;
      setIsInlineVideoMuted(true);
      return false;
    }
  }, []);

  const toggleInlineVideoSound = React.useCallback(async () => {
    const video = inlineVideoRef.current;

    if (!video) return;

    if (isInlineVideoMuted) {
      const soundEnabled = await enableInlineVideoSound();

      if (!soundEnabled) {
        setNeedsInlineAudioUnlock(true);
      }

      return;
    }

    video.muted = true;
    setIsInlineVideoMuted(true);
  }, [enableInlineVideoSound, isInlineVideoMuted]);

  const toggleInlineVideoPlayback = React.useCallback(async () => {
    const video = inlineVideoRef.current;

    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
        setIsInlineVideoPaused(false);
      } catch {
        video.muted = true;
        setIsInlineVideoMuted(true);
        setNeedsInlineAudioUnlock(true);

        try {
          await video.play();
          setIsInlineVideoPaused(false);
        } catch {
          setIsInlineVideoPaused(true);
        }
      }

      return;
    }

    video.pause();
    setIsInlineVideoPaused(true);
  }, []);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    if (!isVideoModalOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsVideoModalOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVideoModalOpen]);

  React.useEffect(() => {
    let isActive = true;

    const attemptInlineAutoplay = async () => {
      const video = inlineVideoRef.current;

      if (!video) return;

      try {
        video.muted = false;
        video.volume = 1;
        await video.play();

        if (!isActive) return;

        setIsInlineVideoMuted(false);
        setIsInlineVideoPaused(false);
        setNeedsInlineAudioUnlock(false);
      } catch {
        video.muted = true;

        try {
          await video.play();
        } catch {
          return;
        }

        if (!isActive) return;

        setIsInlineVideoMuted(true);
        setIsInlineVideoPaused(false);
        setNeedsInlineAudioUnlock(true);
      }
    };

    void attemptInlineAutoplay();

    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    if (!needsInlineAudioUnlock) {
      return;
    }

    const handleUserInteraction = () => {
      void enableInlineVideoSound();
    };

    window.addEventListener('pointerdown', handleUserInteraction, { once: true });
    window.addEventListener('keydown', handleUserInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, [enableInlineVideoSound, needsInlineAudioUnlock]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f7fcff_0%,#eef7fc_34%,#ffffff_100%)] text-slate-900 selection:bg-brand selection:text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[460px] bg-[radial-gradient(circle_at_top,rgba(56,182,255,0.26),transparent_68%)]" />
      <div className="pointer-events-none fixed left-[-8rem] top-24 z-0 h-72 w-72 rounded-full bg-brand/14 blur-3xl" />
      <div className="pointer-events-none fixed right-[-6rem] top-40 z-0 h-80 w-80 rounded-full bg-sky-200/60 blur-3xl" />

      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled ? 'px-3 pt-3 md:px-6' : 'px-0 pt-0'
        }`}
      >
        <div
          className={`mx-auto flex max-w-7xl items-center justify-between transition-all duration-300 ${
            isScrolled
              ? 'rounded-[24px] border border-white/70 bg-white/82 px-5 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl md:px-7'
              : 'border-b border-slate-200/70 bg-white/55 px-5 py-4 backdrop-blur-md md:px-8'
          }`}
        >
          <Link to="/lp" className="flex shrink-0 items-center">
            <img
              src="/lp-header-logo.png"
              alt="PostHub Gestão de Redes Sociais"
              className="h-11 w-auto object-contain md:h-12"
            />
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login">
              <Button
                variant="ghost"
                className="rounded-full px-5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Entrar
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="rounded-full px-5 text-sm font-semibold shadow-[0_18px_30px_rgba(56,182,255,0.22)]">
                Testar grátis
              </Button>
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
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
              className="mx-3 mt-3 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
            >
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
                <div className="my-2 h-px bg-slate-200" />
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="secondary"
                    className="w-full rounded-2xl border-slate-200 text-sm"
                  >
                    Entrar
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="mt-2 w-full rounded-2xl text-sm font-semibold">
                    Testar grátis
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main className="relative z-10">
        <section className="px-5 pb-10 pt-12 md:px-8 md:pb-16 md:pt-16 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="max-w-2xl"
              >
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/10 px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-brand uppercase">
                  <span className="h-2 w-2 rounded-full bg-brand" />
                  O sistema de gestão pensado por criadores de conteúdo
                </div>

                <h1 className="max-w-[14ch] text-4xl font-bold leading-[1.02] text-slate-950 sm:text-5xl lg:text-[4.25rem]">
                  Pare de tocar sua operação de conteúdo no improviso.
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                  A PostHub junta planejamento, status, comentários e aprovação
                  em um fluxo leve, com a mesma clareza do mobile e profundidade
                  de um workspace pensado para quem entrega conteúdo todos os dias.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link to="/signup">
                    <Button
                      size="lg"
                      className="flex w-full items-center justify-center gap-2 rounded-full px-7 shadow-[0_18px_35px_rgba(56,182,255,0.26)] sm:w-auto"
                    >
                      Começar teste grátis
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsVideoModalOpen(true)}
                    className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white">
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </span>
                    Ver apresentação
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="relative"
              >
                <div className="relative mx-auto max-w-[640px] rounded-[40px] border border-white/70 bg-white/70 p-3 shadow-[0_26px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-4">
                  <div className="pointer-events-none absolute inset-0 rounded-[40px] bg-[radial-gradient(circle_at_top,rgba(56,182,255,0.14),transparent_60%)]" />

                  <div className="relative overflow-hidden rounded-[32px] border border-[#D8E8F5] bg-[#F7FBFE]">
                    <div className="border-b border-[#D8E8F5] bg-white/90 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Apresentação do fluxo PostHub
                        </p>
                        <p className="text-xs text-slate-500">
                          Hero com vídeo em destaque
                        </p>
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center bg-slate-950">
                      <video
                        ref={inlineVideoRef}
                        src="/lp-video.mp4"
                        poster="/lp-video-cover.jpg"
                        autoPlay
                        muted={isInlineVideoMuted}
                        loop
                        playsInline
                        preload="metadata"
                        className="block aspect-video w-full h-auto bg-slate-950 object-contain"
                        onPause={() => setIsInlineVideoPaused(true)}
                        onPlay={() => setIsInlineVideoPaused(false)}
                      />
                    </div>

                    <div className="border-t border-[#D8E8F5] bg-white/85 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleInlineVideoPlayback()}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900"
                          >
                            {isInlineVideoPaused ? (
                              <Play className="h-3.5 w-3.5 fill-current" />
                            ) : (
                              <Pause className="h-3.5 w-3.5" />
                            )}
                            {isInlineVideoPaused ? 'Continuar' : 'Pausar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleInlineVideoSound()}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900"
                          >
                            {isInlineVideoMuted ? (
                              <VolumeX className="h-3.5 w-3.5" />
                            ) : (
                              <Volume2 className="h-3.5 w-3.5" />
                            )}
                            {isInlineVideoMuted ? 'Ativar som' : 'Som ligado'}
                          </button>
                        </div>

                        {needsInlineAudioUnlock ? (
                          <span className="text-[11px] font-medium text-amber-700">
                            O som pode liberar no primeiro toque
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="fluxo" className="px-5 py-6 md:px-8 md:py-10 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mobile-panel overflow-hidden p-6 md:p-8 lg:p-10">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                    Fluxo claro
                  </p>
                  <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-4xl">
                    Um sistema com cara de produto, não de planilha improvisada.
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-7 text-slate-600 md:text-base">
                  A landing resume a mesma promessa do PostHub: menos ruido para
                  operar e mais nitidez para saber o que acontece com cada entrega.
                </p>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-4">
                {highlightItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[28px] border border-[#D8E8F5] bg-[#F9FCFE] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="superficies" className="px-5 py-16 md:px-8 md:py-20 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                Produto em duas superfícies
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">
                Clareza no mobile. Controle no workspace.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                A nova LP puxa exatamente essa dualidade: leve o suficiente para
                parecer acessivel, robusta o suficiente para vender processo.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="mobile-panel p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Mobile first
                    </p>
                    <p className="text-sm text-slate-500">
                      Rápido para acompanhar a rotina em qualquer lugar
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-[30px] border border-[#D8E8F5] bg-[linear-gradient(180deg,#ffffff_0%,#eef7fc_100%)] p-4 shadow-[0_18px_30px_rgba(15,23,42,0.06)]">
                  <div className="mx-auto max-w-[280px] rounded-[30px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Dashboard
                        </p>
                        <p className="text-xs text-slate-500">
                          Visão rápida do dia
                        </p>
                      </div>
                      <div className="h-9 w-9 rounded-2xl bg-brand/10" />
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-[22px] bg-[#EEF6FB] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Hoje
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          3 aprovações pendentes
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-[#D8E8F5] bg-white p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-900">
                            Reel de campanha
                          </span>
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            Revisão
                          </span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-100">
                          <div className="h-2 w-2/3 rounded-full bg-brand" />
                        </div>
                      </div>
                      <div className="rounded-[22px] border border-[#D8E8F5] bg-white p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-900">
                            Calendario da semana
                          </span>
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2">
                          {['Seg', 'Ter', 'Qua', 'Qui'].map((day, index) => (
                            <div
                              key={day}
                              className={`rounded-2xl px-2 py-3 text-center text-xs font-semibold ${
                                index === 1
                                  ? 'bg-brand text-white'
                                  : 'bg-[#EEF6FB] text-slate-500'
                              }`}
                            >
                              {day}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mobile-panel p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    <MonitorPlay className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Workspace completo
                    </p>
                    <p className="text-sm text-slate-500">
                      Contexto, equipe e aprovações no mesmo painel
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-[30px] border border-[#D8E8F5] bg-[linear-gradient(180deg,#ffffff_0%,#f4faff_100%)] p-5 shadow-[0_18px_30px_rgba(15,23,42,0.06)]">
                  <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-[24px] border border-[#D8E8F5] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Kanban
                      </p>
                      <div className="mt-4 space-y-3">
                        {[
                          ['Briefing alinhado', 'Pronto para gravar'],
                          ['Legenda revisada', 'Esperando aprovação'],
                          ['Pauta do lancamento', 'Em edicao'],
                        ].map(([title, status], index) => (
                          <div
                            key={title}
                            className="rounded-[20px] border border-slate-100 bg-slate-50 p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-slate-900">{title}</p>
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                  index === 0
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : index === 1
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-sky-50 text-sky-700'
                                }`}
                              >
                                {status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[#D8E8F5] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Aprovacao
                      </p>
                      <div className="mt-4 rounded-[22px] border border-[#D8E8F5] bg-[#FBFDFF] p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              Agendar Post
                            </p>
                            <p className="text-xs text-slate-500">
                              Observações e comentários centralizados
                            </p>
                          </div>
                          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
                            Instagram
                          </span>
                        </div>

                        <div className="mt-5 space-y-3">
                          <div className="rounded-[18px] border border-[#D8E8F5] bg-white px-3 py-3 text-sm text-slate-700">
                            Título do post: Anúncio | Tela dividida
                          </div>
                          <div className="rounded-[18px] border border-[#D8E8F5] bg-white px-3 py-3 text-sm text-slate-500">
                            Adicione observações ou uma descrição...
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[18px] border border-[#D8E8F5] bg-white px-3 py-3 text-sm text-slate-700">
                              17/04/2026
                            </div>
                            <div className="rounded-[18px] border border-[#D8E8F5] bg-white px-3 py-3 text-sm text-slate-700">
                              Planejado
                            </div>
                          </div>
                          <div className="rounded-[18px] bg-[#EEF6FB] px-3 py-3 text-sm text-slate-700">
                            Membros vinculados ao conteúdo e comentários do time
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {dailyWins.map((item) => (
                <div key={item.title} className="mobile-panel-muted p-6">
                  <p className="text-lg font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="cta" className="px-5 pb-20 md:px-8 md:pb-24 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[36px] border border-slate-900/10 bg-[#07111F] px-6 py-10 text-white shadow-[0_28px_70px_rgba(15,23,42,0.18)] md:px-10 md:py-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,182,255,0.24),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(125,211,252,0.18),transparent_28%)]" />

              <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-200">
                    PostHub
                  </p>
                  <h2 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">
                    Se o conteúdo move o negócio, o bastidor precisa ter processo.
                  </h2>
                  <p className="mt-4 text-lg leading-8 text-slate-300">
                    A nova `/lp` entrega essa mensagem com a cara do produto: clara,
                    leve e convincente desde o primeiro scroll.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link to="/signup">
                    <Button className="w-full rounded-full px-7 text-sm font-semibold shadow-[0_18px_35px_rgba(56,182,255,0.24)] sm:w-auto">
                      Criar workspace grátis
                  </Button>
                  </Link>
                  <Link to="/login">
                    <Button
                      variant="secondary"
                      className="w-full rounded-full border-white/15 bg-white/10 px-7 text-sm font-semibold text-white hover:bg-white/15 sm:w-auto"
                    >
                      Entrar na PostHub
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {isVideoModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-md md:p-8"
            onClick={() => setIsVideoModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-5xl rounded-[32px] border border-white/10 bg-slate-950 p-3 shadow-[0_24px_90px_rgba(15,23,42,0.45)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="absolute right-5 top-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/16"
                aria-label="Fechar vídeo"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="overflow-hidden rounded-[24px] bg-black">
                <video
                  src="/lp-video.mp4"
                  poster="/lp-video-cover.jpg"
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="max-h-[80vh] w-full bg-black object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
