import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { MobileTopBar } from '../components/MobileTopBar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { MobileMoreSheet } from '../components/MobileMoreSheet';
import { DesktopRecommendationSheet } from '../components/DesktopRecommendationSheet';
import { MobileModuleRenderer } from './MobileModuleRenderer';

const DESKTOP_RECOMMENDATION_KEY = 'posthub_mobile_desktop_recommendation_seen';

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão rápida do dia' },
  ideas: { title: 'Ideias', subtitle: 'Capture e priorize' },
  scripts: { title: 'Roteiros', subtitle: 'Fluxo guiado' },
  approval: { title: 'Aprovação', subtitle: 'Decisões rápidas' },
  calendar: { title: 'Calendário', subtitle: 'Planejamento' },
  kanban: { title: 'Kanban', subtitle: 'Produção' },
  reports: { title: 'Relatórios', subtitle: 'Resultados' },
  settings: { title: 'Configurações', subtitle: 'Workspace e equipe' },
};

export const MobileWorkspaceLayout = () => {
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const [isDesktopRecommendationOpen, setIsDesktopRecommendationOpen] = React.useState(false);
  const moduleId = location.pathname.split('/')[2] || 'dashboard';
  const copy = TITLES[moduleId] || { title: 'PostHub', subtitle: 'Workspace mobile' };

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasSeenRecommendation = window.localStorage.getItem(DESKTOP_RECOMMENDATION_KEY);

    if (!hasSeenRecommendation) {
      setIsDesktopRecommendationOpen(true);
    }
  }, []);

  const handleCloseDesktopRecommendation = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DESKTOP_RECOMMENDATION_KEY, 'true');
    }

    setIsDesktopRecommendationOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-slate-900 dark:bg-slate-950 dark:text-slate-50 md:hidden">
      <MobileTopBar
        title={copy.title}
        subtitle={copy.subtitle}
        onOpenMenu={() => setIsMoreOpen(true)}
      />
      <main className="min-h-[calc(100vh-8.5rem)]">
        <MobileModuleRenderer />
      </main>
      <MobileBottomNav onOpenMore={() => setIsMoreOpen(true)} />
      <MobileMoreSheet isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
      <DesktopRecommendationSheet
        isOpen={isDesktopRecommendationOpen}
        onClose={handleCloseDesktopRecommendation}
      />
    </div>
  );
};
