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
};

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
