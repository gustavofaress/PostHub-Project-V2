import { TeamMember } from '../../shared/constants/workspaceMembers';

export type { TeamMember } from '../../shared/constants/workspaceMembers';

const STORAGE_KEY = 'posthub_workspace_members_v1';

type TeamMembersMap = Record<string, TeamMember[]>;

const readStorage = (): TeamMembersMap => {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as TeamMembersMap) : {};
  } catch (error) {
    console.error('Failed to read team members from localStorage:', error);
    return {};
  }
};

const writeStorage = (value: TeamMembersMap) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to persist team members to localStorage:', error);
  }
};

export const teamMembersStorage = {
  list(workspaceKey: string) {
    const data = readStorage();
    return data[workspaceKey] ?? [];
  },

  save(workspaceKey: string, members: TeamMember[]) {
    const data = readStorage();
    data[workspaceKey] = members;
    writeStorage(data);
  },
};
