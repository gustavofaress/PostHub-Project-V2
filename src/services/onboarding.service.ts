import { supabase } from '../shared/utils/supabase';

export interface UserOnboarding {
  id?: string;
  user_id: string;
  work_model: string | null;
  operation_size: string | null;
  current_process: string | null;
  quiz_completed: boolean;
  setup_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export const onboardingService = {
  async getByUserId(userId: string): Promise<UserOnboarding | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async saveQuizAnswers(
    userId: string,
    answers: {
      work_model: string;
      operation_size: string;
      current_process: string;
    }
  ) {
    if (!supabase) return null;

    const payload = {
      user_id: userId,
      work_model: answers.work_model,
      operation_size: answers.operation_size,
      current_process: answers.current_process,
      quiz_completed: true,
    };

    const { data, error } = await supabase
      .from('user_onboarding')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markSetupCompleted(userId: string) {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('user_onboarding')
      .update({ setup_completed: true })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
