import type {
  TeamMemberRole,
  TeamPermissionId,
} from '../../shared/constants/workspaceMembers';

const STORAGE_KEY = 'posthub_workspace_member_credentials_v1';

export interface StoredMemberCredential {
  email: string;
  password: string;
  fullName: string;
  profileId: string;
  role: TeamMemberRole;
  permissions: TeamPermissionId[];
  createdAt: string;
}

const readStorage = (): Record<string, StoredMemberCredential> => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredMemberCredential>) : {};
  } catch (error) {
    console.error('Failed to read member credentials from localStorage:', error);
    return {};
  }
};

const writeStorage = (value: Record<string, StoredMemberCredential>) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to write member credentials to localStorage:', error);
  }
};

export const memberAuthStorage = {
  save(credential: StoredMemberCredential) {
    const data = readStorage();
    data[credential.email.trim().toLowerCase()] = credential;
    writeStorage(data);
  },

  getByEmail(email: string) {
    const data = readStorage();
    return data[email.trim().toLowerCase()] ?? null;
  },

  remove(email: string) {
    const data = readStorage();
    delete data[email.trim().toLowerCase()];
    writeStorage(data);
  },
};
