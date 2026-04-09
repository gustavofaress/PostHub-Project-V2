import {
  DEFAULT_GUIDED_TOUR_STEP_ID,
  type GuidedFlowStepId,
  type GuidedTourStepId,
} from '../modules/onboarding/guidedFlow';
import { supabase } from '../shared/utils/supabase';

const MOCK_ONBOARDING_STORAGE_KEY = 'posthub_user_onboarding';
const GUIDED_FLOW_COLUMNS = [
  'guided_current_step',
  'guided_steps_completed',
  'guided_flow_completed_at',
] as const;

const readMockOnboardingMap = (): Record<string, UserOnboarding> => {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(MOCK_ONBOARDING_STORAGE_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.error('Failed to read mock onboarding storage:', error);
    return {};
  }
};

const writeMockOnboardingMap = (nextValue: Record<string, UserOnboarding>) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(MOCK_ONBOARDING_STORAGE_KEY, JSON.stringify(nextValue));
  } catch (error) {
    console.error('Failed to write mock onboarding storage:', error);
  }
};

const isMissingGuidedFlowColumnError = (error: any) => {
  const message = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`;
  return GUIDED_FLOW_COLUMNS.some((columnName) => message.includes(columnName));
};

const mergeOnboardingWithFallback = (
  baseValue: Partial<UserOnboarding> | null | undefined,
  fallbackValue: Partial<UserOnboarding> | null | undefined,
  userId: string
): UserOnboarding | null => {
  if (!baseValue && !fallbackValue) return null;

  return {
    user_id: userId,
    work_model: baseValue?.work_model ?? fallbackValue?.work_model ?? null,
    operation_size: baseValue?.operation_size ?? fallbackValue?.operation_size ?? null,
    current_process: baseValue?.current_process ?? fallbackValue?.current_process ?? null,
    quiz_completed: !!(baseValue?.quiz_completed ?? fallbackValue?.quiz_completed),
    setup_completed: !!(baseValue?.setup_completed ?? fallbackValue?.setup_completed),
    guided_current_step:
      baseValue?.guided_current_step ?? fallbackValue?.guided_current_step ?? null,
    guided_steps_completed:
      baseValue?.guided_steps_completed ?? fallbackValue?.guided_steps_completed ?? [],
    guided_flow_completed_at:
      baseValue?.guided_flow_completed_at ?? fallbackValue?.guided_flow_completed_at ?? null,
    id: baseValue?.id ?? fallbackValue?.id,
    created_at: baseValue?.created_at ?? fallbackValue?.created_at,
    updated_at: baseValue?.updated_at ?? fallbackValue?.updated_at,
  };
};

const persistOnboardingFallback = (
  userId: string,
  updates: Partial<UserOnboarding>
): UserOnboarding => {
  const map = readMockOnboardingMap();
  const existing = map[userId] ?? {
    user_id: userId,
    work_model: null,
    operation_size: null,
    current_process: null,
    quiz_completed: false,
    setup_completed: false,
    guided_current_step: DEFAULT_GUIDED_TOUR_STEP_ID,
    guided_steps_completed: [],
    guided_flow_completed_at: null,
  };

  const nextValue: UserOnboarding = {
    ...existing,
    ...updates,
    user_id: userId,
  };

  writeMockOnboardingMap({
    ...map,
    [userId]: nextValue,
  });

  return nextValue;
};

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
    const fallback = readMockOnboardingMap()[userId] ?? null;

    if (!supabase) {
      return fallback;
    }

    const { data, error } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return mergeOnboardingWithFallback(data, fallback, userId);
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
    if (!supabase) {
      return persistOnboardingFallback(userId, updates);
    }

    const existing = await this.getByUserId(userId);

    if (existing) {
      const { data, error } = await supabase
        .from('user_onboarding')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (!isMissingGuidedFlowColumnError(error)) throw error;

        const fallbackState = persistOnboardingFallback(userId, updates);
        const remoteSafeUpdates =
          typeof updates.setup_completed === 'boolean'
            ? { setup_completed: updates.setup_completed }
            : null;

        if (remoteSafeUpdates) {
          const { error: safeUpdateError } = await supabase
            .from('user_onboarding')
            .update(remoteSafeUpdates)
            .eq('user_id', userId);

          if (safeUpdateError) throw safeUpdateError;
        }

        return mergeOnboardingWithFallback(existing, fallbackState, userId);
      }

      return mergeOnboardingWithFallback(data, null, userId);
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

    if (error) {
      if (!isMissingGuidedFlowColumnError(error)) throw error;

      const fallbackState = persistOnboardingFallback(userId, updates);
      const remoteInsert =
        typeof updates.setup_completed === 'boolean'
          ? {
              user_id: userId,
              setup_completed: updates.setup_completed,
            }
          : {
              user_id: userId,
            };

      const { data: safeData, error: safeUpsertError } = await supabase
        .from('user_onboarding')
        .upsert(remoteInsert, { onConflict: 'user_id' })
        .select()
        .single();

      if (safeUpsertError) throw safeUpsertError;

      return mergeOnboardingWithFallback(safeData, fallbackState, userId);
    }

    return mergeOnboardingWithFallback(data, null, userId);
  },

  async saveQuizAnswers(
    userId: string,
    answers: {
      work_model: string;
      operation_size: string;
      current_process: string;
    }
  ) {
    if (!supabase) {
      return persistOnboardingFallback(userId, {
        work_model: answers.work_model,
        operation_size: answers.operation_size,
        current_process: answers.current_process,
        quiz_completed: true,
        setup_completed: false,
        guided_current_step: DEFAULT_GUIDED_TOUR_STEP_ID,
        guided_steps_completed: [],
        guided_flow_completed_at: null,
      });
    }

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

    if (error) {
      if (!isMissingGuidedFlowColumnError(error)) throw error;

      const fallbackState = persistOnboardingFallback(userId, payload);
      const safePayload = {
        user_id: userId,
        work_model: answers.work_model,
        operation_size: answers.operation_size,
        current_process: answers.current_process,
        quiz_completed: true,
        setup_completed: false,
      };

      const { data: safeData, error: safeUpsertError } = await supabase
        .from('user_onboarding')
        .upsert(safePayload, { onConflict: 'user_id' })
        .select()
        .single();

      if (safeUpsertError) throw safeUpsertError;

      return mergeOnboardingWithFallback(safeData, fallbackState, userId);
    }

    return mergeOnboardingWithFallback(data, null, userId);
  },

  async markSetupCompleted(userId: string) {
    if (!supabase) {
      return this.updateGuidedFlow(userId, {
        setup_completed: true,
        guided_flow_completed_at: new Date().toISOString(),
      });
    }

    return this.updateGuidedFlow(userId, {
      setup_completed: true,
      guided_flow_completed_at: new Date().toISOString(),
    });
  },

  clearMockOnboarding(userId?: string) {
    if (typeof window === 'undefined') return;

    if (!userId) {
      window.localStorage.removeItem(MOCK_ONBOARDING_STORAGE_KEY);
      return;
    }

    const map = readMockOnboardingMap();
    delete map[userId];
    writeMockOnboardingMap(map);
  },
};
