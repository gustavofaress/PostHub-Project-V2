import * as React from 'react';
import { Search, Filter, MoreVertical, ShieldAlert } from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { supabase } from '../../shared/utils/supabase';
import { useAuth } from '../../app/context/AuthContext';

interface UsuarioRow {
  id: string;
  nome: string | null;
  email: string | null;
  current_plan: string | null;
  trial_expires_at: string | null;
  created_at: string | null;
  is_admin: boolean | null;
}

interface OnboardingRow {
  user_id: string;
  work_model: string | null;
  operation_size: string | null;
  current_process: string | null;
  quiz_completed: boolean | null;
  setup_completed: boolean | null;
}

interface UserData {
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
  createdAt: string;
}

const WORK_MODEL_OPTIONS = [
  'Social Media Autônomo',
  'Agência de Marketing',
  'Equipe de marketing interna',
  'Gestor de empresa',
  'Criador de Conteúdo Profissional',
] as const;

export const AdminDashboard = () => {
  const { user } = useAuth();

  const [users, setUsers] = React.useState<UserData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterPlan, setFilterPlan] = React.useState('All');
  const [filterQuiz, setFilterQuiz] = React.useState('All');
  const [filterSetup, setFilterSetup] = React.useState('All');
  const [filterWorkModel, setFilterWorkModel] = React.useState('All');

  const fetchAdminData = React.useCallback(async () => {
    if (!supabase) {
      setError('Supabase não está configurado.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const [{ data: usuariosData, error: usuariosError }, { data: onboardingData, error: onboardingError }] =
        await Promise.all([
          supabase
            .from('usuarios')
            .select('id, nome, email, current_plan, trial_expires_at, created_at, is_admin')
            .order('created_at', { ascending: false }),
          supabase
            .from('user_onboarding')
            .select(
              'user_id, work_model, operation_size, current_process, quiz_completed, setup_completed'
            ),
        ]);

      if (usuariosError) throw usuariosError;
      if (onboardingError) throw onboardingError;

      const onboardingMap = new Map<string, OnboardingRow>();
      (onboardingData as OnboardingRow[] | null)?.forEach((row) => {
        onboardingMap.set(row.user_id, row);
      });

      const mergedUsers: UserData[] = ((usuariosData as UsuarioRow[] | null) ?? []).map((usuario) => {
        const onboarding = onboardingMap.get(usuario.id);
        const isPro = usuario.current_plan === 'pro';
        const trialStatus = getTrialStatus(usuario.current_plan, usuario.trial_expires_at);

        return {
          id: usuario.id,
          name: usuario.nome?.trim() || 'Usuário sem nome',
          email: usuario.email?.trim() || '-',
          plan: isPro ? 'Pro' : 'Trial',
          trialStatus,
          workModel: onboarding?.work_model || '',
          operationSize: onboarding?.operation_size || '',
          currentWorkflow: onboarding?.current_process || '',
          quizCompleted: !!onboarding?.quiz_completed,
          setupCompleted: !!onboarding?.setup_completed,
          createdAt: usuario.created_at || new Date().toISOString(),
        };
      });

      setUsers(mergedUsers);
    } catch (err: any) {
      console.error('Erro ao carregar Admin Dashboard:', err);
      setError(
        err?.message ||
          'Não foi possível carregar os dados do dashboard. Verifique as policies do Supabase.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!user?.isAdmin) {
      setIsLoading(false);
      return;
    }

    void fetchAdminData();
  }, [fetchAdminData, user?.isAdmin]);

  const filteredUsers = React.useMemo(() => {
    return users.filter((currentUser) => {
      const matchesSearch =
        currentUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        currentUser.email.toLowerCase().includes(searchTerm.toLowerCase());

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

      return matchesSearch && matchesPlan && matchesQuiz && matchesSetup && matchesWorkModel;
    });
  }, [users, searchTerm, filterPlan, filterQuiz, filterSetup, filterWorkModel]);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateString));
  };

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
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <ShieldAlert className="h-8 w-8 text-[#38B6FF]" />
              Admin Dashboard
            </h1>
            <p className="mt-1 text-gray-500">
              Monitor user onboarding, plans, and platform usage.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-[#38B6FF] focus:outline-none focus:ring-2 focus:ring-[#38B6FF]/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex w-full flex-1 flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">Filters:</span>
            </div>

            <select
              className="block rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700 focus:border-[#38B6FF] focus:ring-[#38B6FF]"
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
            >
              <option value="All">All Plans</option>
              <option value="Trial">Trial</option>
              <option value="Pro">Pro</option>
            </select>

            <select
              className="block rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700 focus:border-[#38B6FF] focus:ring-[#38B6FF]"
              value={filterQuiz}
              onChange={(e) => setFilterQuiz(e.target.value)}
            >
              <option value="All">Quiz: All</option>
              <option value="Yes">Quiz: Completed</option>
              <option value="No">Quiz: Pending</option>
            </select>

            <select
              className="block rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700 focus:border-[#38B6FF] focus:ring-[#38B6FF]"
              value={filterSetup}
              onChange={(e) => setFilterSetup(e.target.value)}
            >
              <option value="All">Setup: All</option>
              <option value="Yes">Setup: Completed</option>
              <option value="No">Setup: Pending</option>
            </select>

            <select
              className="block max-w-[190px] truncate rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700 focus:border-[#38B6FF] focus:ring-[#38B6FF]"
              value={filterWorkModel}
              onChange={(e) => setFilterWorkModel(e.target.value)}
            >
              <option value="All">Work Model: All</option>
              {WORK_MODEL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          {error && (
            <div className="border-b border-red-100 bg-red-50 px-6 py-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="border-b border-gray-100 bg-gray-50 font-medium text-gray-500">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Plan & Status</th>
                  <th className="px-6 py-4">Work Model</th>
                  <th className="px-6 py-4">Operation Size</th>
                  <th className="px-6 py-4">Progress</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Carregando dados...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((currentUser) => (
                    <tr key={currentUser.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{currentUser.name}</div>
                        <div className="mt-0.5 text-xs text-gray-500">{currentUser.email}</div>
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
                              {currentUser.trialStatus}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-gray-700">{currentUser.workModel || '-'}</span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-gray-700">{currentUser.operationSize || '-'}</span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-10 text-xs text-gray-500">Quiz:</span>
                            <Badge variant={currentUser.quizCompleted ? 'green' : 'gray'}>
                              {currentUser.quizCompleted ? 'Done' : 'Pending'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="w-10 text-xs text-gray-500">Setup:</span>
                            <Badge variant={currentUser.setupCompleted ? 'green' : 'gray'}>
                              {currentUser.setupCompleted ? 'Done' : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                        {formatDate(currentUser.createdAt)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 text-sm text-gray-500">
            <span>
              Showing {filteredUsers.length} of {users.length} users
            </span>

            <div className="flex gap-2">
              <button
                className="rounded-md border border-gray-200 bg-white px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
                disabled
              >
                Previous
              </button>
              <button
                className="rounded-md border border-gray-200 bg-white px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
                disabled
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
