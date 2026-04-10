import { supabase } from '../shared/utils/supabase';

export interface ScriptAiHistoryMessage {
  role: 'assistant' | 'user';
  content: string;
}

export interface ScriptAiDirectionTableRow {
  timeRange: string;
  audio: string;
  visual: string;
}

export interface ScriptAiResult {
  title: string;
  strategyAnalysis: string;
  storyLocks: string[];
  directionTable: ScriptAiDirectionTableRow[];
  hook: string;
  content: string;
  examples: string;
  cta: string;
  captionBody: string;
  hashtags: string[];
}

export interface ScriptAiRequest {
  prompt: string;
  goal: string;
  format: string;
  audience: string;
  niche: string;
  tone: string;
  keywords: string;
  history: ScriptAiHistoryMessage[];
}

const resolveFunctionErrorMessage = async (error: unknown) => {
  const fallback =
    error instanceof Error
      ? error.message
      : 'Não foi possível gerar o roteiro com IA no momento.';

  if (!error || typeof error !== 'object' || !('context' in error)) {
    return fallback;
  }

  const response = (error as { context?: unknown }).context;
  if (!(response instanceof Response)) {
    return fallback;
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const json = await response
      .clone()
      .json()
      .catch(() => null as { error?: string } | null);

    if (json?.error) {
      return json.error;
    }
  }

  const text = await response.clone().text().catch(() => '');
  return text.trim() || fallback;
};

export const scriptAiService = {
  async generateScript(payload: ScriptAiRequest) {
    if (!supabase) {
      throw new Error('Supabase não está configurado.');
    }

    const { data, error } = await supabase.functions.invoke('generate-script-ai', {
      body: payload,
    });

    if (error) {
      throw new Error(await resolveFunctionErrorMessage(error));
    }

    if (!data?.script) {
      throw new Error('A Edge Function de roteiro não retornou um resultado válido.');
    }

    return data.script as ScriptAiResult;
  },
};
