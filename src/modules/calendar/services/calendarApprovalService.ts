import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../shared/utils/supabase';
import { buildAppUrl } from '../../../shared/utils/appUrl';
import type { ApprovalStatus } from '../../approval/approval.types';
import {
  mapCalendarRowToApprovalPost,
  mapDbCalendarApprovalFeedback,
  mapDbCalendarApprovalLink,
  mapDbCalendarPostApproval,
  type CalendarApprovalFeedback,
  type CalendarApprovalLink,
  type CalendarApprovalListItem,
  type EditorialCalendarApprovalRow,
  type LatestCalendarApprovalStatus,
} from '../calendarApproval.types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CALENDAR_APPROVAL_SCHEMA_IDENTIFIERS = [
  'caption',
  'content_type',
  'thumbnail_url',
  'media_urls',
  'calendar_approval_links',
  'calendar_post_approvals',
  'calendar_approval_feedback',
];

const CALENDAR_APPROVAL_ROW_SELECT = `
  id,
  user_id,
  profile_id,
  title,
  description,
  caption,
  platform,
  content_type,
  thumbnail_url,
  media_urls,
  scheduled_date,
  status,
  kanban_column_id,
  created_at,
  updated_at
`;

const createPublicCalendarApprovalClient = (token: string) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        'x-approval-token': token,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

const ensureSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase não está configurado.');
  }

  return supabase;
};

const getErrorFingerprint = (error: unknown) => {
  if (!error) return '';

  if (typeof error === 'string') return error.toLowerCase();

  if (typeof error === 'object') {
    const current = error as {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
      name?: string;
    };

    return [
      current.code,
      current.message,
      current.details,
      current.hint,
      current.name,
      JSON.stringify(error),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  return String(error).toLowerCase();
};

export const isMissingCalendarApprovalSchemaError = (error: unknown) => {
  const fingerprint = getErrorFingerprint(error);

  return (
    fingerprint.includes('42p01') ||
    fingerprint.includes('pgrst205') ||
    fingerprint.includes('pgrst204') ||
    fingerprint.includes('schema cache') ||
    fingerprint.includes('could not find the table') ||
    CALENDAR_APPROVAL_SCHEMA_IDENTIFIERS.some((identifier) =>
      fingerprint.includes(identifier.toLowerCase())
    )
  );
};

export const getCalendarApprovalSchemaMessage = () =>
  'A estrutura da Aprovação via Calendário ainda não foi aplicada no banco. Rode a migration mais recente do Supabase e tente novamente.';

const buildReadableError = (prefix: string, error: any) => {
  if (isMissingCalendarApprovalSchemaError(error)) {
    return new Error(`${prefix}: ${getCalendarApprovalSchemaMessage()}`);
  }

  const message =
    error?.message ||
    error?.details ||
    error?.hint ||
    (typeof error === 'object' && error !== null ? JSON.stringify(error) : null) ||
    'Erro desconhecido ao comunicar com o Supabase.';

  return new Error(`${prefix}: ${message}`);
};

const toRangeStartIso = (date: string) => new Date(`${date}T00:00:00`).toISOString();
const toRangeEndIso = (date: string) => new Date(`${date}T23:59:59.999`).toISOString();

const mapCalendarRows = (rows: unknown): EditorialCalendarApprovalRow[] =>
  ((rows ?? []) as Array<Record<string, any>>).map((row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    profile_id: row.profile_id ? String(row.profile_id) : null,
    title: row.title || '',
    description: row.description || null,
    caption: row.caption || null,
    platform: row.platform || null,
    content_type: row.content_type || null,
    thumbnail_url: row.thumbnail_url || null,
    media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
    scheduled_date: String(row.scheduled_date),
    status: row.status || null,
    kanban_column_id: row.kanban_column_id || null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));

export const calendarApprovalService = {
  buildPublicLink(token: string) {
    return buildAppUrl(`/calendario/aprovacao/${token}`);
  },

  async countCalendarPostsInRange(
    profileId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const client = ensureSupabase();

    const { count, error } = await client
      .from('editorial_calendar')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .gte('scheduled_date', toRangeStartIso(startDate))
      .lte('scheduled_date', toRangeEndIso(endDate));

    if (error) {
      throw buildReadableError('Não foi possível contar os posts do calendário', error);
    }

    return count || 0;
  },

  async createApprovalLink(input: {
    profileId: string;
    startDate: string;
    endDate: string;
    expiresAt: string;
    profileName?: string | null;
    profileAvatarUrl?: string | null;
  }): Promise<{
    link: CalendarApprovalLink;
    itemsCount: number;
    publicUrl: string;
  }> {
    const client = ensureSupabase();

    const { data: postRows, error: postsError } = await client
      .from('editorial_calendar')
      .select('id, profile_id')
      .eq('profile_id', input.profileId)
      .gte('scheduled_date', toRangeStartIso(input.startDate))
      .lte('scheduled_date', toRangeEndIso(input.endDate));

    if (postsError) {
      throw buildReadableError('Não foi possível buscar os posts do calendário', postsError);
    }

    const posts = (postRows ?? []) as Array<{ id: string; profile_id: string }>;

    if (posts.length === 0) {
      throw new Error('Não existem posts no período selecionado.');
    }

    const payload = {
      profile_id: input.profileId,
      start_date: input.startDate,
      end_date: input.endDate,
      expires_at: input.expiresAt,
      status: 'active',
      profile_name_snapshot: input.profileName ?? null,
      profile_avatar_url_snapshot: input.profileAvatarUrl ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data: linkRow, error: linkError } = await client
      .from('calendar_approval_links')
      .insert([payload])
      .select('*')
      .single();

    if (linkError) {
      throw buildReadableError('Não foi possível criar o link de aprovação', linkError);
    }

    const link = mapDbCalendarApprovalLink(linkRow as Record<string, any>);
    const approvalRows = posts.map((post) => ({
      approval_link_id: link.id,
      calendar_post_id: post.id,
      profile_id: input.profileId,
      status: 'pending',
      updated_at: new Date().toISOString(),
    }));

    const { error: approvalsError } = await client
      .from('calendar_post_approvals')
      .insert(approvalRows);

    if (approvalsError) {
      throw buildReadableError(
        'Não foi possível preparar as aprovações dos posts selecionados',
        approvalsError
      );
    }

    return {
      link,
      itemsCount: posts.length,
      publicUrl: this.buildPublicLink(link.publicToken),
    };
  },

  async getPublicApprovalBundle(token: string): Promise<{
    link: CalendarApprovalLink;
    items: CalendarApprovalListItem[];
    feedback: CalendarApprovalFeedback[];
  }> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase público não está configurado.');
    }

    const client = createPublicCalendarApprovalClient(token);
    const link = await this.getPublicApprovalLink(token);

    const [{ data: calendarRows, error: calendarError }, { data: approvalRows, error: approvalsError }, { data: feedbackRows, error: feedbackError }] =
      await Promise.all([
        client
          .from('editorial_calendar')
          .select(CALENDAR_APPROVAL_ROW_SELECT)
          .eq('profile_id', link.profileId)
          .gte('scheduled_date', toRangeStartIso(link.startDate))
          .lte('scheduled_date', toRangeEndIso(link.endDate))
          .order('scheduled_date', { ascending: true }),
        client
          .from('calendar_post_approvals')
          .select('*')
          .eq('approval_link_id', link.id)
          .order('updated_at', { ascending: false }),
        client
          .from('calendar_approval_feedback')
          .select('*')
          .eq('approval_link_id', link.id)
          .order('created_at', { ascending: true }),
      ]);

    if (calendarError) {
      throw buildReadableError('Não foi possível carregar os posts deste calendário', calendarError);
    }

    if (approvalsError) {
      throw buildReadableError('Não foi possível carregar o status das aprovações', approvalsError);
    }

    if (feedbackError) {
      throw buildReadableError('Não foi possível carregar os comentários das aprovações', feedbackError);
    }

    const mappedCalendarRows = mapCalendarRows(calendarRows);
    const mappedApprovals = ((approvalRows ?? []) as Array<Record<string, any>>).map(
      mapDbCalendarPostApproval
    );
    const mappedFeedback = ((feedbackRows ?? []) as Array<Record<string, any>>).map(
      mapDbCalendarApprovalFeedback
    );

    const approvalByPostId = new Map(
      mappedApprovals.map((approval) => [approval.calendarPostId, approval])
    );
    const feedbackByPostId = mappedFeedback.reduce<Record<string, CalendarApprovalFeedback[]>>(
      (accumulator, item) => {
        accumulator[item.calendarPostId] = [...(accumulator[item.calendarPostId] || []), item];
        return accumulator;
      },
      {}
    );

    const items = mappedCalendarRows.map((row) => {
      const approval = approvalByPostId.get(row.id);
      const feedback = feedbackByPostId[row.id] || [];
      const previewPost = mapCalendarRowToApprovalPost(row, {
        status: approval?.status || 'pending',
        feedbackCount: feedback.length,
        profileName: link.profileName,
        profileAvatarUrl: link.profileAvatarUrl,
        updatedAt: approval?.updatedAt || row.updated_at,
      });

      return {
        calendarPost: row,
        approval:
          approval ||
          ({
            id: row.id,
            approvalLinkId: link.id,
            calendarPostId: row.id,
            profileId: row.profile_id || link.profileId,
            status: 'pending',
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          } as const),
        previewPost,
        feedbackCount: feedback.length,
      };
    });

    return {
      link,
      items,
      feedback: mappedFeedback,
    };
  },

  async getPublicApprovalLink(token: string): Promise<CalendarApprovalLink> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase público não está configurado.');
    }

    const client = createPublicCalendarApprovalClient(token);
    const { data, error } = await client
      .from('calendar_approval_links')
      .select('*')
      .eq('public_token', token)
      .maybeSingle();

    if (error) {
      throw buildReadableError('Não foi possível carregar o link de aprovação do calendário', error);
    }

    if (!data) {
      throw new Error('Este link pode ser inválido ou ter expirado.');
    }

    return mapDbCalendarApprovalLink(data as Record<string, any>);
  },

  async addPublicFeedback(
    input: {
      approvalId: string;
      approvalLinkId: string;
      calendarPostId: string;
      profileId: string;
      content: string;
      authorName?: string;
      reviewerEmail?: string;
      status?: Exclude<ApprovalStatus, 'pending'>;
    },
    token: string
  ): Promise<CalendarApprovalFeedback> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase público não está configurado.');
    }

    const client = createPublicCalendarApprovalClient(token);
    const payload = {
      approval_id: input.approvalId,
      approval_link_id: input.approvalLinkId,
      calendar_post_id: input.calendarPostId,
      profile_id: input.profileId,
      author_type: 'external',
      reviewer_name: input.authorName || 'Revisor do Cliente',
      reviewer_email: input.reviewerEmail || 'external@example.com',
      comment: input.content.trim(),
      status: input.status || null,
    };

    const { data, error } = await client
      .from('calendar_approval_feedback')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      throw buildReadableError('Não foi possível registrar o feedback do cliente', error);
    }

    return mapDbCalendarApprovalFeedback(data as Record<string, any>);
  },

  async updatePublicApprovalStatus(
    approvalId: string,
    status: ApprovalStatus,
    token: string,
    options?: {
      reviewerName?: string;
      reviewerEmail?: string;
    }
  ): Promise<void> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase público não está configurado.');
    }

    const client = createPublicCalendarApprovalClient(token);
    const { error } = await client
      .from('calendar_post_approvals')
      .update({
        status,
        reviewer_name: options?.reviewerName || 'Revisor do Cliente',
        reviewer_email: options?.reviewerEmail || 'external@example.com',
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', approvalId);

    if (error) {
      throw buildReadableError('Não foi possível atualizar o status desta aprovação', error);
    }
  },

  async listLatestApprovalStatuses(
    profileId: string
  ): Promise<Record<string, LatestCalendarApprovalStatus>> {
    const client = ensureSupabase();

    const { data: linksRows, error: linksError } = await client
      .from('calendar_approval_links')
      .select('id, status, created_at, updated_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (linksError) {
      throw buildReadableError('Não foi possível carregar os links de aprovação do calendário', linksError);
    }

    const links = (linksRows ?? []) as Array<Record<string, any>>;

    if (links.length === 0) {
      return {};
    }

    const linkIdToStatus = new Map(
      links.map((link) => [String(link.id), (link.status || 'active') as CalendarApprovalLink['status']])
    );

    const { data: approvalsRows, error: approvalsError } = await client
      .from('calendar_post_approvals')
      .select('id, approval_link_id, calendar_post_id, status, updated_at')
      .in(
        'approval_link_id',
        links.map((link) => String(link.id))
      )
      .order('updated_at', { ascending: false });

    if (approvalsError) {
      throw buildReadableError('Não foi possível carregar os status de aprovação do calendário', approvalsError);
    }

    return ((approvalsRows ?? []) as Array<Record<string, any>>).reduce<
      Record<string, LatestCalendarApprovalStatus>
    >((accumulator, row) => {
      const calendarPostId = String(row.calendar_post_id);
      const updatedAt = String(row.updated_at);
      const current = accumulator[calendarPostId];

      if (current && new Date(current.updatedAt).getTime() >= new Date(updatedAt).getTime()) {
        return accumulator;
      }

      accumulator[calendarPostId] = {
        calendarPostId,
        approvalLinkId: String(row.approval_link_id),
        linkStatus: linkIdToStatus.get(String(row.approval_link_id)) || 'active',
        status: (row.status || 'pending') as ApprovalStatus,
        updatedAt,
      };

      return accumulator;
    }, {});
  },
};
