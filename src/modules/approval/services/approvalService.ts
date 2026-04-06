import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../shared/utils/supabase';
import { ApprovalPost, ApprovalComment } from '../ApprovalModule';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type DbApprovalPost = any;
type DbApprovalComment = any;

const createPublicApprovalClient = (token: string) =>
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

const buildReadableError = (prefix: string, error: any) => {
  const message =
    error?.message ||
    error?.details ||
    error?.hint ||
    'Erro desconhecido ao comunicar com o Supabase.';
  return new Error(`${prefix}: ${message}`);
};

export const approvalService = {
  async listApprovalPosts(profileId: string): Promise<ApprovalPost[]> {
    const client = ensureSupabase();

    const { data, error } = await client
      .from('approval_posts')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching approval posts:', error);
      throw buildReadableError('Não foi possível carregar as aprovações', error);
    }

    return (data || []).map(mapDbToApprovalPost);
  },

  async createApprovalPost(
    post: Partial<ApprovalPost>,
    profileId: string
  ): Promise<ApprovalPost> {
    const client = ensureSupabase();

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError) {
      console.error('Error fetching authenticated user:', userError);
      throw buildReadableError('Não foi possível identificar o usuário autenticado', userError);
    }

    if (!user) {
      throw new Error('Usuário não autenticado.');
    }

    if (!profileId) {
      throw new Error('profileId é obrigatório para criar aprovação.');
    }

    if (!post.title?.trim()) {
      throw new Error('O título é obrigatório para criar aprovação.');
    }

    const dbPost = mapApprovalPostToDb(post, profileId);
    dbPost.user_id = user.id;

    if (!dbPost.public_token) {
      dbPost.public_token = crypto.randomUUID();
    }

    console.log('createApprovalPost payload:', dbPost);

    const { data, error } = await client
      .from('approval_posts')
      .insert([dbPost])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating approval post:', {
        error,
        payload: dbPost,
      });
      throw buildReadableError('Não foi possível criar a aprovação', error);
    }

    console.log('createApprovalPost success:', data);

    return mapDbToApprovalPost(data);
  },

  async updateApprovalPost(
    id: string,
    post: Partial<ApprovalPost>,
    profileId: string
  ): Promise<ApprovalPost> {
    const client = ensureSupabase();

    if (!id) {
      throw new Error('ID da aprovação é obrigatório.');
    }

    if (!profileId) {
      throw new Error('profileId é obrigatório para atualizar aprovação.');
    }

    const dbPost = mapApprovalPostToDb(post);

    console.log('updateApprovalPost payload:', {
      id,
      profileId,
      payload: dbPost,
    });

    const { data, error } = await client
      .from('approval_posts')
      .update({
        ...dbPost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('profile_id', profileId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating approval post:', error);
      throw buildReadableError('Não foi possível atualizar a aprovação', error);
    }

    return mapDbToApprovalPost(data);
  },

  async deleteApprovalPost(id: string, profileId: string): Promise<void> {
    const client = ensureSupabase();

    if (!id) {
      throw new Error('ID da aprovação é obrigatório.');
    }

    if (!profileId) {
      throw new Error('profileId é obrigatório para excluir aprovação.');
    }

    console.log('deleteApprovalPost payload:', { id, profileId });

    const { error } = await client
      .from('approval_posts')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId);

    if (error) {
      console.error('Error deleting approval post:', error);
      throw buildReadableError('Não foi possível excluir a aprovação', error);
    }
  },

  async getApprovalPostByToken(token: string): Promise<ApprovalPost | null> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase público não está configurado.');
    }

    const publicClient = createPublicApprovalClient(token);

    const { data, error } = await publicClient
      .from('approval_posts')
      .select('*')
      .eq('public_token', token)
      .maybeSingle();

    if (error) {
      console.error('Error fetching public approval post:', error);
      throw buildReadableError('Não foi possível carregar a aprovação pública', error);
    }

    return data ? mapDbToApprovalPost(data) : null;
  },

  async listApprovalFeedback(
    approvalPostId: string,
    token?: string
  ): Promise<ApprovalComment[]> {
    const client = token ? createPublicApprovalClient(token) : ensureSupabase();

    const { data, error } = await client
      .from('approval_feedback')
      .select('*')
      .eq('post_id', approvalPostId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching approval feedback:', error);
      throw buildReadableError('Não foi possível carregar os comentários', error);
    }

    return (data || []).map(mapDbToApprovalComment);
  },

  async addApprovalFeedback(
    comment: Partial<ApprovalComment>,
    options?: {
      token?: string;
      profileId?: string;
      userId?: string;
      reviewerEmail?: string;
      status?: 'approved' | 'changes_requested' | 'rejected';
    }
  ): Promise<ApprovalComment> {
    if (!comment.approvalItemId) {
      throw new Error('approvalItemId é obrigatório.');
    }

    if (!comment.content?.trim()) {
      throw new Error('O conteúdo do comentário é obrigatório.');
    }

    const dbComment = mapApprovalCommentToDb(comment, {
      reviewerEmail: options?.reviewerEmail,
      status: options?.status,
    });

    if (options?.profileId) dbComment.profile_id = options.profileId;
    if (options?.userId) dbComment.user_id = options.userId;

    const client = options?.token ? createPublicApprovalClient(options.token) : ensureSupabase();

    console.log('addApprovalFeedback payload:', dbComment);

    const { data, error } = await client
      .from('approval_feedback')
      .insert([dbComment])
      .select('*')
      .single();

    if (error) {
      console.error('Error adding approval feedback:', error);
      throw buildReadableError('Não foi possível adicionar o comentário', error);
    }

    return mapDbToApprovalComment(data);
  },

  async updateApprovalStatus(
    id: string,
    status: string,
    profileId?: string,
    token?: string
  ): Promise<void> {
    const client = token ? createPublicApprovalClient(token) : ensureSupabase();

    let query = client
      .from('approval_posts')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!token && profileId) {
      query = query.eq('profile_id', profileId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error updating approval status:', error);
      throw buildReadableError('Não foi possível atualizar o status da aprovação', error);
    }
  },
};

function mapDbToApprovalPost(dbPost: DbApprovalPost): ApprovalPost {
  let inferredContentType: 'static' | 'carousel' | 'vertical_video' | 'horizontal_video' =
    'static';

  if (dbPost.format === 'carousel') {
    inferredContentType = 'carousel';
  } else if (
    dbPost.format === 'single' ||
    dbPost.format === 'static' ||
    dbPost.format === 'video'
  ) {
    const firstMedia = dbPost.media_urls?.[0];
    if (firstMedia?.type === 'video' || firstMedia?.mimeType?.includes('video')) {
      inferredContentType = 'vertical_video';
    } else {
      inferredContentType = 'static';
    }
  } else if (dbPost.format) {
    inferredContentType = dbPost.format as any;
  }

  return {
    id: dbPost.id,
    title: dbPost.title || '',
    caption: dbPost.caption || '',
    platform: dbPost.platforms?.[0] || 'Instagram',
    contentType: inferredContentType,
    status: dbPost.status || 'pending',
    thumbnail:
      dbPost.thumbnail ||
      dbPost.media_urls?.[0]?.persistedPreview ||
      dbPost.media_urls?.[0]?.previewUrl ||
      '',
    mediaItems: dbPost.media_urls || [],
    publicToken: dbPost.public_token,
    createdAt: dbPost.created_at,
    updatedAt: dbPost.updated_at,
    feedbackCount: 0,
  };
}

function mapApprovalPostToDb(post: Partial<ApprovalPost>, profileId?: string): any {
  const dbPost: any = {};

  if (profileId) dbPost.profile_id = profileId;
  if (post.title !== undefined) dbPost.title = post.title?.trim();
  if (post.caption !== undefined) dbPost.caption = post.caption;
  if (post.platform !== undefined) dbPost.platforms = [post.platform];

  if (post.contentType !== undefined) {
    dbPost.format = post.contentType === 'carousel' ? 'carousel' : 'single';
  }

  if (post.status !== undefined) dbPost.status = post.status;
  if (post.mediaItems !== undefined) dbPost.media_urls = post.mediaItems;
  if (post.publicToken !== undefined) dbPost.public_token = post.publicToken;
  if (post.thumbnail !== undefined) dbPost.thumbnail = post.thumbnail;

  return dbPost;
}

function mapDbToApprovalComment(dbComment: DbApprovalComment): ApprovalComment {
  return {
    id: dbComment.id,
    approvalItemId: dbComment.post_id,
    authorType: dbComment.reviewer_email ? 'external' : 'internal',
    authorName: dbComment.reviewer_name || '',
    content: dbComment.comment || '',
    createdAt: dbComment.created_at,
  };
}

function mapApprovalCommentToDb(
  comment: Partial<ApprovalComment>,
  options?: {
    reviewerEmail?: string;
    status?: 'approved' | 'changes_requested' | 'rejected';
  }
): any {
  const dbComment: any = {};

  if (comment.approvalItemId !== undefined) dbComment.post_id = comment.approvalItemId;
  if (comment.authorName !== undefined) dbComment.reviewer_name = comment.authorName;
  if (comment.content !== undefined) dbComment.comment = comment.content;

  if (comment.authorType === 'external') {
    dbComment.reviewer_email = options?.reviewerEmail || 'external@example.com';
  }

  dbComment.status = options?.status || 'changes_requested';

  return dbComment;
}
