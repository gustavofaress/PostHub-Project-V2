import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../shared/utils/supabase';
import { onboardingService } from '../../services/onboarding.service';
import { userService } from '../../services/user.service';
import { trialAccessService } from '../../services/trial-access.service';
import { normalizePlan } from '../../shared/constants/plans';
import { memberAuthStorage } from '../../modules/settings/memberAuth.storage';
import { buildAppUrl } from '../../shared/utils/appUrl';
import {
  accountSettingsService,
  normalizeNotificationPreferences,
  normalizeWebsite,
  type UserNotificationPreferences,
} from '../../services/account-settings.service';

interface UserOnboardingState {
  work_model: string | null;
  operation_size: string | null;
  current_process: string | null;
  quiz_completed: boolean;
  setup_completed: boolean;
  guided_current_step?: string | null;
  guided_steps_completed?: string[];
  guided_flow_completed_at?: string | null;
}

type UserAccessStatus =
  | 'trial_active'
  | 'trial_expired'
  | 'paid'
  | 'pro'
  | 'blocked'
  | 'missing'
  | 'unknown';

interface User {
  id: string;
  name: string;
  email: string;
  website?: string | null;
  avatarUrl?: string | null;
  notificationPreferences: UserNotificationPreferences;
  currentPlan?: string | null;
  isAdmin?: boolean;
  isWorkspaceMember?: boolean;
  isMemberOnlyAccount?: boolean;
  trialExpiresAt?: string | null;
  accessStatus?: UserAccessStatus;
  onboarding?: UserOnboardingState | null;
}

interface SignupResult {
  requiresEmailConfirmation: boolean;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password?: string,
    profileName?: string
  ) => Promise<SignupResult>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateAccountProfile: (input: {
    name: string;
    website?: string | null;
    avatarUrl?: string | null;
    notificationPreferences?: Partial<UserNotificationPreferences> | null;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const isTrialStillActive = (trialExpiresAt?: string | null) => {
  if (!trialExpiresAt) return false;
  return new Date(trialExpiresAt).getTime() > Date.now();
};

const getLocalIsoDate = (value = new Date()) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const lastRecordedTrialAccessRef = React.useRef('');
  const navigate = useNavigate();

  const mapOnboardingState = React.useCallback((onboarding: any): UserOnboardingState | null => {
    if (!onboarding) return null;

    return {
      work_model: onboarding.work_model ?? null,
      operation_size: onboarding.operation_size ?? null,
      current_process: onboarding.current_process ?? null,
      quiz_completed: !!onboarding.quiz_completed,
      setup_completed: !!onboarding.setup_completed,
      guided_current_step: onboarding.guided_current_step ?? null,
      guided_steps_completed: onboarding.guided_steps_completed ?? [],
      guided_flow_completed_at: onboarding.guided_flow_completed_at ?? null,
    };
  }, []);

  const normalizeAuthErrorMessage = React.useCallback((error: any) => {
    const rawMessage = `${error?.message || ''}`.trim();
    const normalizedMessage = rawMessage.toLowerCase();

    if (
      normalizedMessage.includes('already been registered') ||
      normalizedMessage.includes('already registered')
    ) {
      return 'Este email já possui um acesso criado. Se ele foi convidado como membro, use o login de membro em vez de criar uma nova conta.';
    }

    return rawMessage;
  }, []);

  const normalizePasswordResetErrorMessage = React.useCallback((error: any) => {
    const rawMessage = `${error?.message || ''}`.trim();
    const normalizedMessage = rawMessage.toLowerCase();
    const errorCode = `${error?.code || ''}`.trim().toLowerCase();

    if (
      normalizedMessage.includes('error sending recovery email') ||
      errorCode === 'unexpected_failure'
    ) {
      return 'Nao foi possivel enviar o email automatico agora. Gere um link manual no Admin Dashboard ou tente novamente em alguns minutos.';
    }

    if (errorCode === 'over_email_send_rate_limit') {
      return 'A redefinicao de senha foi solicitada ha pouco tempo. Aguarde alguns segundos e tente novamente.';
    }

    return rawMessage || 'Nao foi possivel enviar o email de recuperacao.';
  }, []);

  const syncMockUser = React.useCallback(
    async (seedUser?: Partial<User> | null): Promise<User | null> => {
      if (typeof window === 'undefined') return null;

      const storedUserRaw = window.localStorage.getItem('posthub_user');
      const storedUser = storedUserRaw ? (JSON.parse(storedUserRaw) as User) : null;
      const mergedUser = seedUser
        ? ({
            ...storedUser,
            ...seedUser,
          } as User)
        : storedUser;

      if (!mergedUser?.id) {
        setUser(null);
        return null;
      }

      const onboarding = await onboardingService.getByUserId(mergedUser.id);
      const nextUser: User = {
        id: mergedUser.id,
        name: mergedUser.name || 'User',
        email: mergedUser.email || '',
        website: mergedUser.website ?? null,
        avatarUrl: mergedUser.avatarUrl ?? null,
        notificationPreferences: normalizeNotificationPreferences(
          mergedUser.notificationPreferences
        ),
        currentPlan: mergedUser.currentPlan ?? 'start_7',
        isAdmin: !!mergedUser.isAdmin,
        isWorkspaceMember: !!mergedUser.isWorkspaceMember,
        isMemberOnlyAccount: !!mergedUser.isMemberOnlyAccount,
        trialExpiresAt: mergedUser.trialExpiresAt ?? null,
        accessStatus: mergedUser.accessStatus ?? 'trial_active',
        onboarding: mapOnboardingState(onboarding),
      };

      setUser(nextUser);
      window.localStorage.setItem('posthub_user', JSON.stringify(nextUser));
      return nextUser;
    },
    [mapOnboardingState]
  );

  const mapSessionUser = React.useCallback((sessionUser: any): User => {
    return {
      id: sessionUser.id,
      name: sessionUser.user_metadata?.full_name || 'User',
      email: sessionUser.email || '',
      website: sessionUser.user_metadata?.website ?? null,
      avatarUrl: sessionUser.user_metadata?.avatar_url ?? null,
      notificationPreferences: normalizeNotificationPreferences(
        sessionUser.user_metadata?.notification_preferences
      ),
      currentPlan: null,
      isAdmin: false,
      isWorkspaceMember: false,
      isMemberOnlyAccount: false,
      trialExpiresAt: null,
      accessStatus: 'unknown',
      onboarding: null,
    };
  }, []);

  const getAccessStatus = React.useCallback(
    (params: {
      currentPlan?: string | null;
      isAdmin?: boolean;
      trialExpiresAt?: string | null;
    }): UserAccessStatus => {
      const { currentPlan, isAdmin, trialExpiresAt } = params;

      if (isAdmin) return 'pro';

      const normalizedPlan = (currentPlan || '').toLowerCase().trim();

      if (!normalizedPlan) return 'missing';
      if (normalizedPlan === 'pro') return 'pro';
      if (normalizePlan(normalizedPlan)) return 'paid';

      if (
        normalizedPlan === 'start_7' ||
        normalizedPlan === 'teste' ||
        normalizedPlan === 'trial'
      ) {
        return isTrialStillActive(trialExpiresAt) ? 'trial_active' : 'trial_expired';
      }

      if (normalizedPlan === 'blocked' || normalizedPlan === 'bloqueado') {
        return 'blocked';
      }

      return 'unknown';
    },
    []
  );

  const buildAppUser = React.useCallback(
    async (sessionUser: any): Promise<User> => {
      const baseUser = mapSessionUser(sessionUser);

      if (!supabase) {
        const onboarding = await onboardingService.getByUserId(sessionUser.id);
        return {
          ...baseUser,
          currentPlan: 'start_7',
          accessStatus: 'trial_active',
          onboarding: mapOnboardingState(onboarding),
        };
      }

      try {
        let usuarioRecord = null;
        let onboarding = null;
        let workspaceMembership: {
          role?: string | null;
          full_name?: string | null;
          email?: string | null;
        } | null = null;
        let accountSettings = null;

        try {
          usuarioRecord = await userService.getCurrentUserRecord(
            sessionUser.id,
            sessionUser.email || null
          );
        } catch (error) {
          console.error('Error loading usuarioRecord:', error);
        }

        try {
          onboarding = await onboardingService.getByUserId(sessionUser.id);
        } catch (error) {
          console.error('Error loading onboarding:', error);
        }

        try {
          accountSettings = await accountSettingsService.getByUserId(sessionUser.id);
        } catch (error) {
          console.error('Error loading account settings:', error);
        }

        try {
          const membershipByUserId = await supabase
            .from('workspace_members')
            .select('role, full_name, email')
            .eq('user_id', sessionUser.id)
            .eq('status', 'active')
            .maybeSingle();

          if (membershipByUserId.error) throw membershipByUserId.error;
          workspaceMembership = membershipByUserId.data;

          if (!workspaceMembership && sessionUser.email) {
            const membershipByEmail = await supabase
              .from('workspace_members')
              .select('role, full_name, email')
              .eq('email', sessionUser.email)
              .eq('status', 'active')
              .maybeSingle();

            if (membershipByEmail.error) throw membershipByEmail.error;
            workspaceMembership = membershipByEmail.data;
          }
        } catch (error) {
          console.error('Error loading workspace membership:', error);
        }

        const hasMemberAccountFlag = sessionUser.user_metadata?.workspace_member === true;
        const hasWorkspaceMembership = !!workspaceMembership;
        const isMemberOnlyAccount = hasMemberAccountFlag && hasWorkspaceMembership;
        const isWorkspaceMember = !usuarioRecord?.is_admin && hasWorkspaceMembership;
        const currentPlan = isMemberOnlyAccount
          ? 'pro'
          : usuarioRecord?.current_plan ?? (isWorkspaceMember ? 'pro' : null);
        const isAdmin = isMemberOnlyAccount ? false : !!usuarioRecord?.is_admin;
        const trialExpiresAt = isMemberOnlyAccount ? null : usuarioRecord?.trial_expires_at ?? null;
        const accessStatus = isWorkspaceMember
          ? 'paid'
          : getAccessStatus({
              currentPlan,
              isAdmin,
              trialExpiresAt,
            });

        console.log('[AuthContext] usuarioRecord:', usuarioRecord);
        console.log('[AuthContext] currentPlan:', currentPlan);
        console.log('[AuthContext] trialExpiresAt:', trialExpiresAt);
        console.log('[AuthContext] computed accessStatus:', accessStatus);

        return {
          ...baseUser,
          name:
            accountSettings?.name ||
            (isMemberOnlyAccount ? workspaceMembership?.full_name : usuarioRecord?.nome) ||
            workspaceMembership?.full_name ||
            sessionUser.user_metadata?.full_name ||
            baseUser.name,
          email:
            (isMemberOnlyAccount ? workspaceMembership?.email : usuarioRecord?.email) ||
            workspaceMembership?.email ||
            sessionUser.email ||
            baseUser.email,
          currentPlan,
          isAdmin,
          isWorkspaceMember,
          isMemberOnlyAccount,
          trialExpiresAt,
          accessStatus,
          onboarding: isMemberOnlyAccount ? null : mapOnboardingState(onboarding),
          website:
            accountSettings?.website ??
            sessionUser.user_metadata?.website ??
            baseUser.website ??
            null,
          avatarUrl:
            accountSettings?.avatarUrl ||
            sessionUser.user_metadata?.avatar_url ||
            baseUser.avatarUrl ||
            null,
          notificationPreferences: normalizeNotificationPreferences(
            accountSettings?.notificationPreferences ??
              sessionUser.user_metadata?.notification_preferences
          ),
        };
      } catch (error) {
        console.error('Error building app user:', error);
        return {
          ...baseUser,
          currentPlan: null,
          isAdmin: false,
          isWorkspaceMember: false,
          isMemberOnlyAccount: false,
          trialExpiresAt: null,
          accessStatus: 'missing',
          onboarding: null,
          notificationPreferences: normalizeNotificationPreferences(baseUser.notificationPreferences),
        };
      }
    },
    [getAccessStatus, mapOnboardingState, mapSessionUser]
  );

  const getPostLoginRoute = React.useCallback((appUser: User) => {
    if (appUser.isAdmin) return '/workspace/admin';
    if (appUser.accessStatus === 'pro') return '/workspace/dashboard';
    if (appUser.accessStatus === 'paid') return '/workspace/dashboard';
    if (appUser.accessStatus === 'trial_active') return '/workspace/onboarding';
    return '/login';
  }, []);

  const refreshUser = React.useCallback(async () => {
    if (!supabase) {
      await syncMockUser();
      return;
    }

    const {
      data: { user: sessionUser },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Error refreshing user:', error);
      return;
    }

    if (!sessionUser) {
      setUser(null);
      return;
    }

    const appUser = await buildAppUser(sessionUser);
    setUser(appUser);
  }, [buildAppUser, syncMockUser]);

  const recordTrialAccessForUser = React.useCallback(async (targetUser: User | null) => {
    if (
      !targetUser?.id ||
      targetUser.isAdmin ||
      targetUser.isWorkspaceMember ||
      targetUser.isMemberOnlyAccount ||
      targetUser.accessStatus !== 'trial_active'
    ) {
      return;
    }

    const accessDate = getLocalIsoDate();
    const recordKey = `${targetUser.id}:${accessDate}`;

    if (lastRecordedTrialAccessRef.current === recordKey) {
      return;
    }

    lastRecordedTrialAccessRef.current = recordKey;

    try {
      await trialAccessService.recordDailyAccess(accessDate);
    } catch (error) {
      console.warn('[AuthContext] Could not record trial daily access:', error);
    }
  }, []);

  React.useEffect(() => {
    void recordTrialAccessForUser(user);

    if (!user?.id || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleAccessSignal = () => {
      if (document.visibilityState !== 'visible') return;
      void recordTrialAccessForUser(user);
    };

    window.addEventListener('focus', handleAccessSignal);
    document.addEventListener('visibilitychange', handleAccessSignal);

    return () => {
      window.removeEventListener('focus', handleAccessSignal);
      document.removeEventListener('visibilitychange', handleAccessSignal);
    };
  }, [recordTrialAccessForUser, user]);

  React.useEffect(() => {
    const initializeAuth = async () => {
      if (!supabase) {
        await syncMockUser();
        setIsLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const appUser = await buildAppUser(session.user);
          setUser(appUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();

    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        try {
          if (session?.user) {
            const appUser = await buildAppUser(session.user);
            setUser(appUser);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [buildAppUser, syncMockUser]);

  const login = async (email: string, password?: string) => {
    if (!supabase) {
      const memberCredential = memberAuthStorage.getByEmail(email);

      if (memberCredential) {
        if (!password || memberCredential.password !== password) {
          throw new Error('A senha automática do membro está incorreta.');
        }

        const memberUser: User = {
          id: `member-${memberCredential.profileId}`,
          name: memberCredential.fullName,
          email,
          website: null,
          avatarUrl: null,
          notificationPreferences: normalizeNotificationPreferences(),
          currentPlan: 'pro',
          isAdmin: false,
          isWorkspaceMember: true,
          isMemberOnlyAccount: true,
          trialExpiresAt: null,
          accessStatus: 'paid',
          onboarding: null,
        };
        await syncMockUser(memberUser);
        navigate('/workspace/dashboard');
        return;
      }

      const mockUser: User = {
        id: '1',
        name: 'User',
        email,
        website: null,
        avatarUrl: null,
        notificationPreferences: normalizeNotificationPreferences(),
        currentPlan: 'start_7',
        isAdmin: false,
        isWorkspaceMember: false,
        isMemberOnlyAccount: false,
        trialExpiresAt: null,
        accessStatus: 'trial_active',
        onboarding: null,
      };
      await syncMockUser(mockUser);
      navigate('/workspace/onboarding');
      return;
    }

    try {
      let authError: any = null;

      if (password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        authError = signInError;
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: buildAppUrl('/workspace/dashboard'),
          },
        });
        authError = otpError;
      }

      if (authError) throw authError;

      if (!password) {
        alert('Check your email for the login link!');
        return;
      }

      const {
        data: { user: signedInUser },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (getUserError) {
        throw getUserError;
      }

      console.log('[AuthContext] signedInUser.id:', signedInUser?.id);
      console.log('[AuthContext] signedInUser.email:', signedInUser?.email);

      if (!signedInUser) {
        navigate('/login');
        return;
      }

      const appUser = await buildAppUser(signedInUser);
      setUser(appUser);

      if (
        appUser.accessStatus === 'trial_expired' ||
        appUser.accessStatus === 'blocked' ||
        appUser.accessStatus === 'missing'
      ) {
        throw new Error('Seu teste grátis expirou ou sua conta está bloqueada.');
      }

      navigate(getPostLoginRoute(appUser));
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Login error message:', error?.message);
      console.error('Login error details:', error?.details);
      console.error('Login error hint:', error?.hint);

      const errorMessage = `${error?.message || ''}`.toLowerCase();

      if (errorMessage.includes('email not confirmed')) {
        throw new Error(
          'Confirme seu email antes de entrar. Enviamos um link de confirmação para sua caixa de entrada.'
        );
      }

      if (errorMessage.includes('invalid login credentials')) {
        throw new Error(
          'Email ou senha automática inválidos. Gere um novo acesso do membro nas configurações e tente novamente.'
        );
      }

      throw error;
    }
  };

  const signup = async (
    name: string,
    email: string,
    password?: string,
    profileName?: string
  ): Promise<SignupResult> => {
    const sanitizedEmail = email.trim().toLowerCase();

    if (!supabase) {
      const mockUser: User = {
        id: '1',
        name,
        email: sanitizedEmail,
        website: null,
        avatarUrl: null,
        notificationPreferences: normalizeNotificationPreferences(),
        currentPlan: 'start_7',
        isAdmin: false,
        isWorkspaceMember: false,
        isMemberOnlyAccount: false,
        trialExpiresAt: null,
        accessStatus: 'trial_active',
        onboarding: null,
      };
      await syncMockUser(mockUser);
      navigate('/workspace/onboarding');
      return {
        requiresEmailConfirmation: false,
        email: sanitizedEmail,
      };
    }

    try {
      let authError: any = null;
      let signedUpUser: any = null;
      let signedUpSession: any = null;

      const sanitizedName = name.trim();
      const sanitizedProfileName = (profileName || name).trim();

      if (password) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password,
          options: {
            data: {
              full_name: sanitizedName,
              initial_profile_name: sanitizedProfileName,
            },
            emailRedirectTo: buildAppUrl('/workspace/onboarding'),
          },
        });
        authError = signUpError;
        signedUpUser = data?.user ?? null;
        signedUpSession = data?.session ?? null;
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: sanitizedEmail,
          options: {
            data: {
              full_name: sanitizedName,
              initial_profile_name: sanitizedProfileName,
            },
            emailRedirectTo: buildAppUrl('/workspace/onboarding'),
          },
        });
        authError = otpError;
      }

      if (authError) throw authError;

      if (!password || !signedUpSession || !signedUpUser) {
        return {
          requiresEmailConfirmation: true,
          email: signedUpUser?.email || sanitizedEmail,
        };
      }

      let appUser: User | null = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        appUser = await buildAppUser(signedUpUser);

        if (
          appUser.accessStatus &&
          appUser.accessStatus !== 'missing' &&
          appUser.accessStatus !== 'unknown'
        ) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      if (!appUser) {
        throw new Error('Sua conta foi criada, mas não foi possível carregar seus dados.');
      }

      setUser(appUser);

      if (
        appUser.accessStatus === 'trial_expired' ||
        appUser.accessStatus === 'blocked' ||
        appUser.accessStatus === 'missing'
      ) {
        throw new Error('Sua conta foi criada, mas o acesso não foi liberado corretamente.');
      }

      navigate('/workspace/onboarding');
      return {
        requiresEmailConfirmation: false,
        email: appUser.email || sanitizedEmail,
      };
    } catch (error: any) {
      console.error('Signup error:', error);
      console.error('Signup error message:', error?.message);
      console.error('Signup error details:', error?.details);
      console.error('Signup error hint:', error?.hint);
      const normalizedMessage = normalizeAuthErrorMessage(error);

      if (normalizedMessage && normalizedMessage !== error?.message) {
        throw new Error(normalizedMessage);
      }

      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    if (!supabase) {
      throw new Error('A recuperação de senha não está disponível sem o Supabase configurado.');
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: buildAppUrl('/reset-password'),
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      throw new Error(normalizePasswordResetErrorMessage(error));
    }
  };

  const updatePassword = async (password: string) => {
    if (!supabase) {
      throw new Error('A atualização de senha não está disponível sem o Supabase configurado.');
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw error;
    }
  };

  const updateAccountProfile = async (input: {
    name: string;
    website?: string | null;
    avatarUrl?: string | null;
    notificationPreferences?: Partial<UserNotificationPreferences> | null;
  }) => {
    if (!user) {
      throw new Error('Você precisa estar autenticado para atualizar o perfil.');
    }

    const name = input.name.trim();

    if (!name) {
      throw new Error('Informe seu nome.');
    }

    const website = input.website ? normalizeWebsite(input.website) : '';
    const avatarUrl = input.avatarUrl ?? user.avatarUrl ?? null;
    const notificationPreferences = normalizeNotificationPreferences(
      input.notificationPreferences ?? user.notificationPreferences
    );
    const nextSettings = {
      userId: user.id,
      name,
      website: website || null,
      avatarUrl,
      notificationPreferences,
    };
    let savedSettings = nextSettings;

    if (supabase) {
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          full_name: nextSettings.name,
          website: nextSettings.website,
          avatar_url: nextSettings.avatarUrl,
          notification_preferences: nextSettings.notificationPreferences,
        },
      });

      if (authUpdateError) {
        throw authUpdateError;
      }

      try {
        savedSettings = await accountSettingsService.save(nextSettings);
      } catch (error) {
        console.warn('[AuthContext] Could not persist user_account_settings:', error);
      }

      try {
        const { error: usuarioUpdateError } = await supabase
          .from('usuarios')
          .update({ nome: nextSettings.name })
          .eq('id', user.id);

        if (usuarioUpdateError) {
          console.warn('[AuthContext] Could not update usuarios.nome:', usuarioUpdateError);
        }
      } catch (error) {
        console.warn('[AuthContext] Unexpected error updating usuarios.nome:', error);
      }

      if (user.isMemberOnlyAccount) {
        try {
          const { error: memberUpdateError } = await supabase
            .from('workspace_members')
            .update({ full_name: nextSettings.name })
            .eq('user_id', user.id);

          if (memberUpdateError) {
            console.warn('[AuthContext] Could not update workspace member name:', memberUpdateError);
          }
        } catch (error) {
          console.warn('[AuthContext] Unexpected error updating workspace member name:', error);
        }
      }
    } else {
      savedSettings = await accountSettingsService.save(nextSettings);
    }

    const nextUser: User = {
      ...user,
      name: savedSettings.name,
      website: savedSettings.website,
      avatarUrl: savedSettings.avatarUrl,
      notificationPreferences: savedSettings.notificationPreferences,
    };

    setUser(nextUser);

    if (!supabase && typeof window !== 'undefined') {
      window.localStorage.setItem('posthub_user', JSON.stringify(nextUser));
    }
  };

  const logout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('posthub_user');
      onboardingService.clearMockOnboarding(user?.id);
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        requestPasswordReset,
        updatePassword,
        updateAccountProfile,
        logout,
        isAuthenticated: !!user,
        isLoading,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
