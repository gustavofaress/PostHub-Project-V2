import { supabase } from '../shared/utils/supabase';

export interface CreateProfileProCheckoutResult {
  sessionId: string;
  checkoutUrl: string;
}

const buildProfileBillingError = async (error: unknown, fallback: string) => {
  let message = fallback;
  let code: string | undefined;
  let status: number | undefined;

  if (
    typeof error === 'object' &&
    error !== null &&
    'context' in error &&
    error.context instanceof Response
  ) {
    status = error.context.status;

    try {
      const payload = await error.context.clone().json();
      if (typeof payload?.error === 'string' && payload.error.trim()) {
        message = payload.error.trim();
      }
      if (typeof payload?.code === 'string' && payload.code.trim()) {
        code = payload.code.trim();
      }
    } catch {
      // Ignore malformed payloads and keep the fallback.
    }
  }

  if (
    message === fallback &&
    error instanceof Error &&
    typeof error.message === 'string' &&
    error.message.trim()
  ) {
    message = error.message.trim();
  }

  const resolvedError = new Error(message) as Error & {
    code?: string;
    status?: number;
  };
  resolvedError.code = code;
  resolvedError.status = status;
  return resolvedError;
};

export const profileBillingService = {
  async createProfileProCheckout(profileId: string): Promise<CreateProfileProCheckoutResult> {
    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await supabase.functions.invoke('create-profile-pro-checkout', {
      body: {
        profileId,
      },
    });

    if (error) {
      throw await buildProfileBillingError(
        error,
        'Nao foi possivel iniciar o checkout PRO deste perfil.'
      );
    }

    return data as CreateProfileProCheckoutResult;
  },
};
