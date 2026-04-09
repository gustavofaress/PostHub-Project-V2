import {
  DEFAULT_GUIDED_TOUR_STEP_ID,
  type GuidedFlowStepId,
  type GuidedTourStepId,
} from '../modules/onboarding/guidedFlow';
import { supabase } from '../shared/utils/supabase';

export interface UserOnboarding {
  id?: string;
  user_id: string;
  work_model: string | null;
  operation_size: string | null;
  current_process: string | null;
  quiz_completed: boolean;
  setup_completed: boolean;
  guided_current_step?: GuidedFlowStepId | GuidedTourStepId | null;
  guided_steps_completed?: GuidedFlowStepId[];
  guided_flow_completed_at?: string | null;
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

  async updateGuidedFlow(
    userId: string,
    updates: Partial<
      Pick<
        UserOnboarding,
        'guided_current_step' | 'guided_steps_completed' | 'guided_flow_completed_at' | 'setup_completed'
      >
    >
  ) {
    if (!supabase) return null;

    const existing = await this.getByUserId(userId);

    if (existing) {
      const { data, error } = await supabase
        .from('user_onboarding')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('user_onboarding')
      .upsert(
        {
          user_id: userId,
          ...updates,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

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
      setup_completed: false,
      guided_current_step: DEFAULT_GUIDED_TOUR_STEP_ID,
      guided_steps_completed: [],
      guided_flow_completed_at: null,
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

    return this.updateGuidedFlow(userId, {
      setup_completed: true,
      guided_flow_completed_at: new Date().toISOString(),
    });
  },
};
