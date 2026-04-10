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

export const scriptAiService = {
  async generateScript(payload: ScriptAiRequest) {
    if (!supabase) {
      throw new Error('Supabase não está configurado.');
    }

    const { data, error } = await supabase.functions.invoke('generate-script-ai', {
      body: payload,
    });

    if (error) {
      throw error;
    }

    if (!data?.script) {
      throw new Error('A Edge Function de roteiro não retornou um resultado válido.');
    }

    return data.script as ScriptAiResult;
  },
};
