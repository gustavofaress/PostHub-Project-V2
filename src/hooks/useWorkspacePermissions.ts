import * as React from 'react';
import { useAuth } from '../app/context/AuthContext';
import { useProfile } from '../app/context/ProfileContext';
import {
  TeamPermissionId,
  WORKSPACE_PERMISSION_OPTIONS,
} from '../shared/constants/workspaceMembers';
import { supabase } from '../shared/utils/supabase';

type PermissionMap = Record<TeamPermissionId, boolean>;

const buildDefaultPermissions = (value: boolean): PermissionMap =>
  WORKSPACE_PERMISSION_OPTIONS.reduce((acc, permission) => {
    acc[permission.id] = value;
    return acc;
  }, {} as PermissionMap);

export const useWorkspacePermissions = () => {
  const { user } = useAuth();
  const { activeProfile } = useProfile();

  const [permissions, setPermissions] = React.useState<PermissionMap>(buildDefaultPermissions(false));
  const [canManageMembers, setCanManageMembers] = React.useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = React.useState(false);
  const [resolvedProfileId, setResolvedProfileId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeProfile?.id || !user) {
      setPermissions(buildDefaultPermissions(false));
      setCanManageMembers(false);
      setResolvedProfileId(null);
      setIsLoadingPermissions(false);
      return;
    }

    if (!supabase) {
      setPermissions(buildDefaultPermissions(true));
      setCanManageMembers(true);
      setResolvedProfileId(activeProfile.id);
      setIsLoadingPermissions(false);
      return;
    }

    if (activeProfile.role === 'owner') {
      setPermissions(buildDefaultPermissions(true));
      setCanManageMembers(true);
      setResolvedProfileId(activeProfile.id);
      setIsLoadingPermissions(false);
      return;
    }

    let isMounted = true;

    setPermissions(buildDefaultPermissions(false));
    setCanManageMembers(false);
    setResolvedProfileId(null);

    const loadPermissions = async () => {
      setIsLoadingPermissions(true);

      try {
        const permissionChecks = await Promise.all(
          WORKSPACE_PERMISSION_OPTIONS.map(async (permission) => {
            const { data, error } = await supabase.rpc('current_user_has_workspace_permission', {
              target_profile_id: activeProfile.id,
              required_permission: permission.id,
            });

            if (error) throw error;

            return [permission.id, !!data] as const;
          })
        );

        const { data: manageMembersData, error: manageMembersError } = await supabase.rpc(
          'current_user_can_manage_workspace_members',
          {
            target_profile_id: activeProfile.id,
          }
        );

        if (manageMembersError) throw manageMembersError;

        if (!isMounted) return;

        setPermissions(
          permissionChecks.reduce((acc, [permissionId, value]) => {
            acc[permissionId] = value;
            return acc;
          }, {} as PermissionMap)
        );
        setCanManageMembers(!!manageMembersData);
        setResolvedProfileId(activeProfile.id);
      } catch (error) {
        console.error('[WorkspacePermissions] Failed to load permissions:', error);
        if (!isMounted) return;
        setPermissions(buildDefaultPermissions(false));
        setCanManageMembers(false);
        setResolvedProfileId(activeProfile.id);
      } finally {
        if (isMounted) {
          setIsLoadingPermissions(false);
        }
      }
    };

    void loadPermissions();

    return () => {
      isMounted = false;
    };
  }, [activeProfile?.id, activeProfile?.role, user]);

  const isScopedToActiveProfile =
    !activeProfile?.id ||
    !supabase ||
    activeProfile.role === 'owner' ||
    resolvedProfileId === activeProfile.id;

  return {
    permissions,
    canAccess: (permissionId: TeamPermissionId) =>
      isScopedToActiveProfile ? permissions[permissionId] ?? false : false,
    canManageMembers: isScopedToActiveProfile ? canManageMembers : false,
    isLoadingPermissions,
  };
};
