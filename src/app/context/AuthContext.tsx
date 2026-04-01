import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../shared/utils/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  signup: (name: string, email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      if (!supabase) {
        // Fallback to localStorage if no Supabase
        const storedUser = localStorage.getItem('posthub_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || 'User',
            email: session.user.email || '',
          });
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    if (!supabase) return;

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || 'User',
          email: session.user.email || '',
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password?: string) => {
    if (!supabase) {
      // Fallback to mock behavior if Supabase is not configured
      const mockUser = { id: '1', name: 'User', email };
      setUser(mockUser);
      localStorage.setItem('posthub_user', JSON.stringify(mockUser));
      navigate('/workspace/dashboard');
      return;
    }

    try {
      let error;
      if (password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        error = signInError;
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin + '/workspace/dashboard',
          }
        });
        error = otpError;
      }
      
      if (error) throw error;
      
      if (!password) {
        alert('Check your email for the login link!');
      } else {
        navigate('/workspace/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (name: string, email: string, password?: string) => {
    if (!supabase) {
      // Fallback to mock behavior
      const mockUser = { id: '1', name, email };
      setUser(mockUser);
      localStorage.setItem('posthub_user', JSON.stringify(mockUser));
      navigate('/workspace/onboarding');
      return;
    }

    try {
      let error;
      if (password) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin + '/workspace/onboarding',
          }
        });
        error = signUpError;
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin + '/workspace/onboarding',
          }
        });
        error = otpError;
      }
      
      if (error) throw error;

      if (!password) {
        alert('Check your email for the signup link!');
      } else {
        navigate('/workspace/onboarding');
      }
    } catch (error) {
      console.error('Signup error:', error);
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
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user, isLoading }}>
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
