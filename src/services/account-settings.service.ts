import { supabase } from '../shared/utils/supabase';
import type { WorkspaceNotificationType } from '../shared/constants/workspaceNotifications';

const STORAGE_KEY = 'posthub_user_account_settings_v1';
const AVATAR_BUCKET = 'user-avatars';
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export interface UserNotificationPreferences {
  inApp: boolean;
  taskAssigned: boolean;
  taskUpdated: boolean;
  commentMentioned: boolean;
  taskCommented: boolean;
}

export interface UserAccountSettings {
  userId: string;
  name: string;
  website: string | null;
  avatarUrl: string | null;
  notificationPreferences: UserNotificationPreferences;
}

interface AccountSettingsRow {
  user_id: string;
  name: string | null;
  website: string | null;
  avatar_url: string | null;
  notification_preferences: Partial<UserNotificationPreferences> | null;
}

type StoredSettingsMap = Record<string, UserAccountSettings>;

export const DEFAULT_USER_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  inApp: true,
  taskAssigned: true,
  taskUpdated: true,
  commentMentioned: true,
  taskCommented: true,
};

const readStorage = (): StoredSettingsMap => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSettingsMap) : {};
  } catch (error) {
    console.error('[accountSettingsService] Failed to read local settings:', error);
    return {};
  }
};

const writeStorage = (settings: StoredSettingsMap) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[accountSettingsService] Failed to save local settings:', error);
  }
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const getExtensionFromFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && /^[a-z0-9]+$/.test(extension)) return extension;

  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
};

const mapRow = (row: AccountSettingsRow): UserAccountSettings => ({
  userId: row.user_id,
  name: row.name?.trim() || '',
  website: row.website?.trim() || null,
  avatarUrl: row.avatar_url?.trim() || null,
  notificationPreferences: normalizeNotificationPreferences(row.notification_preferences),
});

export const normalizeNotificationPreferences = (
  preferences?: Partial<UserNotificationPreferences> | null
): UserNotificationPreferences => ({
  ...DEFAULT_USER_NOTIFICATION_PREFERENCES,
  ...(preferences ?? {}),
});

export const shouldReceiveWorkspaceNotification = (
  preferences: Partial<UserNotificationPreferences> | null | undefined,
  type: WorkspaceNotificationType
) => {
  const normalized = normalizeNotificationPreferences(preferences);

  if (!normalized.inApp) return false;

  switch (type) {
    case 'task_assigned':
      return normalized.taskAssigned;
    case 'task_updated':
      return normalized.taskUpdated;
    case 'comment_mentioned':
      return normalized.commentMentioned;
    case 'task_commented':
      return normalized.taskCommented;
    default:
      return true;
  }
};

export const normalizeWebsite = (website: string) => {
  const value = website.trim();
  if (!value) return '';

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('invalid protocol');
    }

    return url.toString();
  } catch {
    throw new Error('Informe um site válido, como https://posthub.com.br.');
  }
};

export const accountSettingsService = {
  async getByUserId(userId: string): Promise<UserAccountSettings | null> {
    if (!userId) return null;

    if (!supabase) {
      return readStorage()[userId] ?? null;
    }

    try {
      const { data, error } = await supabase
        .from('user_account_settings')
        .select('user_id, name, website, avatar_url, notification_preferences')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      return data ? mapRow(data as AccountSettingsRow) : null;
    } catch (error) {
      console.error('[accountSettingsService] Failed to load account settings:', error);
      return null;
    }
  },

  async listNotificationPreferences(userIds: string[]) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

    if (uniqueUserIds.length === 0) {
      return new Map<string, UserNotificationPreferences>();
    }

    if (!supabase) {
      const storage = readStorage();
      return new Map(
        uniqueUserIds.map((userId) => [
          userId,
          normalizeNotificationPreferences(storage[userId]?.notificationPreferences),
        ])
      );
    }

    try {
      const { data, error } = await supabase.rpc('get_user_notification_preferences', {
        target_user_ids: uniqueUserIds,
      });

      if (error) throw error;

      const preferencesByUserId = new Map<string, UserNotificationPreferences>();

      (data ?? []).forEach((row) => {
        const settingsRow = row as Pick<AccountSettingsRow, 'user_id' | 'notification_preferences'>;
        preferencesByUserId.set(
          settingsRow.user_id,
          normalizeNotificationPreferences(settingsRow.notification_preferences)
        );
      });

      return preferencesByUserId;
    } catch (error) {
      console.error('[accountSettingsService] Failed to load notification preferences:', error);
      return new Map<string, UserNotificationPreferences>();
    }
  },

  async save(input: {
    userId: string;
    name: string;
    website?: string | null;
    avatarUrl?: string | null;
    notificationPreferences?: Partial<UserNotificationPreferences> | null;
  }): Promise<UserAccountSettings> {
    const name = input.name.trim();

    if (!input.userId) {
      throw new Error('Usuário não encontrado.');
    }

    if (!name) {
      throw new Error('Informe seu nome.');
    }

    const settings: UserAccountSettings = {
      userId: input.userId,
      name,
      website: input.website?.trim() || null,
      avatarUrl: input.avatarUrl?.trim() || null,
      notificationPreferences: normalizeNotificationPreferences(input.notificationPreferences),
    };

    if (!supabase) {
      const storage = readStorage();
      storage[input.userId] = settings;
      writeStorage(storage);
      return settings;
    }

    const { data, error } = await supabase
      .from('user_account_settings')
      .upsert(
        {
          user_id: settings.userId,
          name: settings.name,
          website: settings.website,
          avatar_url: settings.avatarUrl,
          notification_preferences: settings.notificationPreferences,
        },
        { onConflict: 'user_id' }
      )
      .select('user_id, name, website, avatar_url, notification_preferences')
      .single();

    if (error) {
      throw error;
    }

    return mapRow(data as AccountSettingsRow);
  },

  async uploadAvatar(userId: string, file: File) {
    if (!userId) {
      throw new Error('Usuário não encontrado.');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Envie uma imagem em formato JPG, PNG, WebP ou GIF.');
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new Error('A foto deve ter no máximo 5 MB.');
    }

    if (!supabase) {
      return readFileAsDataUrl(file);
    }

    const extension = getExtensionFromFile(file);
    const filePath = `${userId}/avatar-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  },
};
