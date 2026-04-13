import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Lightbulb,
  MessageSquare,
} from 'lucide-react';
import { useProfile } from '../../../../app/context/ProfileContext';
import { useAuth } from '../../../../app/context/AuthContext';
import { useApp } from '../../../../app/context/AppContext';
import { Badge } from '../../../../shared/components/Badge';
import { MobilePage } from '../../components/MobilePage';
import { StickyActionBar } from '../../components/StickyActionBar';
import { supabase } from '../../../../shared/utils/supabase';

interface StatCard {
  label: string;
  value: string;
  helper: string;
  icon: React.ElementType;
}

interface ActivityItem {
  id: string;
  title: string;
  type: string;
  updated_at: string;
}

const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const hour = 1000 * 60 * 60;
  const day = hour * 24;

  if (diffMs < hour) {
    return `${Math.max(1, Math.floor(diffMs / (1000 * 60)))} min`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours}h`;
  }

  if (diffMs < day * 2) {
    return 'Ontem';
  }

  return `${Math.floor(diffMs / day)}d`;
};

export const DashboardMobile = () => {
  const navigate = useNavigate();
  const { activeProfile } = useProfile();
  const { user } = useAuth();
  const { setActiveModule } = useApp();

  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState<StatCard[]>([
    { label: 'Ideias', value: '--', helper: 'ativas', icon: Lightbulb },
    { label: 'Roteiros', value: '--', helper: 'salvos', icon: FileText },
    { label: 'Agenda', value: '--', helper: 'agendados', icon: CalendarDays },
  ]);
  const [pendingApprovals, setPendingApprovals] = React.useState(0);
  const [recentActivity, setRecentActivity] = React.useState<ActivityItem[]>([]);

  React.useEffect(() => {
    const load = async () => {
      if (!supabase || !user?.id || !activeProfile?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [ideasResult, scriptsResult, calendarResult, approvalsResult] = await Promise.all([
          supabase
            .from('ideas')
            .select('id,title,updated_at', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('profile_id', activeProfile.id)
            .order('updated_at', { ascending: false }),
          supabase
            .from('script_drafts')
            .select('id,title,updated_at', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('profile_id', activeProfile.id)
            .order('updated_at', { ascending: false }),
          supabase
            .from('editorial_calendar')
            .select('id,title,updated_at,scheduled_date,status', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('profile_id', activeProfile.id)
            .order('updated_at', { ascending: false }),
          supabase
            .from('approval_posts')
            .select('id,title,updated_at,status', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('profile_id', activeProfile.id)
            .order('updated_at', { ascending: false }),
        ]);

        if (ideasResult.error) throw ideasResult.error;
        if (scriptsResult.error) throw scriptsResult.error;
        if (calendarResult.error) throw calendarResult.error;
        if (approvalsResult.error) throw approvalsResult.error;

        const calendar = calendarResult.data ?? [];
        const approvals = approvalsResult.data ?? [];

        setStats([
          {
            label: 'Ideias',
            value: String(ideasResult.count ?? 0),
            helper: 'ativas',
            icon: Lightbulb,
          },
          {
            label: 'Roteiros',
            value: String(scriptsResult.count ?? 0),
            helper: 'salvos',
            icon: FileText,
          },
          {
            label: 'Agenda',
            value: String(calendar.filter((item) => item.scheduled_date).length),
            helper: 'agendados',
            icon: CalendarDays,
          },
        ]);

        setPendingApprovals(
          approvals.filter((item) => ['pending', 'changes_requested'].includes(item.status ?? ''))
            .length
        );

        const activity = [
          ...(ideasResult.data ?? []).slice(0, 2).map((item) => ({
            id: `idea-${item.id}`,
            title: item.title,
            type: 'ideia',
            updated_at: item.updated_at,
          })),
          ...(scriptsResult.data ?? []).slice(0, 2).map((item) => ({
            id: `script-${item.id}`,
            title: item.title,
            type: 'roteiro',
            updated_at: item.updated_at,
          })),
          ...calendar.slice(0, 2).map((item) => ({
            id: `calendar-${item.id}`,
            title: item.title,
            type: 'calendário',
            updated_at: item.updated_at,
          })),
        ].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        setRecentActivity(activity.slice(0, 5));
      } catch (error) {
        console.error('[DashboardMobile] Failed to load dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [activeProfile?.id, user?.id]);

  const goTo = (module: 'ideas' | 'scripts' | 'calendar' | 'approval') => {
    setActiveModule(module);
    navigate(`/workspace/${module}`);
  };

  return (
    <>
      <MobilePage className="gap-5">
        <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#38B6FF_0%,#1C93EC_54%,#156AE1_100%)] p-5 text-white shadow-[0_24px_55px_rgba(56,182,255,0.28)]">
          <div className="absolute right-[-18%] top-[-16%] h-32 w-32 rounded-full bg-white/14 blur-3xl" />
          <div className="absolute bottom-[-22%] left-[-8%] h-28 w-28 rounded-full bg-sky-100/16 blur-3xl" />
          <Badge className="relative mb-3 bg-white/18 px-3 py-1 text-[0.78rem] font-semibold text-white">
            Hoje
          </Badge>
          <h2 className="relative text-[1.7rem] font-semibold tracking-[-0.035em]">
            {activeProfile ? `${activeProfile.name} em movimento` : 'Seu workspace em movimento'}
          </h2>
          <p className="relative mt-2 max-w-[18rem] text-[1rem] leading-7 text-white/84">
            Priorize o que precisa sair hoje e aprove o que estiver travando a fila.
          </p>
          <div className="relative mt-5 flex items-center gap-2 rounded-[22px] bg-white/14 px-4 py-3">
            <MessageSquare className="h-5 w-5 shrink-0" />
            <p className="text-[0.98rem] text-white/94">
              {isLoading ? '...' : `${pendingApprovals} aprovações pedindo atenção`}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`mobile-panel p-4 ${index === stats.length - 1 ? 'col-span-2' : ''}`}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-[1.5rem] font-semibold tracking-[-0.03em] text-slate-950">
                {isLoading ? '...' : stat.value}
              </p>
              <p className="mt-1 text-[0.82rem] font-medium text-slate-600">
                {stat.label}
              </p>
              <p className="text-[0.75rem] text-slate-400">{stat.helper}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[1.1rem] font-semibold text-slate-950">
              Atividade recente
            </h3>
            <button
              type="button"
              onClick={() => goTo('calendar')}
              className="text-[0.9rem] font-medium text-brand active:scale-[0.98]"
            >
              Ver tudo
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-[24px] bg-slate-200/70 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="mobile-panel flex items-center gap-4 px-4 py-4"
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[1rem] font-medium text-slate-950">
                      {item.title}
                    </p>
                    <p className="text-[0.88rem] text-slate-500">
                      {item.type} • {formatRelativeDate(item.updated_at)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => goTo('approval')}
            className="mobile-panel p-4 text-left active:scale-[0.99]"
          >
            <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-500" />
            <p className="text-[1rem] font-semibold text-slate-950">
              Aprovações
            </p>
            <p className="mt-1 text-[0.88rem] leading-6 text-slate-600">
              Decida sem sair do fluxo
            </p>
          </button>
          <button
            type="button"
            onClick={() => goTo('calendar')}
            className="mobile-panel p-4 text-left active:scale-[0.99]"
          >
            <Clock className="mb-3 h-5 w-5 text-amber-500" />
            <p className="text-[1rem] font-semibold text-slate-950">
              Planejamento
            </p>
            <p className="mt-1 text-[0.88rem] leading-6 text-slate-600">
              Ajuste a fila do dia
            </p>
          </button>
        </section>
      </MobilePage>

      <StickyActionBar>
        <button
          type="button"
          onClick={() => goTo('ideas')}
          className="flex min-h-[52px] flex-1 items-center justify-center rounded-[22px] border border-slate-200 bg-white px-4 text-[1rem] font-semibold text-slate-700 active:scale-[0.98]"
        >
          Nova ideia
        </button>
        <button
          type="button"
          onClick={() => goTo('scripts')}
          className="flex min-h-[52px] flex-[1.15] items-center justify-center rounded-[22px] bg-brand px-4 text-[1rem] font-semibold text-white shadow-[0_10px_26px_rgba(56,182,255,0.3)] active:scale-[0.98]"
        >
          Criar roteiro
        </button>
      </StickyActionBar>
    </>
  );
};
