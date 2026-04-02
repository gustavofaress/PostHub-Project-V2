import { supabase } from '../../../shared/utils/supabase';
import { ApprovalPost, ApprovalComment } from '../ApprovalModule';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type DbApprovalPost = any;
type DbApprovalComment = any;

async function getAuthHeaders() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
}

async function getPublicHeaders(token: string) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    'x-approval-token': token
  };
}

async function publicRestSelectPostByToken(token: string): Promise<ApprovalPost | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/approval_posts?public_token=eq.${encodeURIComponent(token)}&select=*`,
    {
      method: 'GET',
      headers: await getPublicHeaders(token)
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao buscar post público: ${text}`);
  }

  const rows = await res.json();
  if (!rows?.length) return null;
  return mapDbToApprovalPost(rows[0]);
}

async function publicRestUpdateStatus(postId: string, status: string, token: string): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/approval_posts?id=eq.${encodeURIComponent(postId)}`,
    {
      method: 'PATCH',
      headers: await getPublicHeaders(token),
      body: JSON.stringify({
        status,
        updated_at: new Date().toISOString()
      })
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao atualizar status público: ${text}`);
  }
}

async function publicRestInsertFeedback(
  postId: string,
  reviewerName: string,
  comment: string,
  token: string
): Promise<ApprovalComment> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/approval_feedback`, {
    method: 'POST',
    headers: await getPublicHeaders(token),
    body: JSON.stringify([
      {
        post_id: postId,
        reviewer_name: reviewerName,
        reviewer_email: 'external@example.com',
        comment,
        status: 'comment'
      }
    ])
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao inserir comentário público: ${text}`);
  }

  const rows = await res.json();
  return mapDbToApprovalComment(rows[0]);
}

export const approvalService = {
  async listApprovalPosts(profileId: string): Promise<ApprovalPost[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('approval_posts')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching approval posts:', error);
      throw error;
    }

    return (data || []).map(mapDbToApprovalPost);
  },

  async createApprovalPost(post: Partial<ApprovalPost>, profileId: string): Promise<ApprovalPost> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const dbPost = mapApprovalPostToDb(post, profileId);
    dbPost.user_id = user.id;

    if (!dbPost.public_token) {
      dbPost.public_token = Math.random().toString(36).substring(2, 15);
    }

    const { data, error } = await supabase
      .from('approval_posts')
      .insert([dbPost])
      .select()
      .single();

    if (error) {
      console.error('Error creating approval post:', error);
      throw error;
    }

    return mapDbToApprovalPost(data);
  },

  async updateApprovalPost(id: string, post: Partial<ApprovalPost>, profileId: string): Promise<ApprovalPost> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const dbPost = mapApprovalPostToDb(post);

    const { data, error } = await supabase
      .from('approval_posts')
      .update(dbPost)
      .eq('id', id)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) {
      console.error('Error updating approval post:', error);
      throw error;
    }

    return mapDbToApprovalPost(data);
  },

  async deleteApprovalPost(id: string, profileId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('approval_posts')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId);

    if (error) {
      console.error('Error deleting approval post:', error);
      throw error;
    }
  },

  async getApprovalPostByToken(token: string): Promise<ApprovalPost | null> {
    if (!supabase) return null;

    return publicRestSelectPostByToken(token);
  },

  async listApprovalFeedback(approvalPostId: string): Promise<ApprovalComment[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('approval_feedback')
      .select('*')
      .eq('post_id', approvalPostId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching approval feedback:', error);
      throw error;
    }

    return (data || []).map(mapDbToApprovalComment);
  },

  async addApprovalFeedback(
    comment: Partial<ApprovalComment>,
    options?: {
      token?: string;
      profileId?: string;
      userId?: string;
    }
  ): Promise<ApprovalComment> {
    if (!supabase) throw new Error('Supabase client not initialized');

    if (!comment.approvalItemId) {
      throw new Error('approvalItemId is required');
    }

    if (!comment.content?.trim()) {
      throw new Error('comment content is required');
    }

    // Fluxo público
    if (options?.token) {
      return publicRestInsertFeedback(
        comment.approvalItemId,
        comment.authorName || 'Revisor do Cliente',
        comment.content,
        options.token
      );
    }

    // Fluxo interno
    const dbComment = mapApprovalCommentToDb(comment);

    if (options?.profileId) dbComment.profile_id = options.profileId;
    if (options?.userId) dbComment.user_id = options.userId;

    const { data, error } = await supabase
      .from('approval_feedback')
      .insert([dbComment])
      .select()
      .single();

    if (error) {
      console.error('Error adding approval feedback:', error);
      throw error;
    }

    return mapDbToApprovalComment(data);
  },

  async updateApprovalStatus(
    id: string,
    status: string,
    profileId?: string,
    token?: string
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Fluxo público
    if (token) {
      await publicRestUpdateStatus(id, status, token);
      return;
    }

    // Fluxo interno
    let query = supabase
      .from('approval_posts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (profileId) {
      query = query.eq('profile_id', profileId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error updating approval status:', error);
      throw error;
    }
  }
};

function mapDbToApprovalPost(dbPost: DbApprovalPost): ApprovalPost {
  let inferredContentType: 'static' | 'carousel' | 'vertical_video' | 'horizontal_video' = 'static';

  if (dbPost.format === 'carousel') {
    inferredContentType = 'carousel';
  } else if (dbPost.format === 'single' || dbPost.format === 'static' || dbPost.format === 'video') {
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
    thumbnail: dbPost.media_urls?.[0]?.persistedPreview || dbPost.media_urls?.[0]?.previewUrl || '',
    mediaItems: dbPost.media_urls || [],
    publicToken: dbPost.public_token,
    createdAt: dbPost.created_at,
    updatedAt: dbPost.updated_at,
    feedbackCount: 0
  };
}

function mapApprovalPostToDb(post: Partial<ApprovalPost>, profileId?: string): any {
  const dbPost: any = {};

  if (profileId) dbPost.profile_id = profileId;
  if (post.title !== undefined) dbPost.title = post.title;
  if (post.caption !== undefined) dbPost.caption = post.caption;
  if (post.platform !== undefined) dbPost.platforms = [post.platform];

  if (post.contentType !== undefined) {
    dbPost.format = post.contentType === 'carousel' ? 'carousel' : 'single';
  }

  if (post.status !== undefined) dbPost.status = post.status;
  if (post.mediaItems !== undefined) dbPost.media_urls = post.mediaItems;
  if (post.publicToken !== undefined) dbPost.public_token = post.publicToken;

  return dbPost;
}

function mapDbToApprovalComment(dbComment: DbApprovalComment): ApprovalComment {
  return {
    id: dbComment.id,
    approvalItemId: dbComment.post_id,
    authorType: dbComment.reviewer_email ? 'external' : 'internal',
    authorName: dbComment.reviewer_name || '',
    content: dbComment.comment || '',
    createdAt: dbComment.created_at
  };
}

function mapApprovalCommentToDb(comment: Partial<ApprovalComment>): any {
  const dbComment: any = {};

  if (comment.approvalItemId !== undefined) dbComment.post_id = comment.approvalItemId;
  if (comment.authorName !== undefined) dbComment.reviewer_name = comment.authorName;
  if (comment.content !== undefined) dbComment.comment = comment.content;

  if (comment.authorType === 'external') {
    dbComment.reviewer_email = 'external@example.com';
  }

  dbComment.status = 'comment';

  return dbComment;
}
