import * as React from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../../shared/utils/supabase';

interface Profile {
  id: string;
  name: string;
  role: string;
  avatar_url?: string;
}

interface ProfileContextType {
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile) => void;
  profiles: Profile[];
  isLoadingProfiles: boolean;
  reloadProfiles: () => Promise<void>;
}

const ProfileContext = React.createContext<ProfileContextType | undefined>(undefined);

const ACTIVE_PROFILE_KEY = 'posthub_active_profile_id';

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [activeProfile, setActiveProfileState] = React.useState<Profile | null>(null);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = React.useState(false);

  const setActiveProfile = React.useCallback((profile: Profile) => {
    setActiveProfileState(profile);
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
  }, []);

  const clearProfileState = React.useCallback(() => {
    setProfiles([]);
    setActiveProfileState(null);
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }, []);

  const loadProfiles = React.useCallback(async () => {
    // Sem auth real ou sem Supabase real: não inventa perfil
    if (!isAuthenticated || !user || !supabase) {
      clearProfileState();
      return;
    }

    setIsLoadingProfiles(true);

    try {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('id, profile_name, avatar_url, is_default, created_at')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      const mappedProfiles: Profile[] = (data ?? []).map((profile) => ({
        id: profile.id,
        name: profile.profile_name || 'Sem nome',
        role: 'owner',
        avatar_url: profile.avatar_url ?? undefined,
      }));

      setProfiles(mappedProfiles);

      if (mappedProfiles.length === 0) {
        setActiveProfileState(null);
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
        return;
      }

      const savedProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY);
      const restoredProfile = savedProfileId
        ? mappedProfiles.find((profile) => profile.id === savedProfileId) ?? null
        : null;

      const nextActiveProfile = restoredProfile ?? mappedProfiles[0];

      setActiveProfileState(nextActiveProfile);
      localStorage.setItem(ACTIVE_PROFILE_KEY, nextActiveProfile.id);
    } catch (error) {
      console.error('Error loading profiles:', error);
      clearProfileState();
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [clearProfileState, isAuthenticated, user]);

  React.useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        setActiveProfile,
        profiles,
        isLoadingProfiles,
        reloadProfiles: loadProfiles,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = React.useContext(ProfileContext);

  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }

  return context;
};