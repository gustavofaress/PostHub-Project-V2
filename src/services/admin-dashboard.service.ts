import { supabase } from '../shared/utils/supabase';

export interface AdminDashboardUserRow {
  id: string;
  nome: string | null;
  email: string | null;
  current_plan: string | null;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  is_admin: boolean | null;
  created_at: string | null;
}

export interface AdminDashboardOnboardingRow {
  user_id: string;
  work_model: string | null;
  operation_size: string | null;
  current_process: string | null;
  quiz_completed: boolean | null;
  setup_completed: boolean | null;
  created_at?: string | null;
}

export interface AdminDashboardUser {
  id: string;
  name: string;
  email: string;
  plan: 'Trial' | 'Pro';
  trialStatus: 'Active' | 'Expired' | 'N/A';
  workModel: string;
  operationSize: string;
  currentWorkflow: string;
  quizCompleted: boolean;
  setupCompleted: boolean;
  createdAt: string | null;
}

export interface AdminDashboardLandingPageVisitRow {
  visit_id: string;
  landing_path: string | null;
  page_variant: string | null;
  max_video_percent: number | null;
  reached_thruplay: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminDashboardLandingPageMetricWindow {
  label: string;
  shortLabel: string;
  days: 1 | 7 | 15 | 30;
  views: number;
  averageViewedPercent: number;
  thruPlayCount: number;
  thruPlayRate: number;
}

export interface AdminDashboardLandingPageMetrics {
  windows: AdminDashboardLandingPageMetricWindow[];
  lastUpdatedAt: string | null;
}

export class AdminDashboardAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminDashboardAccessError';
  }
}

type AdminDashboardQueryError = {
  code?: string;
  message?: string | null;
};

type AdminDashboardQueryResult<T> = {
  data: T[] | null;
  error: AdminDashboardQueryError | null;
};

export const adminDashboardService = {
  async listUsers(): Promise<AdminDashboardUser[]> {
    if (!supabase) {
      throw new AdminDashboardAccessError('Supabase não está configurado.');
    }

    const [{ data: usuariosData, error: usuariosError }, { data: onboardingData, error: onboardingError }] =
      await Promise.all([fetchAdminDashboardUsers(), fetchAdminDashboardOnboarding()]);

    if (usuariosError) {
      throw mapAdminDashboardError(usuariosError);
    }

    if (onboardingError) {
      throw mapAdminDashboardError(onboardingError);
    }

    const onboardingMap = new Map<string, AdminDashboardOnboardingRow>();
    (onboardingData as AdminDashboardOnboardingRow[] | null)?.forEach((row) => {
      onboardingMap.set(row.user_id, row);
    });

    return ((usuariosData as AdminDashboardUserRow[] | null) ?? [])
      .filter((usuario) => !usuario.is_admin)
      .map((usuario) => {
        const onboarding = onboardingMap.get(usuario.id);
        const isPro = usuario.current_plan === 'pro';

        return {
          id: usuario.id,
          name: usuario.nome?.trim() || 'Usuário sem nome',
          email: usuario.email?.trim() || '-',
          plan: isPro ? ('Pro' as const) : ('Trial' as const),
          trialStatus: getTrialStatus(usuario.current_plan, usuario.trial_expires_at),
          workModel: onboarding?.work_model || '',
          operationSize: onboarding?.operation_size || '',
          currentWorkflow: onboarding?.current_process || '',
          quizCompleted: !!onboarding?.quiz_completed,
          setupCompleted: !!onboarding?.setup_completed,
          createdAt: resolveUserCreatedAt(usuario, onboarding),
        };
      })
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return bTime - aTime;
      });
  },

  async getLandingPageMetrics(): Promise<AdminDashboardLandingPageMetrics> {
    if (!supabase) {
      throw new AdminDashboardAccessError('Supabase não está configurado.');
    }

    const { data, error } = await fetchLandingPageVideoVisits();

    if (error) {
      throw mapAdminDashboardError(error);
    }

    const visits = (data as AdminDashboardLandingPageVisitRow[] | null) ?? [];
    const windows = LANDING_PAGE_WINDOWS.map(({ label, shortLabel, days }) => {
      const visitsInWindow = visits.filter((visit) => isDateWithinLastDays(visit.created_at, days));
      const views = visitsInWindow.length;
      const thruPlayCount = visitsInWindow.filter(
        (visit) =>
          visit.reached_thruplay ||
          safeNumber(visit.max_video_percent) >= THRU_PLAY_PERCENTAGE
      ).length;
      const averageViewedPercent =
        views > 0
          ? Number(
              (
                visitsInWindow.reduce(
                  (total, visit) => total + safeNumber(visit.max_video_percent),
                  0
                ) / views
              ).toFixed(1)
            )
          : 0;

      return {
        label,
        shortLabel,
        days,
        views,
        averageViewedPercent,
        thruPlayCount,
        thruPlayRate: views > 0 ? Math.round((thruPlayCount / views) * 100) : 0,
      };
    });

    const lastUpdatedAt = visits
      .map((visit) => visit.updated_at ?? visit.created_at)
      .filter((value): value is string => !!value)
      .sort((firstValue, secondValue) => {
        return new Date(secondValue).getTime() - new Date(firstValue).getTime();
      })[0] ?? null;

    return {
      windows,
      lastUpdatedAt,
    };
  },
};

const THRU_PLAY_PERCENTAGE = 75;

const LANDING_PAGE_WINDOWS: Array<{
  label: string;
  shortLabel: string;
  days: 1 | 7 | 15 | 30;
}> = [
  { label: 'Último dia', shortLabel: '24h', days: 1 },
  { label: 'Últimos 7 dias', shortLabel: '7d', days: 7 },
  { label: 'Últimos 15 dias', shortLabel: '15d', days: 15 },
  { label: 'Últimos 30 dias', shortLabel: '30d', days: 30 },
];

async function fetchAdminDashboardUsers() {
  const queries = [
    'id, nome, email, current_plan, trial_started_at, trial_expires_at, is_admin, created_at',
    'id, nome, email, current_plan, trial_started_at, trial_expires_at, is_admin',
    'id, nome, email, current_plan, trial_expires_at, is_admin',
  ];

  let lastResult: AdminDashboardQueryResult<AdminDashboardUserRow> | null = null;

  for (const query of queries) {
    const result = (await supabase!.from('usuarios').select(
      query
    )) as AdminDashboardQueryResult<AdminDashboardUserRow>;

    if (!result.error) {
      return result;
    }

    lastResult = result as typeof lastResult;

    if (
      query.includes('created_at') &&
      isMissingColumnError(result.error, 'usuarios.created_at')
    ) {
      continue;
    }

    if (
      query.includes('trial_started_at') &&
      isMissingColumnError(result.error, 'usuarios.trial_started_at')
    ) {
      continue;
    }

    return result;
  }

  return (
    lastResult ?? {
      data: null,
      error: new Error('Não foi possível consultar os usuários do Admin Dashboard.'),
    }
  );
}

async function fetchAdminDashboardOnboarding() {
  const queries = [
    'user_id, work_model, operation_size, current_process, quiz_completed, setup_completed, created_at',
    'user_id, work_model, operation_size, current_process, quiz_completed, setup_completed',
  ];

  let lastResult: AdminDashboardQueryResult<AdminDashboardOnboardingRow> | null = null;

  for (const query of queries) {
    const result = (await supabase!.from('user_onboarding').select(
      query
    )) as AdminDashboardQueryResult<AdminDashboardOnboardingRow>;

    if (!result.error) {
      return result;
    }

    lastResult = result as typeof lastResult;

    if (
      query.includes('created_at') &&
      isMissingColumnError(result.error, 'user_onboarding.created_at')
    ) {
      continue;
    }

    return result;
  }

  return (
    lastResult ?? {
      data: null,
      error: new Error('Não foi possível consultar o onboarding do Admin Dashboard.'),
    }
  );
}

async function fetchLandingPageVideoVisits() {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 30);

  return (await supabase!
    .from('landing_page_video_visits')
    .select(
      'visit_id, landing_path, page_variant, max_video_percent, reached_thruplay, created_at, updated_at'
    )
    .eq('landing_path', '/lp')
    .gte('created_at', sinceDate.toISOString())) as AdminDashboardQueryResult<AdminDashboardLandingPageVisitRow>;
}

function resolveUserCreatedAt(
  usuario: Pick<AdminDashboardUserRow, 'created_at' | 'trial_started_at'>,
  onboarding?: Pick<AdminDashboardOnboardingRow, 'created_at'> | null
) {
  const validDates = [usuario.created_at, usuario.trial_started_at, onboarding?.created_at]
    .filter((value): value is string => !!value)
    .map((value) => ({
      value,
      timestamp: new Date(value).getTime(),
    }))
    .filter((entry) => !Number.isNaN(entry.timestamp))
    .sort((firstEntry, secondEntry) => firstEntry.timestamp - secondEntry.timestamp);

  return validDates[0]?.value ?? null;
}

function isMissingColumnError(error: { code?: string; message?: string | null }, columnName: string) {
  const normalizedMessage = (error.message || '').toLowerCase();
  return error.code === '42703' || normalizedMessage.includes(columnName.toLowerCase());
}

function isDateWithinLastDays(dateString: string | null, days: number) {
  if (!dateString) return false;

  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) return false;

  const difference = Date.now() - parsedDate.getTime();
  return difference >= 0 && difference < days * 24 * 60 * 60 * 1000;
}

function safeNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getTrialStatus(
  currentPlan: string | null,
  trialExpiresAt: string | null
): 'Active' | 'Expired' | 'N/A' {
  if (currentPlan === 'pro') return 'N/A';
  if (!trialExpiresAt) return 'Active';

  const expiresAt = new Date(trialExpiresAt).getTime();
  const now = Date.now();

  return expiresAt >= now ? 'Active' : 'Expired';
}

function mapAdminDashboardError(error: { code?: string; message?: string | null }) {
  const normalizedMessage = (error.message || '').toLowerCase();
  const isPermissionError =
    error.code === '42501' ||
    normalizedMessage.includes('permission denied') ||
    normalizedMessage.includes('row-level security') ||
    normalizedMessage.includes('violates row-level security');

  if (isPermissionError) {
    return new AdminDashboardAccessError(
      'O Admin Dashboard não conseguiu ler todos os usuários. Aplique as policies de admin no Supabase para as tabelas usuarios e user_onboarding.'
    );
  }

  return new Error(
    error.message ||
      'Não foi possível carregar os dados do dashboard. Verifique a conexão com o Supabase.'
  );
}
