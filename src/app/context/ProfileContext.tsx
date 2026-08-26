import * as React from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../../shared/utils/supabase';
import { TeamMemberRole } from '../../shared/constants/workspaceMembers';
import {
  profileExtraBillingService,
  type ProfileExtraStatus,
} from '../../services/profile-extra-billing.service';

export interface Profile {
  id: string;
  name: string;
  role: TeamMemberRole;
  avatar_url?: string;
}

interface ProfileAccessSnapshot {
  ownedProfilesCount: number;
  availableProfileSlots: number;
  profileExtraStatus: ProfileExtraStatus;
}

interface ProfileContextType {
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile) => void;
  profiles: Profile[];
  isLoadingProfiles: boolean;
  ownedProfilesCount: number;
  profileExtraStatus: ProfileExtraStatus;
  availableProfileSlots: number;
  canCreateProfile: boolean;
  reloadProfiles: () => Promise<ProfileAccessSnapshot>;
  createProfile: (profileName: string) => Promise<void>;
  updateProfileName: (profileId: string, profileName: string) => Promise<void>;
}

const ProfileContext = React.createContext<ProfileContextType | undefined>(undefined);

const ACTIVE_PROFILE_KEY = 'posthub_active_profile_id';
const EMPTY_PROFILE_EXTRA_STATUS: ProfileExtraStatus = {
  hasAvailableSlot: false,
  checkoutPending: false,
  hasLinkedExtraProfiles: false,
};

export const canManageProfileName = (profile?: Profile | null) =>
  profile?.role === 'owner' || profile?.role === 'admin';

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [activeProfile, setActiveProfileState] = React.useState<Profile | null>(null);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = React.useState(false);
  const [ownedProfilesCount, setOwnedProfilesCount] = React.useState(0);
  const [profileExtraStatus, setProfileExtraStatus] =
    React.useState<ProfileExtraStatus>(EMPTY_PROFILE_EXTRA_STATUS);

  const setActiveProfile = React.useCallback((profile: Profile) => {
    setActiveProfileState(profile);
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
  }, []);

  const clearProfileState = React.useCallback(() => {
    setProfiles([]);
    setOwnedProfilesCount(0);
    setProfileExtraStatus(EMPTY_PROFILE_EXTRA_STATUS);
    setActiveProfileState(null);
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }, []);

  const loadProfileExtraStatus = React.useCallback(async () => {
    try {
      return await profileExtraBillingService.getProfileExtraStatus();
    } catch (error) {
      console.warn('[ProfileContext] Não foi possível carregar status de perfil adicional.', error);
      return EMPTY_PROFILE_EXTRA_STATUS;
    }
  }, []);

  const loadProfiles = React.useCallback(async (): Promise<ProfileAccessSnapshot> => {
    if (!isAuthenticated || !user || !supabase) {
      clearProfileState();
      return {
        ownedProfilesCount: 0,
        availableProfileSlots: 0,
        profileExtraStatus: EMPTY_PROFILE_EXTRA_STATUS,
      };
    }

    setIsLoadingProfiles(true);

    try {
      const shouldIgnoreOwnedProfiles = !!user.isMemberOnlyAccount;
      let ownProfilesData: any[] = [];
      let ownedProfilesCount = 0;
      let nextProfileExtraStatus = EMPTY_PROFILE_EXTRA_STATUS;

      if (!shouldIgnoreOwnedProfiles) {
        const { count, error: countError } = await supabase
          .from('client_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (countError) {
          throw countError;
        }

        ownedProfilesCount = count ?? 0;

        const { data, error } = await supabase
          .from('client_profiles')
          .select('id, profile_name, avatar_url, is_default, created_at, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        ownProfilesData = data ?? [];
        nextProfileExtraStatus = await loadProfileExtraStatus();
      }

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
          .select('id, profile_name, avatar_url, is_default, created_at, is_active')
          .in('id', sharedProfileIds)
          .eq('is_active', true)
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
      const includedProfileSlotAvailable =
        !shouldIgnoreOwnedProfiles && ownedProfilesCount === 0 ? 1 : 0;
      const availableProfileSlots =
        includedProfileSlotAvailable + (nextProfileExtraStatus.hasAvailableSlot ? 1 : 0);

      setProfiles(mappedProfiles);
      setOwnedProfilesCount(ownedProfilesCount);
      setProfileExtraStatus(nextProfileExtraStatus);

      if (mappedProfiles.length === 0) {
        setActiveProfileState(null);
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
        return {
          ownedProfilesCount,
          availableProfileSlots,
          profileExtraStatus: nextProfileExtraStatus,
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
        availableProfileSlots,
        profileExtraStatus: nextProfileExtraStatus,
      };
    } catch (error) {
      console.error('Error loading profiles:', error);
      clearProfileState();
      return {
        ownedProfilesCount: 0,
        availableProfileSlots: 0,
        profileExtraStatus: EMPTY_PROFILE_EXTRA_STATUS,
      };
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [clearProfileState, isAuthenticated, loadProfileExtraStatus, user]);

  const createProfile = React.useCallback(
    async (profileName: string) => {
      if (!user || !supabase) {
        throw new Error('Você precisa estar autenticado para criar um perfil.');
      }

      const sanitizedProfileName = profileName.trim();

      if (!sanitizedProfileName) {
        throw new Error('Informe um nome para o novo perfil.');
      }

      const availableProfileSlots =
        (ownedProfilesCount === 0 && !user.isMemberOnlyAccount ? 1 : 0) +
        (profileExtraStatus.hasAvailableSlot ? 1 : 0);

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
    [loadProfiles, ownedProfilesCount, profileExtraStatus.hasAvailableSlot, user]
  );

  const updateProfileName = React.useCallback(
    async (profileId: string, profileName: string) => {
      if (!user || !supabase) {
        throw new Error('Você precisa estar autenticado para editar um perfil.');
      }

      const sanitizedProfileName = profileName.trim();

      if (!sanitizedProfileName) {
        throw new Error('Informe um nome para o perfil.');
      }

      const currentProfile = profiles.find((profile) => profile.id === profileId);

      if (!currentProfile) {
        throw new Error('Perfil não encontrado nesta conta.');
      }

      if (!canManageProfileName(currentProfile)) {
        throw new Error('Você não tem permissão para editar este perfil.');
      }

      const { data, error } = await supabase
        .from('client_profiles')
        .update({ profile_name: sanitizedProfileName })
        .eq('id', profileId)
        .select('id, profile_name, avatar_url')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Não foi possível editar este perfil.');
      }

      const nextProfileName = data.profile_name || sanitizedProfileName;

      setProfiles((currentProfiles) =>
        currentProfiles.map((profile) =>
          profile.id === profileId
            ? {
                ...profile,
                name: nextProfileName,
                avatar_url: data.avatar_url ?? profile.avatar_url,
              }
            : profile
        )
      );

      setActiveProfileState((currentProfile) =>
        currentProfile?.id === profileId
          ? {
              ...currentProfile,
              name: nextProfileName,
              avatar_url: data.avatar_url ?? currentProfile.avatar_url,
            }
          : currentProfile
      );
    },
    [profiles, user]
  );

  React.useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const availableProfileSlots = React.useMemo(
    () =>
      (ownedProfilesCount === 0 && !user?.isMemberOnlyAccount ? 1 : 0) +
      (profileExtraStatus.hasAvailableSlot ? 1 : 0),
    [ownedProfilesCount, profileExtraStatus.hasAvailableSlot, user?.isMemberOnlyAccount]
  );

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        setActiveProfile,
        profiles,
        isLoadingProfiles,
        ownedProfilesCount,
        profileExtraStatus,
        availableProfileSlots,
        canCreateProfile: availableProfileSlots > 0,
        reloadProfiles: loadProfiles,
        createProfile,
        updateProfileName,
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
