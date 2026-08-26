import { supabase } from '../shared/utils/supabase';

export interface CreateProfileExtraCheckoutResult {
  sessionId: string;
  checkoutUrl: string;
}

export interface ProfileExtraStatus {
  hasAvailableSlot: boolean;
  checkoutPending: boolean;
  hasLinkedExtraProfiles: boolean;
}

const buildProfileExtraBillingError = async (error: unknown, fallback: string) => {
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
      // Keep the safe fallback for malformed Edge Function payloads.
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

export const profileExtraBillingService = {
  async getProfileExtraStatus(): Promise<ProfileExtraStatus> {
    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await supabase.functions.invoke('get-profile-extra-status', {
      body: {},
    });

    if (error) {
      throw await buildProfileExtraBillingError(
        error,
        'Nao foi possivel carregar o status de perfil adicional.'
      );
    }

    return {
      hasAvailableSlot: data?.hasAvailableSlot === true,
      checkoutPending: data?.checkoutPending === true,
      hasLinkedExtraProfiles: data?.hasLinkedExtraProfiles === true,
    };
  },

  async createProfileExtraCheckout(
    sourceProfileId: string
  ): Promise<CreateProfileExtraCheckoutResult> {
    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await supabase.functions.invoke('create-profile-extra-checkout', {
      body: {
        sourceProfileId,
      },
    });

    if (error) {
      throw await buildProfileExtraBillingError(
        error,
        'Nao foi possivel iniciar o checkout de perfil adicional.'
      );
    }

    return data as CreateProfileExtraCheckoutResult;
  },
};
