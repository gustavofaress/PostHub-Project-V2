import * as React from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../../shared/utils/supabase';
import { TeamMemberRole } from '../../shared/constants/workspaceMembers';
import { INCLUDED_PROFILES_PER_ACCOUNT } from '../../shared/constants/plans';

interface Profile {
  id: string;
  name: string;
  role: TeamMemberRole;
  avatar_url?: string;
}

interface ProfileAccessSnapshot {
  ownedProfilesCount: number;
  purchasedProfileCredits: number;
  availableProfileSlots: number;
}

interface ProfileContextType {
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile) => void;
  profiles: Profile[];
  isLoadingProfiles: boolean;
  ownedProfilesCount: number;
  purchasedProfileCredits: number;
  availableProfileSlots: number;
  canCreateProfile: boolean;
  reloadProfiles: () => Promise<ProfileAccessSnapshot>;
  createProfile: (profileName: string) => Promise<void>;
}

const ProfileContext = React.createContext<ProfileContextType | undefined>(undefined);

const ACTIVE_PROFILE_KEY = 'posthub_active_profile_id';

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [activeProfile, setActiveProfileState] = React.useState<Profile | null>(null);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = React.useState(false);
  const [purchasedProfileCredits, setPurchasedProfileCredits] = React.useState(0);

  const setActiveProfile = React.useCallback((profile: Profile) => {
    setActiveProfileState(profile);
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
  }, []);

  const clearProfileState = React.useCallback(() => {
    setProfiles([]);
    setPurchasedProfileCredits(0);
    setActiveProfileState(null);
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }, []);

  const loadProfiles = React.useCallback(async (): Promise<ProfileAccessSnapshot> => {
    if (!isAuthenticated || !user || !supabase) {
      clearProfileState();
      return {
        ownedProfilesCount: 0,
        purchasedProfileCredits: 0,
        availableProfileSlots: 0,
      };
    }

    setIsLoadingProfiles(true);

    try {
      const { data: ownProfilesData, error: ownProfilesError } = await supabase
        .from('client_profiles')
        .select('id, profile_name, avatar_url, is_default, created_at')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (ownProfilesError) {
        throw ownProfilesError;
      }

      const { data: purchaseCreditsData, error: purchaseCreditsError } = await supabase
        .from('profile_purchase_credits')
        .select('quantity')
        .eq('user_id', user.id);

      if (purchaseCreditsError) {
        throw purchaseCreditsError;
      }

      const purchasedCredits = (purchaseCreditsData ?? []).reduce((total, purchase) => {
        return total + Math.max(Number(purchase.quantity) || 0, 0);
      }, 0);

      const ownProfiles: Profile[] = (ownProfilesData ?? []).map((profile) => ({
        id: profile.id,
        name: profile.profile_name || 'Sem nome',
        role: 'owner',
        avatar_url: profile.avatar_url ?? undefined,
      }));

      const { data: membershipsData, error: membershipsError } = await supabase
        .from('workspace_members')
        .select('profile_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (membershipsError) {
        throw membershipsError;
      }

      const sharedProfileIds = Array.from(
        new Set(
          (membershipsData ?? [])
            .map((membership) => membership.profile_id as string)
            .filter((profileId) => !ownProfiles.some((profile) => profile.id === profileId))
        )
      );

      let sharedProfiles: Profile[] = [];

      if (sharedProfileIds.length > 0) {
        const { data: sharedProfilesData, error: sharedProfilesError } = await supabase
          .from('client_profiles')
          .select('id, profile_name, avatar_url, is_default, created_at')
          .in('id', sharedProfileIds)
          .order('created_at', { ascending: true });

        if (sharedProfilesError) {
          throw sharedProfilesError;
        }

        sharedProfiles = (sharedProfilesData ?? []).map((profile) => {
          const membership = (membershipsData ?? []).find(
            (currentMembership) => currentMembership.profile_id === profile.id
          );

          return {
            id: profile.id,
            name: profile.profile_name || 'Sem nome',
            role: (membership?.role as TeamMemberRole) || 'editor',
            avatar_url: profile.avatar_url ?? undefined,
          };
        });
      }

      const mappedProfiles = [...ownProfiles, ...sharedProfiles];
      const ownedProfilesCount = ownProfiles.length;
      const availableProfileSlots = Math.max(
        INCLUDED_PROFILES_PER_ACCOUNT + purchasedCredits - ownedProfilesCount,
        0
      );

      setProfiles(mappedProfiles);
      setPurchasedProfileCredits(purchasedCredits);

      if (mappedProfiles.length === 0) {
        setActiveProfileState(null);
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
        return {
          ownedProfilesCount,
          purchasedProfileCredits: purchasedCredits,
          availableProfileSlots,
        };
      }

      const savedProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY);
      const restoredProfile = savedProfileId
        ? mappedProfiles.find((profile) => profile.id === savedProfileId) ?? null
        : null;

      const nextActiveProfile = restoredProfile ?? mappedProfiles[0];

      setActiveProfileState(nextActiveProfile);
      localStorage.setItem(ACTIVE_PROFILE_KEY, nextActiveProfile.id);
      return {
        ownedProfilesCount,
        purchasedProfileCredits: purchasedCredits,
        availableProfileSlots,
      };
    } catch (error) {
      console.error('Error loading profiles:', error);
      clearProfileState();
      return {
        ownedProfilesCount: 0,
        purchasedProfileCredits: 0,
        availableProfileSlots: 0,
      };
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [clearProfileState, isAuthenticated, user]);

  const createProfile = React.useCallback(
    async (profileName: string) => {
      if (!user || !supabase) {
        throw new Error('Você precisa estar autenticado para criar um perfil.');
      }

      const sanitizedProfileName = profileName.trim();

      if (!sanitizedProfileName) {
        throw new Error('Informe um nome para o novo perfil.');
      }

      const ownedProfilesCount = profiles.filter((profile) => profile.role === 'owner').length;
      const availableProfileSlots = Math.max(
        INCLUDED_PROFILES_PER_ACCOUNT + purchasedProfileCredits - ownedProfilesCount,
        0
      );

      if (availableProfileSlots <= 0) {
        throw new Error(
          'Sua conta não possui vagas disponíveis para criar um novo perfil. Finalize a compra primeiro.'
        );
      }

      const { data, error } = await supabase
        .from('client_profiles')
        .insert([
          {
            user_id: user.id,
            profile_name: sanitizedProfileName,
            is_default: ownedProfilesCount === 0,
          },
        ])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      localStorage.setItem(ACTIVE_PROFILE_KEY, data.id);
      await loadProfiles();
    },
    [loadProfiles, profiles, purchasedProfileCredits, user]
  );

  React.useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const ownedProfilesCount = React.useMemo(
    () => profiles.filter((profile) => profile.role === 'owner').length,
    [profiles]
  );

  const availableProfileSlots = React.useMemo(
    () =>
      Math.max(
        INCLUDED_PROFILES_PER_ACCOUNT + purchasedProfileCredits - ownedProfilesCount,
        0
      ),
    [ownedProfilesCount, purchasedProfileCredits]
  );

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        setActiveProfile,
        profiles,
        isLoadingProfiles,
        ownedProfilesCount,
        purchasedProfileCredits,
        availableProfileSlots,
        canCreateProfile: availableProfileSlots > 0,
        reloadProfiles: loadProfiles,
        createProfile,
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
