import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  MessageSquare,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Lightbulb,
  CalendarDays,
} from 'lucide-react';
import { Card, CardTitle } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { useApp } from '../../app/context/AppContext';
import { useProfile } from '../../app/context/ProfileContext';
import { supabase } from '../../shared/utils/supabase';
import { calendarApprovalService } from '../calendar/services/calendarApprovalService';
import {
  buildDashboardContentStatus,
  buildDashboardDesktopActivityFeed,
  countDashboardPendingItems,
  type DashboardActivityItem,
  type DashboardCalendarRow,
  type DashboardIdeaRow,
} from './dashboard.helpers';

type WorkspaceModule = 'ideas' | 'calendar' | 'approval';

interface StatCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const hour = 1000 * 60 * 60;
  const day = hour * 24;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${minutes} min atrás`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
  }

  if (diffMs < day * 2) return 'Ontem';

  const days = Math.floor(diffMs / day);
  return `${days} dias atrás`;
}

export const Dashboard = () => {
  const { setActiveModule } = useApp();
  const { activeProfile } = useProfile();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [stats, setStats] = React.useState<StatCard[]>([
    { label: 'Ideias', value: '--', change: 'sistema', trend: 'up', icon: Lightbulb },
    { label: 'Posts Agendados', value: '--', change: 'sistema', trend: 'up', icon: CalendarDays },
    { label: 'Revisões Pendentes', value: '--', change: 'sistema', trend: 'up', icon: MessageSquare },
  ]);

  const [recentActivity, setRecentActivity] = React.useState<DashboardActivityItem[]>([]);
  const [contentStatus, setContentStatus] = React.useState({
    inProduction: 0,
    pendingReview: 0,
    published: 0,
  });

  const handleNavigate = (module: WorkspaceModule) => {
    setActiveModule(module);
    navigate(`/workspace/${module}`);
  };

  const loadDashboard = React.useCallback(async () => {
    if (!supabase || !activeProfile?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [
        ideasResult,
        calendarResult,
        latestApprovalStatuses,
      ] = await Promise.all([
        supabase
          .from('ideas')
          .select('id,title,updated_at', { count: 'exact' })
          .eq('profile_id', activeProfile.id)
          .order('updated_at', { ascending: false }),

        supabase
          .from('editorial_calendar')
          .select('id,title,status,updated_at,scheduled_date', { count: 'exact' })
          .eq('profile_id', activeProfile.id)
          .order('updated_at', { ascending: false }),

        calendarApprovalService.listLatestApprovalStatuses(activeProfile.id),
      ]);

      if (ideasResult.error) throw ideasResult.error;
      if (calendarResult.error) throw calendarResult.error;

      const ideas = (ideasResult.data ?? []) as DashboardIdeaRow[];
      const calendar = (calendarResult.data ?? []) as DashboardCalendarRow[];
      const latestApprovalEntries = Object.values(latestApprovalStatuses);

      const scheduledPostsCount = calendar.filter((item) => item.scheduled_date).length;
      const pendingReviewsCount = countDashboardPendingItems(calendar, latestApprovalEntries);

      setStats([
        {
          label: 'Ideias',
          value: String(ideasResult.count ?? ideas.length),
          change: 'ativas',
          trend: 'up',
          icon: Lightbulb,
        },
        {
          label: 'Posts Agendados',
          value: String(scheduledPostsCount),
          change: 'calendário',
          trend: 'up',
          icon: CalendarDays,
        },
        {
          label: 'Revisões Pendentes',
          value: String(pendingReviewsCount),
          change: 'atenção',
          trend: pendingReviewsCount > 0 ? 'down' : 'up',
          icon: MessageSquare,
        },
      ]);

      setContentStatus(buildDashboardContentStatus(calendar));
      setRecentActivity(
        buildDashboardDesktopActivityFeed({
          ideas,
          calendar,
          latestApprovals: latestApprovalEntries,
          formatTimestamp: formatRelativeDate,
        })
      );
    } catch (error) {
      console.error('[Dashboard] Error loading dashboard:', error);
      setErrorMessage('Não foi possível carregar os dados do dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile?.id]);

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Bem-vindo de volta{activeProfile ? `, ${activeProfile.name}` : ''}!
          </h1>
          <p className="text-text-secondary">Veja o que está acontecendo com o seu conteúdo hoje.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">Baixar Relatório</Button>
          <Button onClick={() => handleNavigate('ideas')}>Criar Conteúdo</Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="border-red-200 bg-red-50 text-red-700 p-4">
          {errorMessage}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-brand/10 p-2 text-brand">
                <stat.icon className="h-5 w-5" />
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                )}
              >
                {stat.change}
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <p className="text-2xl font-bold text-text-primary">
                {isLoading ? '...' : stat.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <CardTitle>Atividade Recente</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => handleNavigate('calendar')}>
              Ver Tudo
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-sm text-text-secondary">Carregando atividade...</div>
          ) : recentActivity.length === 0 ? (
            <EmptyState
              title="Nenhuma atividade recente"
              description="Conforme você criar ideias, posts e aprovações, a atividade aparecerá aqui."
              icon={Activity}
            />
          ) : (
            <div className="space-y-6">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div
                    className={cn(
                      'mt-1 h-2 w-2 rounded-full',
                      activity.status === 'success'
                        ? 'bg-green-500'
                        : activity.status === 'warning'
                        ? 'bg-yellow-500'
                        : activity.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-brand'
                    )}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{activity.title}</p>
                    <p className="text-xs text-text-secondary">{activity.time}</p>
                  </div>
                  <Badge variant={activity.status as any}>{activity.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle className="mb-4">Status do Conteúdo</CardTitle>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Clock className="h-4 w-4" />
                  <span>Em Produção</span>
                </div>
                <span className="font-semibold">
                  {isLoading ? '...' : contentStatus.inProduction}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <AlertCircle className="h-4 w-4" />
                  <span>Revisão Pendente</span>
                </div>
                <span className="font-semibold">
                  {isLoading ? '...' : contentStatus.pendingReview}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Publicado</span>
                </div>
                <span className="font-semibold">
                  {isLoading ? '...' : contentStatus.published}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={() => handleNavigate('calendar')}
            >
              Ir para o Calendário
            </Button>
          </Card>

          <Card className="bg-brand text-white border-none">
            <h3 className="text-lg font-bold mb-2">Dica Pro</h3>
            <p className="text-sm text-white/80 mb-4">
              Mantenha seu fluxo em movimento: organize ideias, ajuste a agenda editorial e destrave revisões pendentes sem perder o contexto do perfil ativo.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-full bg-white text-brand hover:bg-white/90"
              onClick={() => handleNavigate('calendar')}
            >
              Abrir Calendário
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
