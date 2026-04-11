import * as React from 'react';
import { useProfile } from '../app/context/ProfileContext';
import { workspaceMembersService } from '../services/workspace-members.service';
import type { TeamMember } from '../shared/constants/workspaceMembers';

export const useWorkspaceMembers = () => {
  const { activeProfile } = useProfile();
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false);

  const loadMembers = React.useCallback(async () => {
    if (!activeProfile?.id) {
      setMembers([]);
      return;
    }

    setIsLoadingMembers(true);

    try {
      const data = await workspaceMembersService.list(activeProfile.id);
      setMembers(data);
    } catch (error) {
      console.error('[useWorkspaceMembers] Failed to load members:', error);
      setMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [activeProfile?.id]);

  React.useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  return {
    members,
    activeMembers: members.filter((member) => member.status !== 'disabled'),
    isLoadingMembers,
    reloadMembers: loadMembers,
  };
};
