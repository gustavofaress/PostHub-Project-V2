import * as React from 'react';
import {
  CheckCircle2,
  Copy,
  Filter,
  KeyRound,
  Mail,
  MonitorPlay,
  Search,
  ShieldAlert,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { useAuth } from '../../app/context/AuthContext';
import {
  adminDashboardService,
  AdminDashboardAccessError,
  type AdminDashboardLandingPageMetrics,
  type AdminDashboardUser as UserData,
} from '../../services/admin-dashboard.service';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';

const WORK_MODEL_OPTIONS = [
  'Social Media Autônomo',
  'Agência de Marketing',
  'Equipe de marketing interna',
  'Gestor de empresa',
  'Criador de Conteúdo Profissional',
] as const;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type MetricTone = 'blue' | 'green' | 'yellow' | 'slate';

interface WeeklyGrowthPoint {
  key: string;
  label: string;
  shortDate: string;
  count: number;
}

const getStartOfDay = (value: Date) => {
  const nextDate = new Date(value);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const getDayOffsetFromToday = (dateString: string | null) => {
  if (!dateString) return null;

  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) return null;

  const today = getStartOfDay(new Date()).getTime();
  const targetDay = getStartOfDay(parsedDate).getTime();

  return Math.floor((today - targetDay) / DAY_IN_MS);
};

const isWithinLastDays = (dateString: string | null, days: number) => {
  const dayOffset = getDayOffsetFromToday(dateString);
  return dayOffset !== null && dayOffset >= 0 && dayOffset < days;
};

const countUsersInDayWindow = (users: UserData[], startDayOffset: number, endDayOffset: number) =>
  users.filter((currentUser) => {
    const dayOffset = getDayOffsetFromToday(currentUser.createdAt);
    return dayOffset !== null && dayOffset >= startDayOffset && dayOffset < endDayOffset;
  }).length;

const sortUsersByNewest = (users: UserData[]) =>
  [...users].sort((firstUser, secondUser) => {
    const firstTime = firstUser.createdAt ? new Date(firstUser.createdAt).getTime() : 0;
    const secondTime = secondUser.createdAt ? new Date(secondUser.createdAt).getTime() : 0;

    if (firstTime !== secondTime) {
      return secondTime - firstTime;
    }

    return firstUser.name.localeCompare(secondUser.name, 'pt-BR');
  });

const buildWeeklyGrowthData = (users: UserData[]): WeeklyGrowthPoint[] => {
  const dayLabelFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
  const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });

  const countsByDay = new Map<string, number>();
  users.forEach((currentUser) => {
    if (!currentUser.createdAt) return;

    const createdAt = new Date(currentUser.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;

    const dayKey = getStartOfDay(createdAt).toISOString().slice(0, 10);
    countsByDay.set(dayKey, (countsByDay.get(dayKey) ?? 0) + 1);
  });

  const today = getStartOfDay(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    const key = date.toISOString().slice(0, 10);

    return {
      key,
      label: dayLabelFormatter.format(date).replace('.', ''),
      shortDate: shortDateFormatter.format(date),
      count: countsByDay.get(key) ?? 0,
    };
  });
};

const formatGrowthDelta = (currentValue: number, previousValue: number) => {
  if (currentValue === 0 && previousValue === 0) {
    return 'Sem variação nas últimas duas semanas';
  }

  if (previousValue === 0) {
    return `${currentValue} novos clientes a mais do que na semana anterior`;
  }

  const delta = ((currentValue - previousValue) / previousValue) * 100;
  const roundedDelta = Math.round(delta);

  if (roundedDelta === 0) {
    return 'Crescimento estável em relação à semana anterior';
  }

  if (roundedDelta > 0) {
    return `${roundedDelta}% acima da semana anterior`;
  }

  return `${Math.abs(roundedDelta)}% abaixo da semana anterior`;
};

const MetricCard = ({
  icon: Icon,
  title,
  value,
  helper,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  helper: string;
  tone: MetricTone;
}) => {
  const toneClasses: Record<MetricTone, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    yellow: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          <p className="mt-2 text-sm leading-6 text-gray-500">{helper}</p>
        </div>

        <div className={cn('rounded-2xl p-3', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const InsightBar = ({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: 'blue' | 'green' | 'yellow' | 'slate';
}) => {
  const width = total > 0 ? Math.max((value / total) * 100, value > 0 ? 10 : 0) : 0;
  const barClasses = {
    blue: 'from-sky-400 to-blue-500',
    green: 'from-emerald-400 to-emerald-500',
    yellow: 'from-amber-300 to-orange-400',
    slate: 'from-slate-300 to-slate-400',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{value}</span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all', barClasses[tone])}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

const LandingAnalyticsWindowCard = ({
  label,
  shortLabel,
  views,
  averageViewedPercent,
  thruPlayCount,
  thruPlayRate,
}: {
  label: string;
  shortLabel: string;
  views: number;
  averageViewedPercent: string;
  thruPlayCount: number;
  thruPlayRate: number;
}) => {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">
            {shortLabel}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-gray-900">{label}</h3>
        </div>

        <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
          <MonitorPlay className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-gray-500">Views da LP</p>
        <p className="mt-2 text-3xl font-semibold text-gray-900">{views}</p>
      </div>

      <div className="mt-5 space-y-3 border-t border-gray-100 pt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">Média assistida</span>
          <span className="font-semibold text-gray-900">{averageViewedPercent}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">ThruPlay</span>
          <span className="font-semibold text-gray-900">{thruPlayCount}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">Taxa de ThruPlay</span>
          <span className="font-semibold text-gray-900">{thruPlayRate}%</span>
        </div>
      </div>
    </div>
  );
};

export const AdminDashboard = () => {
  const { user } = useAuth();

  const [users, setUsers] = React.useState<UserData[]>([]);
  const [landingPageMetrics, setLandingPageMetrics] =
    React.useState<AdminDashboardLandingPageMetrics | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLandingAnalyticsLoading, setIsLandingAnalyticsLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [landingAnalyticsError, setLandingAnalyticsError] = React.useState('');
  const [passwordResetUser, setPasswordResetUser] = React.useState<UserData | null>(null);
  const [generatedPasswordResetLink, setGeneratedPasswordResetLink] = React.useState('');
  const [passwordResetNotice, setPasswordResetNotice] = React.useState('');
  const [passwordResetError, setPasswordResetError] = React.useState('');
  const [isGeneratingPasswordResetLink, setIsGeneratingPasswordResetLink] = React.useState(false);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterPlan, setFilterPlan] = React.useState('All');
  const [filterQuiz, setFilterQuiz] = React.useState('All');
  const [filterSetup, setFilterSetup] = React.useState('All');
  const [filterWorkModel, setFilterWorkModel] = React.useState('All');

  const fetchAdminData = React.useCallback(async () => {
    setIsLoading(true);
    setIsLandingAnalyticsLoading(true);
    setError('');
    setLandingAnalyticsError('');

    const [usersResult, landingAnalyticsResult] = await Promise.allSettled([
      adminDashboardService.listUsers(),
      adminDashboardService.getLandingPageMetrics(),
    ]);

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value);
    } else {
      console.error('Erro ao carregar Admin Dashboard:', usersResult.reason);
      setError(
        usersResult.reason instanceof AdminDashboardAccessError
          ? usersResult.reason.message
          : usersResult.reason?.message ||
              'Não foi possível carregar os dados do dashboard. Verifique as policies do Supabase.'
      );
    }

    if (landingAnalyticsResult.status === 'fulfilled') {
      setLandingPageMetrics(landingAnalyticsResult.value);
    } else {
      console.error('Erro ao carregar analytics da LP:', landingAnalyticsResult.reason);
      setLandingAnalyticsError(
        landingAnalyticsResult.reason instanceof AdminDashboardAccessError
          ? landingAnalyticsResult.reason.message
          : landingAnalyticsResult.reason?.message ||
              'Não foi possível carregar as métricas da landing page. Verifique a migration e as policies do Supabase.'
      );
    }

    setIsLoading(false);
    setIsLandingAnalyticsLoading(false);
  }, []);

  React.useEffect(() => {
    if (!user?.isAdmin) {
      setIsLoading(false);
      return;
    }

    void fetchAdminData();
  }, [fetchAdminData, user?.isAdmin]);

  const filteredUsers = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return sortUsersByNewest(
      users.filter((currentUser) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          currentUser.name.toLowerCase().includes(normalizedSearch) ||
          currentUser.email.toLowerCase().includes(normalizedSearch);

        const matchesPlan = filterPlan === 'All' || currentUser.plan === filterPlan;

        const matchesQuiz =
          filterQuiz === 'All' ||
          (filterQuiz === 'Yes' && currentUser.quizCompleted) ||
          (filterQuiz === 'No' && !currentUser.quizCompleted);

        const matchesSetup =
          filterSetup === 'All' ||
          (filterSetup === 'Yes' && currentUser.setupCompleted) ||
          (filterSetup === 'No' && !currentUser.setupCompleted);

        const matchesWorkModel =
          filterWorkModel === 'All' || currentUser.workModel === filterWorkModel;

        return (
          matchesSearch &&
          matchesPlan &&
          matchesQuiz &&
          matchesSetup &&
          matchesWorkModel
        );
      })
    );
  }, [users, searchTerm, filterPlan, filterQuiz, filterSetup, filterWorkModel]);

  const weeklyGrowthData = React.useMemo(() => buildWeeklyGrowthData(users), [users]);
  const maxWeeklyGrowth = React.useMemo(
    () => Math.max(...weeklyGrowthData.map((item) => item.count), 1),
    [weeklyGrowthData]
  );
  const newestUsersThisWeek = React.useMemo(
    () => sortUsersByNewest(users.filter((currentUser) => isWithinLastDays(currentUser.createdAt, 7))),
    [users]
  );

  const dashboardStats = React.useMemo(() => {
    const totalUsers = users.length;
    const newUsersThisWeek = countUsersInDayWindow(users, 0, 7);
    const newUsersPreviousWeek = countUsersInDayWindow(users, 7, 14);
    const newUsersToday = countUsersInDayWindow(users, 0, 1);
    const onboardingPending = users.filter(
      (currentUser) => !currentUser.quizCompleted || !currentUser.setupCompleted
    ).length;
    const onboardingCompletedThisWeek = newestUsersThisWeek.filter(
      (currentUser) => currentUser.quizCompleted && currentUser.setupCompleted
    ).length;
    const proUsersThisWeek = newestUsersThisWeek.filter(
      (currentUser) => currentUser.plan === 'Pro'
    ).length;

    return {
      totalUsers,
      newUsersThisWeek,
      newUsersPreviousWeek,
      newUsersToday,
      onboardingPending,
      onboardingCompletedThisWeek,
      onboardingPendingThisWeek: Math.max(newUsersThisWeek - onboardingCompletedThisWeek, 0),
      proUsersThisWeek,
      trialUsersThisWeek: Math.max(newUsersThisWeek - proUsersThisWeek, 0),
      growthLabel: formatGrowthDelta(newUsersThisWeek, newUsersPreviousWeek),
      weeklyCompletionRate:
        newUsersThisWeek > 0
          ? Math.round((onboardingCompletedThisWeek / newUsersThisWeek) * 100)
          : 0,
    };
  }, [users, newestUsersThisWeek]);

  const formatPercentage = React.useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 1,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    }).format(value);
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const closePasswordResetModal = React.useCallback(() => {
    setPasswordResetUser(null);
    setGeneratedPasswordResetLink('');
    setPasswordResetNotice('');
    setPasswordResetError('');
    setIsGeneratingPasswordResetLink(false);
  }, []);

  const openPasswordResetModal = React.useCallback((targetUser: UserData) => {
    setPasswordResetUser(targetUser);
    setGeneratedPasswordResetLink('');
    setPasswordResetNotice('');
    setPasswordResetError('');
  }, []);

  const handleGeneratePasswordResetLink = React.useCallback(async () => {
    if (!passwordResetUser?.email) {
      setPasswordResetError('Selecione um usuario valido antes de gerar o link.');
      return;
    }

    setIsGeneratingPasswordResetLink(true);
    setPasswordResetNotice('');
    setPasswordResetError('');

    try {
      const result = await adminDashboardService.generatePasswordResetLink(passwordResetUser.email);
      setGeneratedPasswordResetLink(result.actionLink);
      setPasswordResetNotice(
        'Link gerado com sucesso. Compartilhe apenas com a cliente e prefira usar imediatamente.'
      );
    } catch (passwordResetLinkError) {
      console.error('Erro ao gerar link manual de redefinicao:', passwordResetLinkError);
      setGeneratedPasswordResetLink('');
      setPasswordResetError(
        passwordResetLinkError instanceof Error
          ? passwordResetLinkError.message
          : 'Nao foi possivel gerar o link manual de redefinicao.'
      );
    } finally {
      setIsGeneratingPasswordResetLink(false);
    }
  }, [passwordResetUser?.email]);

  const handleCopyPasswordResetLink = React.useCallback(async () => {
    if (!generatedPasswordResetLink) return;

    try {
      await navigator.clipboard.writeText(generatedPasswordResetLink);
      setPasswordResetNotice('Link copiado para a area de transferencia.');
      setPasswordResetError('');
    } catch (copyError) {
      console.error('Erro ao copiar link manual de redefinicao:', copyError);
      setPasswordResetError('Nao foi possivel copiar o link agora.');
    }
  }, [generatedPasswordResetLink]);

  const Badge = ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue';
  }) => {
    const variants = {
      green: 'border-green-200 bg-green-100 text-green-800',
      yellow: 'border-yellow-200 bg-yellow-100 text-yellow-800',
      red: 'border-red-200 bg-red-100 text-red-800',
      gray: 'border-gray-200 bg-gray-100 text-gray-800',
      blue: 'border-blue-200 bg-blue-100 text-blue-800',
    };

    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
          variants[variant]
        )}
      >
        {children}
      </span>
    );
  };

  if (!user?.isAdmin) {
    return (
      <div className="min-h-full bg-[#F9FAFB] p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-red-700">
            Você não tem permissão para acessar o Admin Dashboard.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F9FAFB] p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <ShieldAlert className="h-8 w-8 text-[#38B6FF]" />
              Admin Dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-gray-500">
              Acompanhe seus clientes com foco em novos cadastros, crescimento semanal
              e detalhes completos de cada usuário.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Ordenação padrão: clientes mais recentes primeiro.
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Users}
            title="Total de clientes"
            value={String(dashboardStats.totalUsers)}
            helper="Base usada nas análises do dashboard admin."
            tone="slate"
          />
          <MetricCard
            icon={UserPlus}
            title="Novos na semana"
            value={String(dashboardStats.newUsersThisWeek)}
            helper={dashboardStats.growthLabel}
            tone="blue"
          />
          <MetricCard
            icon={TrendingUp}
            title="Novos hoje"
            value={String(dashboardStats.newUsersToday)}
            helper="Cadastros realizados nas últimas 24 horas."
            tone="green"
          />
          <MetricCard
            icon={CheckCircle2}
            title="Onboarding pendente"
            value={String(dashboardStats.onboardingPending)}
            helper={`${dashboardStats.weeklyCompletionRate}% dos novos usuários da semana já concluíram quiz e setup.`}
            tone="yellow"
          />
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Analytics da Landing Page
              </h2>
              <p className="text-sm text-gray-500">
                Views da `/lp`, média do vídeo assistida por visita e ThruPlay
                quando a pessoa assiste pelo menos 75% do vídeo.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Última atualização:{' '}
              {landingPageMetrics?.lastUpdatedAt
                ? formatDateTime(landingPageMetrics.lastUpdatedAt)
                : '-'}
            </div>
          </div>

          {landingAnalyticsError ? (
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-600">
              {landingAnalyticsError}
            </div>
          ) : isLandingAnalyticsLoading ? (
            <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-gray-500">
              Carregando métricas da landing page...
            </div>
          ) : landingPageMetrics && landingPageMetrics.windows.some((item) => item.views > 0) ? (
            <>
              <div className="mt-6 grid gap-4 xl:grid-cols-4">
                {landingPageMetrics.windows.map((windowMetrics) => (
                  <LandingAnalyticsWindowCard
                    key={windowMetrics.days}
                    label={windowMetrics.label}
                    shortLabel={windowMetrics.shortLabel}
                    views={windowMetrics.views}
                    averageViewedPercent={`${formatPercentage(windowMetrics.averageViewedPercent)}%`}
                    thruPlayCount={windowMetrics.thruPlayCount}
                    thruPlayRate={windowMetrics.thruPlayRate}
                  />
                ))}
              </div>

              <p className="mt-4 text-xs text-gray-400">
                Cada view representa uma visita registrada na página. O cálculo de
                média assistida considera o maior percentual atingido em cada visita.
              </p>
            </>
          ) : (
            <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-gray-500">
              Ainda não há visitas registradas na `/lp` nos últimos 30 dias.
            </div>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Crescimento de usuários na semana
                </h2>
                <p className="text-sm text-gray-500">
                  Novos clientes cadastrados por dia nos últimos 7 dias.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Comparativo
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {dashboardStats.growthLabel}
                </div>
              </div>
            </div>

            <div className="mt-8 flex h-72 items-end gap-3">
              {weeklyGrowthData.map((item) => {
                const columnHeight =
                  item.count > 0
                    ? `${Math.max((item.count / maxWeeklyGrowth) * 100, 14)}%`
                    : '6%';

                return (
                  <div key={item.key} className="flex h-full flex-1 flex-col justify-end gap-3">
                    <div className="text-center text-sm font-semibold text-gray-700">
                      {item.count}
                    </div>

                    <div className="relative flex-1 rounded-2xl bg-slate-50">
                      <div className="absolute inset-x-3 bottom-3 top-3 flex items-end">
                        <div
                          className="w-full rounded-2xl bg-gradient-to-t from-[#2499D6] via-[#38B6FF] to-[#8DD8FF]"
                          style={{ height: columnHeight }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-center">
                      <div className="text-sm font-medium capitalize text-gray-600">
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-400">{item.shortDate}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Novos usuários em foco</h2>
              <p className="text-sm text-gray-500">
                Indicadores orientados aos clientes que entraram nesta semana.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <InsightBar
                label="Onboarding completo"
                value={dashboardStats.onboardingCompletedThisWeek}
                total={dashboardStats.newUsersThisWeek}
                tone="green"
              />
              <InsightBar
                label="Onboarding pendente"
                value={dashboardStats.onboardingPendingThisWeek}
                total={dashboardStats.newUsersThisWeek}
                tone="yellow"
              />
              <InsightBar
                label="Entraram já no plano Pro"
                value={dashboardStats.proUsersThisWeek}
                total={dashboardStats.newUsersThisWeek}
                tone="blue"
              />
              <InsightBar
                label="Entraram em Trial"
                value={dashboardStats.trialUsersThisWeek}
                total={dashboardStats.newUsersThisWeek}
                tone="slate"
              />
            </div>

            <div className="mt-8 border-t border-gray-100 pt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Mais recentes
                </h3>
                <span className="text-sm text-gray-500">
                  {newestUsersThisWeek.length} na semana
                </span>
              </div>

              <div className="space-y-3">
                {newestUsersThisWeek.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-gray-500">
                    Nenhum novo usuário cadastrado nesta semana.
                  </div>
                ) : (
                  newestUsersThisWeek.slice(0, 4).map((currentUser) => (
                    <div
                      key={currentUser.id}
                      className="rounded-2xl border border-gray-100 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">{currentUser.name}</div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                            <Mail className="h-4 w-4 shrink-0" />
                            <span className="truncate">{currentUser.email}</span>
                          </div>
                        </div>

                        <Badge variant="blue">Novo</Badge>
                      </div>

                      <div className="mt-3 text-xs text-gray-400">
                        Entrou em {formatDateTime(currentUser.createdAt)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="flex w-full flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm xl:flex-row xl:items-center">
          <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-[#38B6FF] focus:outline-none focus:ring-2 focus:ring-[#38B6FF]/50"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="flex w-full flex-1 flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">Filtros:</span>
            </div>

            <select
              className="block rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700 focus:border-[#38B6FF] focus:ring-[#38B6FF]"
              value={filterPlan}
              onChange={(event) => setFilterPlan(event.target.value)}
            >
              <option value="All">Todos os planos</option>
              <option value="Trial">Trial</option>
              <option value="Pro">Pro</option>
            </select>

            <select
              className="block rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700 focus:border-[#38B6FF] focus:ring-[#38B6FF]"
              value={filterQuiz}
              onChange={(event) => setFilterQuiz(event.target.value)}
            >
              <option value="All">Quiz: todos</option>
              <option value="Yes">Quiz concluído</option>
              <option value="No">Quiz pendente</option>
            </select>

            <select
              className="block rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700 focus:border-[#38B6FF] focus:ring-[#38B6FF]"
              value={filterSetup}
              onChange={(event) => setFilterSetup(event.target.value)}
            >
              <option value="All">Setup: todos</option>
              <option value="Yes">Setup concluído</option>
              <option value="No">Setup pendente</option>
            </select>

            <select
              className="block max-w-[220px] truncate rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700 focus:border-[#38B6FF] focus:ring-[#38B6FF]"
              value={filterWorkModel}
              onChange={(event) => setFilterWorkModel(event.target.value)}
            >
              <option value="All">Modelo de trabalho</option>
              {WORK_MODEL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {error && (
            <div className="border-b border-red-100 bg-red-50 px-6 py-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="border-b border-gray-100 bg-slate-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Clientes e detalhes completos</h2>
            <p className="mt-1 text-sm text-gray-500">
              Emails, data de entrada, plano, fluxo atual e progresso de onboarding.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left text-sm text-gray-600">
              <thead className="border-b border-gray-100 bg-gray-50 font-medium text-gray-500">
                <tr>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Modelo de trabalho</th>
                  <th className="px-6 py-4">Tamanho da operação</th>
                  <th className="px-6 py-4">Fluxo atual</th>
                  <th className="px-6 py-4">Onboarding</th>
                  <th className="px-6 py-4">Entrada</th>
                  <th className="px-6 py-4">Acesso</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Carregando dados...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      {users.length === 0
                        ? 'Nenhum usuário disponível. Se você esperava dados aqui, aplique as policies do arquivo docs/admin-dashboard-rls.sql no Supabase.'
                        : 'Nenhum usuário encontrado com os filtros selecionados.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((currentUser) => (
                    <tr key={currentUser.id} className="align-top transition-colors hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900">{currentUser.name}</div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{currentUser.email}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-gray-400">
                              ID: {currentUser.id}
                            </div>
                          </div>

                          {isWithinLastDays(currentUser.createdAt, 7) && (
                            <Badge variant="blue">Novo</Badge>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge variant={currentUser.plan === 'Pro' ? 'green' : 'yellow'}>
                            {currentUser.plan}
                          </Badge>

                          {currentUser.plan === 'Trial' && (
                            <span
                              className={cn(
                                'text-xs font-medium',
                                currentUser.trialStatus === 'Active'
                                  ? 'text-blue-600'
                                  : 'text-red-600'
                              )}
                            >
                              {currentUser.trialStatus === 'Active'
                                ? 'Trial ativo'
                                : 'Trial expirado'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {currentUser.workModel || '-'}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {currentUser.operationSize || '-'}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {currentUser.currentWorkflow || '-'}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-12 text-xs text-gray-500">Quiz</span>
                            <Badge variant={currentUser.quizCompleted ? 'green' : 'gray'}>
                              {currentUser.quizCompleted ? 'Concluído' : 'Pendente'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="w-12 text-xs text-gray-500">Setup</span>
                            <Badge variant={currentUser.setupCompleted ? 'green' : 'gray'}>
                              {currentUser.setupCompleted ? 'Concluído' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                        <div>{formatDate(currentUser.createdAt)}</div>
                        <div className="mt-1 text-xs text-gray-400">
                          {formatDateTime(currentUser.createdAt)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="w-full min-w-[180px] gap-2"
                          onClick={() => openPasswordResetModal(currentUser)}
                        >
                          <KeyRound className="h-4 w-4" />
                          Redefinir senha
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 text-sm text-gray-500">
          <span>
            Exibindo {filteredUsers.length} de {users.length} clientes
          </span>

          <span>Clientes mais recentes aparecem primeiro.</span>
        </div>
      </div>

      <Modal
        isOpen={!!passwordResetUser}
        onClose={closePasswordResetModal}
        title="Link manual de redefinicao"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
            Use este fallback quando o email automatico do "Esqueci minha senha" falhar.
            O link abre a tela segura de redefinicao no dominio principal do PostHub.
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
            <div className="font-semibold text-gray-900">{passwordResetUser?.name || 'Cliente'}</div>
            <div className="mt-1 break-all">{passwordResetUser?.email || '-'}</div>
          </div>

          {passwordResetError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              {passwordResetError}
            </div>
          ) : null}

          {passwordResetNotice ? (
            <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
              {passwordResetNotice}
            </div>
          ) : null}

          {generatedPasswordResetLink ? (
            <div className="space-y-3">
              <label className="text-sm font-medium text-text-primary">
                Link pronto para enviar
              </label>
              <textarea
                readOnly
                value={generatedPasswordResetLink}
                className="min-h-[140px] w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 focus:outline-none"
              />
              <Button
                type="button"
                variant="secondary"
                className="w-full gap-2"
                onClick={handleCopyPasswordResetLink}
              >
                <Copy className="h-4 w-4" />
                Copiar link
              </Button>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="flex-1"
              isLoading={isGeneratingPasswordResetLink}
              onClick={handleGeneratePasswordResetLink}
            >
              {generatedPasswordResetLink ? 'Gerar novo link' : 'Gerar link seguro'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={closePasswordResetModal}
            >
              Fechar
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
};
