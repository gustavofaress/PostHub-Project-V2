import { supabase } from '../shared/utils/supabase';

export interface UsuarioRecord {
  id: string;
  email: string | null;
  nome: string | null;
  current_plan: string | null;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  is_admin: boolean | null;
  created_at?: string | null;
}

export const userService = {
  async getCurrentUserRecord(userId: string): Promise<UsuarioRecord | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
