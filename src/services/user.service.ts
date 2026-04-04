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
    if (!supabase || !userId) {
      console.warn('[userService] Supabase ou userId ausente');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id,
          email,
          nome,
          current_plan,
          trial_started_at,
          trial_expires_at,
          is_admin,
          created_at
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[userService] Erro ao buscar usuario:', error);
        return null; // ⚠️ NÃO quebra o fluxo
      }

      if (!data) {
        console.warn('[userService] Usuário não encontrado na tabela usuarios:', userId);
        return null;
      }

      return data;
    } catch (err) {
      console.error('[userService] Erro inesperado:', err);
      return null;
    }
  },
};
