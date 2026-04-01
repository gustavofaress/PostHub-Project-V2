import { supabase } from '../../../shared/utils/supabase';
import { ApprovalPost, ApprovalComment } from '../ApprovalModule';

export const approvalService = {
  async listApprovalPosts(profileId: string): Promise<ApprovalPost[]> {
    if (!supabase) return [];
    
    // We fetch from approval_posts table
    const { data, error } = await supabase
      .from('approval_posts')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching approval posts:', error);
      throw error;
    }
    
    return data.map(mapDbToApprovalPost);
  },
  
  async createApprovalPost(post: Partial<ApprovalPost>, profileId: string): Promise<ApprovalPost> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    const { data: { user } } = await supabase.auth.getUser();
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
    
    const { data, error } = await supabase
      .from('approval_posts')
      .select('*')
      .eq('public_token', token)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching approval post by token:', error);
      throw error;
    }
    
    return mapDbToApprovalPost(data);
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
    
    return data.map(mapDbToApprovalComment);
  },
  
  async addApprovalFeedback(comment: Partial<ApprovalComment>): Promise<ApprovalComment> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    const dbComment = mapApprovalCommentToDb(comment);
    
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
  
  async updateApprovalStatus(id: string, status: string, profileId?: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
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

// Mappers to handle snake_case to camelCase and JSON parsing
function mapDbToApprovalPost(dbPost: any): ApprovalPost {
  let inferredContentType: 'static' | 'carousel' | 'vertical_video' | 'horizontal_video' = 'static';
  
  if (dbPost.format === 'carousel') {
    inferredContentType = 'carousel';
  } else if (dbPost.format === 'single' || dbPost.format === 'static' || dbPost.format === 'video') {
    // Try to infer from media
    const firstMedia = dbPost.media_urls?.[0];
    if (firstMedia?.type === 'video' || firstMedia?.mimeType?.includes('video')) {
      inferredContentType = 'vertical_video'; // Default to vertical video for simplicity
    } else {
      inferredContentType = 'static';
    }
  } else if (dbPost.format) {
    // Fallback if it matches exactly
    inferredContentType = dbPost.format as any;
  }

  return {
    id: dbPost.id,
    title: dbPost.title || '',
    caption: dbPost.caption || '',
    platform: (dbPost.platforms && dbPost.platforms.length > 0) ? dbPost.platforms[0] : 'Instagram',
    contentType: inferredContentType,
    status: dbPost.status || 'pending',
    thumbnail: dbPost.media_urls?.[0]?.persistedPreview || dbPost.media_urls?.[0]?.previewUrl || '',
    mediaItems: dbPost.media_urls || [],
    publicToken: dbPost.public_token,
    createdAt: dbPost.created_at,
    updatedAt: dbPost.updated_at,
    feedbackCount: 0 // We can fetch this separately if needed
  };
}

function mapApprovalPostToDb(post: Partial<ApprovalPost>, profileId?: string): any {
  const dbPost: any = {};
  
  if (profileId) dbPost.profile_id = profileId;
  if (post.title !== undefined) dbPost.title = post.title;
  if (post.caption !== undefined) dbPost.caption = post.caption;
  if (post.platform !== undefined) dbPost.platforms = [post.platform];
  
  if (post.contentType !== undefined) {
    // Map frontend contentType to DB format
    if (post.contentType === 'carousel') {
      dbPost.format = 'carousel';
    } else {
      dbPost.format = 'single';
    }
  }
  
  if (post.status !== undefined) dbPost.status = post.status;
  if (post.mediaItems !== undefined) dbPost.media_urls = post.mediaItems;
  if (post.publicToken !== undefined) dbPost.public_token = post.publicToken;
  
  return dbPost;
}

function mapDbToApprovalComment(dbComment: any): ApprovalComment {
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
