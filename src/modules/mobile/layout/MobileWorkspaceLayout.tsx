import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { MobileTopBar } from '../components/MobileTopBar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { MobileMoreSheet } from '../components/MobileMoreSheet';
import { DesktopRecommendationSheet } from '../components/DesktopRecommendationSheet';
import { MobileProfileSheet } from '../components/MobileProfileSheet';
import { MobileModuleRenderer } from './MobileModuleRenderer';

const DESKTOP_RECOMMENDATION_KEY = 'posthub_mobile_desktop_recommendation_seen';
const MOBILE_READY_MODULES = new Set(['dashboard', 'ideas', 'calendar']);

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão rápida do dia' },
  ideas: { title: 'Ideias', subtitle: 'Capture e priorize' },
  approval: { title: 'Aprovação', subtitle: 'Decisões rápidas' },
  calendar: { title: 'Calendário', subtitle: 'Planejamento' },
  kanban: { title: 'Kanban', subtitle: 'Produção' },
  clients: { title: 'Clientes', subtitle: 'Operação por perfil' },
  reports: { title: 'Relatórios', subtitle: 'Resultados' },
  settings: { title: 'Configurações', subtitle: 'Workspace e equipe' },
};

export const MobileWorkspaceLayout = () => {
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = React.useState(false);
  const [isDesktopRecommendationOpen, setIsDesktopRecommendationOpen] = React.useState(false);
  const moduleId = location.pathname.split('/')[2] || 'dashboard';
  const copy = TITLES[moduleId] || { title: 'PostHub', subtitle: 'Workspace mobile' };
  const shouldSuggestDesktop = !MOBILE_READY_MODULES.has(moduleId);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!shouldSuggestDesktop) {
      setIsDesktopRecommendationOpen(false);
      return;
    }

    const hasSeenRecommendation = window.localStorage.getItem(DESKTOP_RECOMMENDATION_KEY);

    if (!hasSeenRecommendation) {
      setIsDesktopRecommendationOpen(true);
    }
  }, [shouldSuggestDesktop]);

  const handleCloseDesktopRecommendation = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DESKTOP_RECOMMENDATION_KEY, 'true');
    }

    setIsDesktopRecommendationOpen(false);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg-soft text-slate-900 md:hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(circle_at_top,rgba(56,182,255,0.22),transparent_65%)]" />
      <div className="pointer-events-none absolute left-[-24%] top-28 h-56 w-56 rounded-full bg-brand/12 blur-3xl" />
      <div className="pointer-events-none absolute right-[-18%] top-40 h-64 w-64 rounded-full bg-sky-200/55 blur-3xl" />
      <MobileTopBar
        title={copy.title}
        subtitle={copy.subtitle}
        onOpenMenu={() => setIsMoreOpen(true)}
        onOpenProfiles={() => setIsProfileSheetOpen(true)}
      />
      <main className="relative z-10 min-h-[calc(100vh-8.5rem)]">
        <MobileModuleRenderer />
      </main>
      <MobileBottomNav onOpenMore={() => setIsMoreOpen(true)} />
      <MobileProfileSheet
        isOpen={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
      />
      <MobileMoreSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        activeModuleId={moduleId}
      />
      <DesktopRecommendationSheet
        isOpen={isDesktopRecommendationOpen}
        onClose={handleCloseDesktopRecommendation}
      />
    </div>
  );
};
