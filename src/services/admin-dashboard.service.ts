import { supabase } from '../shared/utils/supabase';

export interface AdminDashboardUserRow {
  id: string;
  nome: string | null;
  email: string | null;
  current_plan: string | null;
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

export const adminDashboardService = {
  async listUsers(): Promise<AdminDashboardUser[]> {
    if (!supabase) {
      throw new AdminDashboardAccessError('Supabase não está configurado.');
    }

    const [{ data: usuariosData, error: usuariosError }, { data: onboardingData, error: onboardingError }] =
      await Promise.all([
        supabase
          .from('usuarios')
          .select('id, nome, email, current_plan, trial_expires_at, is_admin, created_at'),
        supabase
          .from('user_onboarding')
          .select(
            'user_id, work_model, operation_size, current_process, quiz_completed, setup_completed'
          ),
      ]);

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
          createdAt: usuario.created_at,
        };
      })
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return bTime - aTime;
      });
  },
};

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
