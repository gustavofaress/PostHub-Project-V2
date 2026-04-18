import { supabase } from '../shared/utils/supabase';

interface SupportPasswordResetValidationResult {
  maskedEmail: string;
  expiresAt: string;
}

interface CompleteSupportPasswordResetInput {
  token: string;
  email: string;
  password: string;
}

export const supportPasswordResetService = {
  async validateToken(token: string): Promise<SupportPasswordResetValidationResult> {
    if (!supabase) {
      throw new Error('Supabase nao esta configurado.');
    }

    const { data, error } = await supabase.functions.invoke('support-password-reset', {
      body: {
        mode: 'validate',
        token,
      },
    });

    if (error) {
      throw new Error(
        await resolveFunctionErrorMessage(
          error,
          'Nao foi possivel validar o link de suporte no momento.'
        )
      );
    }

    if (!data?.maskedEmail || !data?.expiresAt) {
      throw new Error('O link de suporte retornou uma resposta incompleta.');
    }

    return {
      maskedEmail: data.maskedEmail,
      expiresAt: data.expiresAt,
    };
  },

  async completeReset({
    token,
    email,
    password,
  }: CompleteSupportPasswordResetInput): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase nao esta configurado.');
    }

    const { error } = await supabase.functions.invoke('support-password-reset', {
      body: {
        mode: 'complete',
        token,
        email,
        password,
      },
    });

    if (error) {
      throw new Error(
        await resolveFunctionErrorMessage(
          error,
          'Nao foi possivel concluir a redefinicao de senha.'
        )
      );
    }
  },
};

async function resolveFunctionErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'context' in error &&
    error.context instanceof Response
  ) {
    try {
      const payload = await error.context.clone().json();
      if (typeof payload?.error === 'string' && payload.error.trim()) {
        return payload.error.trim();
      }
    } catch {
      // Ignore parsing errors and use the fallback below.
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}
