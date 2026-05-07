import { supabase } from '../shared/utils/supabase';

export interface UsuarioRecord {
  id: string;
  email: string | null;
  nome: string | null;
  current_plan: string | null;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  is_admin: boolean | null;
  is_affiliate_partner: boolean | null;
  affiliate_code: string | null;
  affiliate_commission_percent: number | null;
  affiliate_access_granted_at: string | null;
  referred_by_affiliate_user_id: string | null;
  referred_by_affiliate_code: string | null;
  affiliate_attributed_at: string | null;
  affiliate_locked_at: string | null;
}

export const userService = {
  async getCurrentUserRecord(
    userId: string,
    email?: string | null
  ): Promise<UsuarioRecord | null> {
    if (!supabase || !userId) {
      console.warn('[userService] Supabase ou userId ausente');
      return null;
    }

    try {
      const { data: byId, error: byIdError } = await supabase
        .from('usuarios')
        .select(`
          id,
          email,
          nome,
          current_plan,
          trial_started_at,
          trial_expires_at,
          is_admin,
          is_affiliate_partner,
          affiliate_code,
          affiliate_commission_percent,
          affiliate_access_granted_at,
          referred_by_affiliate_user_id,
          referred_by_affiliate_code,
          affiliate_attributed_at,
          affiliate_locked_at
        `)
        .eq('id', userId)
        .maybeSingle();

      console.log('[userService] byId result:', byId);
      console.log('[userService] byId error:', byIdError);

      if (!byIdError && byId) {
        return byId;
      }

      if (email) {
        const { data: byEmail, error: byEmailError } = await supabase
          .from('usuarios')
          .select(`
            id,
            email,
            nome,
            current_plan,
            trial_started_at,
            trial_expires_at,
            is_admin,
            is_affiliate_partner,
            affiliate_code,
            affiliate_commission_percent,
            affiliate_access_granted_at,
            referred_by_affiliate_user_id,
            referred_by_affiliate_code,
            affiliate_attributed_at,
            affiliate_locked_at
          `)
          .eq('email', email)
          .maybeSingle();

        console.log('[userService] byEmail result:', byEmail);
        console.log('[userService] byEmail error:', byEmailError);

        if (!byEmailError && byEmail) {
          console.warn('[userService] Usuário encontrado por email, não por id:', {
            authId: userId,
            usuariosId: byEmail.id,
            email,
          });
          return byEmail;
        }
      }

      console.warn('[userService] Usuário não encontrado na tabela usuarios:', {
        userId,
        email,
      });

      return null;
    } catch (err) {
      console.error('[userService] Erro inesperado:', err);
      return null;
    }
  },
};
