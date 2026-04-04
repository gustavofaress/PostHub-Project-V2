import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../shared/utils/supabase';
import { onboardingService } from '../../services/onboarding.service';
import { userService } from '../../services/user.service';

interface UserOnboardingState {
  work_model: string | null;
  operation_size: string | null;
  current_process: string | null;
  quiz_completed: boolean;
  setup_completed: boolean;
}

type UserAccessStatus =
  | 'trial_active'
  | 'trial_expired'
  | 'pro'
  | 'blocked'
  | 'missing'
  | 'unknown';

interface User {
  id: string;
  name: string;
  email: string;
  currentPlan?: string | null;
  isAdmin?: boolean;
  trialExpiresAt?: string | null;
  accessStatus?: UserAccessStatus;
  onboarding?: UserOnboardingState | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password?: string,
    profileName?: string
  ) => Promise<void>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const navigate = useNavigate();

  const mapSessionUser = React.useCallback((sessionUser: any): User => {
    return {
      id: sessionUser.id,
      name: sessionUser.user_metadata?.full_name || 'User',
      email: sessionUser.email || '',
      currentPlan: null,
      isAdmin: false,
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
      if (!currentPlan) return 'missing';
      if (currentPlan === 'pro') return 'pro';

      if (currentPlan === 'start_7') {
        return isTrialStillActive(trialExpiresAt) ? 'trial_active' : 'trial_expired';
      }

      if (currentPlan === 'blocked') return 'blocked';

      return 'unknown';
    },
    []
  );

  const buildAppUser = React.useCallback(
    async (sessionUser: any): Promise<User> => {
      const baseUser = mapSessionUser(sessionUser);

      if (!supabase) {
        return {
          ...baseUser,
          currentPlan: 'start_7',
          accessStatus: 'trial_active',
        };
      }

      try {
        const [usuarioRecord, onboarding] = await Promise.all([
          userService.getCurrentUserRecord(sessionUser.id),
          onboardingService.getByUserId(sessionUser.id),
        ]);

        const currentPlan = usuarioRecord?.current_plan ?? null;
        const isAdmin = !!usuarioRecord?.is_admin;
        const trialExpiresAt = usuarioRecord?.trial_expires_at ?? null;
        const accessStatus = getAccessStatus({
          currentPlan,
          isAdmin,
          trialExpiresAt,
        });

        return {
          ...baseUser,
          name:
            usuarioRecord?.full_name ||
            usuarioRecord?.nome ||
            sessionUser.user_metadata?.full_name ||
            baseUser.name,
          email: usuarioRecord?.email || sessionUser.email || baseUser.email,
          currentPlan,
          isAdmin,
          trialExpiresAt,
          accessStatus,
          onboarding: onboarding
            ? {
                work_model: onboarding.work_model,
                operation_size: onboarding.operation_size,
                current_process: onboarding.current_process,
                quiz_completed: onboarding.quiz_completed,
                setup_completed: onboarding.setup_completed,
              }
            : null,
        };
      } catch (error) {
        console.error('Error building app user:', error);
        return {
          ...baseUser,
          currentPlan: null,
          isAdmin: false,
          trialExpiresAt: null,
          accessStatus: 'missing',
          onboarding: null,
        };
      }
    },
    [getAccessStatus, mapSessionUser]
  );

  const getPostLoginRoute = React.useCallback((appUser: User) => {
    if (appUser.isAdmin) return '/workspace/admin';
    if (appUser.accessStatus === 'pro') return '/workspace/dashboard';

    if (appUser.accessStatus === 'trial_active') {
      return '/workspace/onboarding';
    }

    return '/login';
  }, []);

  const refreshUser = React.useCallback(async () => {
    if (!supabase) return;

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
  }, [buildAppUser]);

  React.useEffect(() => {
    const initializeAuth = async () => {
      if (!supabase) {
        const storedUser = localStorage.getItem('posthub_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
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
  }, [buildAppUser]);

  const login = async (email: string, password?: string) => {
    if (!supabase) {
      const mockUser: User = {
        id: '1',
        name: 'User',
        email,
        currentPlan: 'start_7',
        isAdmin: false,
        trialExpiresAt: null,
        accessStatus: 'trial_active',
        onboarding: null,
      };
      setUser(mockUser);
      localStorage.setItem('posthub_user', JSON.stringify(mockUser));
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
            emailRedirectTo: window.location.origin + '/workspace/dashboard',
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
      throw error;
    }
  };

  const signup = async (
    name: string,
    email: string,
    password?: string,
    profileName?: string
  ) => {
    if (!supabase) {
      const mockUser: User = {
        id: '1',
        name,
        email,
        currentPlan: 'start_7',
        isAdmin: false,
        trialExpiresAt: null,
        accessStatus: 'trial_active',
        onboarding: null,
      };
      setUser(mockUser);
      localStorage.setItem('posthub_user', JSON.stringify(mockUser));
      navigate('/workspace/onboarding');
      return;
    }

    try {
      let authError: any = null;

      const sanitizedName = name.trim();
      const sanitizedProfileName = (profileName || name).trim();

      if (password) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: sanitizedName,
              initial_profile_name: sanitizedProfileName,
            },
            emailRedirectTo: window.location.origin + '/workspace/onboarding',
          },
        });
        authError = signUpError;
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            data: {
              full_name: sanitizedName,
              initial_profile_name: sanitizedProfileName,
            },
            emailRedirectTo: window.location.origin + '/workspace/onboarding',
          },
        });
        authError = otpError;
      }

      if (authError) throw authError;

      if (!password) {
        alert('Check your email for the signup link!');
        return;
      }

      const {
        data: { user: signedUpUser },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (getUserError) {
        throw getUserError;
      }

      if (!signedUpUser) {
        navigate('/workspace/onboarding');
        return;
      }

      const appUser = await buildAppUser(signedUpUser);
      setUser(appUser);

      if (
        appUser.accessStatus === 'trial_expired' ||
        appUser.accessStatus === 'blocked' ||
        appUser.accessStatus === 'missing'
      ) {
        throw new Error('Sua conta foi criada, mas o acesso não foi liberado corretamente.');
      }

      navigate('/workspace/onboarding');
    } catch (error: any) {
      console.error('Signup error:', error);
      console.error('Signup error message:', error?.message);
      console.error('Signup error details:', error?.details);
      console.error('Signup error hint:', error?.hint);
      throw error;
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
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
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
