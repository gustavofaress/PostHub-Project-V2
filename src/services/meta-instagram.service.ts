import { supabase } from '../shared/utils/supabase';

export interface InstagramConnection {
  id: string;
  user_id: string;
  profile_id: string;
  page_id: string;
  instagram_user_id: string;
  username: string | null;
  profile_picture_url: string | null;
  token_expires_at: string | null;
  last_synced_at: string | null;
  last_sync_status: 'pending' | 'success' | 'error';
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export const metaInstagramService = {
  async listConnections(profileId: string) {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('contas_instagram')
      .select(
        'id, user_id, profile_id, page_id, instagram_user_id, username, profile_picture_url, token_expires_at, last_synced_at, last_sync_status, last_sync_error, created_at, updated_at'
      )
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as InstagramConnection[];
  },

  async getAuthUrl(profileId: string, redirectPath = '/workspace/integrations') {
    if (!supabase) {
      throw new Error('Supabase não está configurado.');
    }

    const { data, error } = await supabase.functions.invoke('get-meta-auth-url', {
      body: {
        profileId,
        redirectTo: `${window.location.origin}${redirectPath}`,
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error('A Edge Function não retornou uma URL de autorização.');
    }

    return data.url as string;
  },

  async syncMetrics(profileId: string) {
    if (!supabase) {
      throw new Error('Supabase não está configurado.');
    }

    const { data, error } = await supabase.functions.invoke('fetch-instagram-metrics', {
      body: {
        profileId,
      },
    });

    if (error) {
      throw error;
    }

    return data as {
      results: Array<{
        connectionId: string;
        instagramUserId: string;
        status: 'success' | 'error';
        accountRows?: number;
        mediaRows?: number;
        error?: string;
      }>;
    };
  },
};
