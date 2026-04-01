import * as React from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Instagram, 
  Youtube, 
  Video, 
  Send,
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  MoreHorizontal,
  Music2,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Plus,
  History,
  Image as ImageIcon
} from 'lucide-react';
import { Card } from '../shared/components/Card';
import { Button } from '../shared/components/Button';
import { Input } from '../shared/components/Input';
import { Badge } from '../shared/components/Badge';
import { Avatar } from '../shared/components/Avatar';
import { Modal } from '../shared/components/Modal';
import { cn } from '../shared/utils/cn';
import { ApprovalPost, ApprovalComment, STORAGE_KEY_ITEMS, STORAGE_KEY_COMMENTS, loadApprovals, loadComments } from '../modules/approval/ApprovalModule';
import { approvalService } from '../modules/approval/services/approvalService';

export const PublicApprovalPage = () => {
  const { token } = useParams();
  const [comment, setComment] = React.useState('');
  const [alertMessage, setAlertMessage] = React.useState<string | null>(null);
  
  const [post, setPost] = React.useState<ApprovalPost | null>(null);
  const [comments, setComments] = React.useState<ApprovalComment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
        const fetchedPost = await approvalService.getApprovalPostByToken(token);
        if (fetchedPost) {
          // Fix object URLs that are broken after refresh (legacy support)
          let items = fetchedPost.mediaItems || [];
          items = items.map((item: any) => {
            if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
              if (item.type === 'video') {
                item.previewUrl = ''; // Lost video blob
              } else {
                item.previewUrl = item.persistedPreview || `https://picsum.photos/seed/${fetchedPost.id}/800/1200`;
              }
            } else if (item.type === 'video' && item.previewUrl && item.previewUrl.includes('picsum.photos')) {
              item.previewUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
            }
            return item;
          });
          fetchedPost.mediaItems = items;
          
          setPost(fetchedPost);
          
          const fetchedComments = await approvalService.listApprovalFeedback(fetchedPost.id);
          setComments(fetchedComments);
        } else {
          // Fallback to local storage
          const loadedApprovals = loadApprovals();
          const localPost = loadedApprovals.find(p => p.publicToken === token);
          if (localPost) {
            setPost(localPost);
            const loadedComments = loadComments();
            setComments(loadedComments.filter(c => c.approvalItemId === localPost.id));
          }
        }
      } catch (e) {
        console.error('Failed to load approval data from Supabase:', e);
        // Fallback to local storage
        const loadedApprovals = loadApprovals();
        const localPost = loadedApprovals.find(p => p.publicToken === token);
        if (localPost) {
          setPost(localPost);
          const loadedComments = loadComments();
          setComments(loadedComments.filter(c => c.approvalItemId === localPost.id));
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-text-primary">Approval Link Not Found</h1>
          <p className="text-text-secondary">This link may be invalid or has expired.</p>
        </Card>
      </div>
    );
  }

  const displayPost = {
    ...post,
    handle: '@acme_corp',
    avatar: 'https://picsum.photos/seed/acme/100/100',
    audio: 'Original Audio - Acme Corp'
  };

  const handleStatusChange = async (newStatus: 'approved' | 'changes_requested' | 'rejected') => {
    if ((newStatus === 'changes_requested' || newStatus === 'rejected') && !comment.trim()) {
      setAlertMessage('A comment is required when requesting changes or rejecting content.');
      document.getElementById('feedback-input')?.focus();
      return;
    }

    try {
      await approvalService.updateApprovalStatus(post.id, newStatus);
      
      let updatedPost = { ...post, status: newStatus, updatedAt: new Date().toISOString() };

      if (comment.trim()) {
        const newCommentData: Partial<ApprovalComment> = {
          approvalItemId: post.id,
          authorType: 'external',
          authorName: 'Client Reviewer',
          content: comment,
        };
        
        const createdComment = await approvalService.addApprovalFeedback(newCommentData);
        setComments([...comments, createdComment]);
        
        updatedPost = { ...updatedPost, feedbackCount: updatedPost.feedbackCount + 1 };
        setComment('');
      }

      setPost(updatedPost as ApprovalPost);
    } catch (e) {
      console.error('Failed to update status:', e);
      setAlertMessage('Failed to update status. Please try again.');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!comment.trim()) return;
    
    try {
      const newCommentData: Partial<ApprovalComment> = {
        approvalItemId: post.id,
        authorType: 'external',
        authorName: 'Client Reviewer',
        content: comment,
      };
      
      const createdComment = await approvalService.addApprovalFeedback(newCommentData);
      setComments([...comments, createdComment]);
      
      const updatedPost = { ...post, feedbackCount: post.feedbackCount + 1 };
      setPost(updatedPost as ApprovalPost);
      
      setComment('');
    } catch (e) {
      console.error('Failed to submit feedback:', e);
      setAlertMessage('Failed to submit feedback. Please try again.');
    }
  };

  const [carouselIndex, setCarouselIndex] = React.useState(0);

  const getMediaItem = () => {
    if (post.contentType === 'carousel' && post.mediaItems && post.mediaItems.length > 0) {
      return post.mediaItems[carouselIndex];
    }
    if (post.mediaItems && post.mediaItems.length > 0) {
      return post.mediaItems[0];
    }
    return null;
  };

  const mediaItem = getMediaItem();
  const url = mediaItem?.previewUrl || mediaItem?.persistedPreview || post.thumbnail || '';
  const isVideo = mediaItem?.type === 'video' && !!mediaItem?.previewUrl && !url.includes('picsum.photos');
  const isLostVideo = mediaItem?.type === 'video' && !mediaItem?.previewUrl;

  const renderMedia = (className: string) => {
    if (!url) {
      return (
        <div className={cn(className, "bg-gray-800 flex items-center justify-center text-gray-500")}>
          {isLostVideo ? <Video className="h-8 w-8 opacity-50" /> : <ImageIcon className="h-8 w-8 opacity-50" />}
        </div>
      );
    }

    const mediaElement = isVideo ? (
      <video 
        src={url} 
        className={className} 
        controls 
        autoPlay 
        muted={false} 
        loop 
        playsInline
      >
        <p>Your browser does not support HTML video.</p>
      </video>
    ) : (
      <div className="relative h-full w-full">
        <img 
          src={url} 
          alt="Preview" 
          className={className} 
          referrerPolicy="no-referrer" 
        />
        {isLostVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-4 text-center">
            <Video className="h-12 w-12 mb-2 opacity-80" />
            <p className="text-sm font-medium">Video preview unavailable after refresh.</p>
            <p className="text-xs opacity-70 mt-1">Reattach the file to play it again.</p>
          </div>
        )}
      </div>
    );

    if (post.contentType === 'carousel' && post.mediaItems && post.mediaItems.length > 1) {
      return (
        <div className="relative h-full w-full group">
          {mediaElement}
          <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); setCarouselIndex(prev => Math.max(0, prev - 1)); }}
              disabled={carouselIndex === 0}
              className="p-1 rounded-full bg-black/50 text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setCarouselIndex(prev => Math.min((post.mediaItems?.length || 1) - 1, prev + 1)); }}
              disabled={carouselIndex === (post.mediaItems?.length || 1) - 1}
              className="p-1 rounded-full bg-black/50 text-white disabled:opacity-30 hover:bg-black/70 transition-colors rotate-180"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </button>
          </div>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
            {post.mediaItems.map((_, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === carouselIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                )}
              />
            ))}
          </div>
        </div>
      );
    }

    return mediaElement;
  };

  const renderFeedMockup = () => (
    <div className="w-full max-w-[400px] bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden mx-auto">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Avatar src={displayPost.avatar} fallback="AC" size="sm" />
          <span className="text-sm font-bold text-gray-900">{displayPost.handle}</span>
        </div>
        <MoreHorizontal className="h-5 w-5 text-gray-500" />
      </div>
      
      <div className={cn("relative bg-gray-100", post.contentType === 'carousel' ? "aspect-[4/5]" : "aspect-square")}>
        {renderMedia("absolute inset-0 h-full w-full object-cover")}
      </div>
      
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Heart className="h-6 w-6 text-gray-900" />
            <MessageCircle className="h-6 w-6 text-gray-900" />
            <Share className="h-6 w-6 text-gray-900" />
          </div>
          <Bookmark className="h-6 w-6 text-gray-900" />
        </div>
        <p className="text-sm font-bold text-gray-900 mb-1">1,234 likes</p>
        <p className="text-sm text-gray-900">
          <span className="font-bold mr-2">{displayPost.handle}</span>
          {displayPost.caption}
        </p>
      </div>
    </div>
  );

  const renderInstagramMockup = () => (
    <div className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-[3rem] border-[8px] border-gray-900 shadow-2xl overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-8 pt-4 z-20 text-white">
        <span className="text-xs font-bold">9:41</span>
        <div className="flex gap-1">
          <div className="h-1 w-4 bg-white rounded-full" />
          <div className="h-1 w-4 bg-white/50 rounded-full" />
        </div>
      </div>
      {renderMedia("h-full w-full object-cover")}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10">
        <div className="flex items-center gap-2 mb-3">
          <Avatar src={displayPost.avatar} fallback="AC" size="sm" className="border-white" />
          <span className="text-sm font-bold">{displayPost.handle}</span>
          <button className="text-xs font-bold border border-white rounded px-2 py-0.5">Follow</button>
        </div>
        <p className="text-sm mb-3 line-clamp-2">{displayPost.caption}</p>
        <div className="flex items-center gap-2 text-xs">
          <Music2 className="h-3 w-3" />
          <span className="truncate">{displayPost.audio}</span>
        </div>
      </div>
      <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4 text-white z-10">
        <div className="flex flex-col items-center"><Heart className="h-7 w-7" /><span className="text-xs font-medium">1.2k</span></div>
        <div className="flex flex-col items-center"><MessageCircle className="h-7 w-7" /><span className="text-xs font-medium">84</span></div>
        <div className="flex flex-col items-center"><Share className="h-7 w-7" /></div>
        <div className="flex flex-col items-center"><Bookmark className="h-7 w-7" /></div>
        <MoreHorizontal className="h-7 w-7" />
      </div>
    </div>
  );

  const renderTikTokMockup = () => (
    <div className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-[3rem] border-[8px] border-gray-900 shadow-2xl overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-8 pt-4 z-20 text-white">
        <span className="text-xs font-bold">9:41</span>
        <div className="flex gap-1">
          <div className="h-1 w-4 bg-white rounded-full" />
          <div className="h-1 w-4 bg-white/50 rounded-full" />
        </div>
      </div>
      {renderMedia("h-full w-full object-cover")}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-16 p-4 text-white z-10">
        <span className="text-sm font-bold mb-2 block">{displayPost.handle}</span>
        <p className="text-sm mb-3 line-clamp-3">{displayPost.caption}</p>
        <div className="flex items-center gap-2 text-xs font-medium">
          <Music2 className="h-3 w-3" />
          <span className="truncate">{displayPost.audio}</span>
        </div>
      </div>
      <div className="absolute right-2 bottom-4 flex flex-col items-center gap-6 text-white z-10">
        <div className="relative">
          <Avatar src={displayPost.avatar} fallback="AC" size="md" className="border-2 border-white" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 rounded-full p-0.5">
            <Plus className="h-3 w-3" />
          </div>
        </div>
        <div className="flex flex-col items-center"><Heart className="h-8 w-8" /><span className="text-xs font-medium">1.2k</span></div>
        <div className="flex flex-col items-center"><MessageCircle className="h-8 w-8" /><span className="text-xs font-medium">84</span></div>
        <div className="flex flex-col items-center"><Bookmark className="h-8 w-8" /><span className="text-xs font-medium">12</span></div>
        <div className="flex flex-col items-center"><Share className="h-8 w-8" /><span className="text-xs font-medium">Share</span></div>
        <div className="h-10 w-10 rounded-full bg-gray-800 border-[10px] border-gray-900 animate-spin-slow flex items-center justify-center">
          <Music2 className="h-3 w-3" />
        </div>
      </div>
    </div>
  );

  const renderYouTubeMockup = () => (
    <div className="relative w-full max-w-[600px] bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
      <div className="aspect-video bg-black relative">
        {renderMedia("h-full w-full object-cover opacity-90")}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600/30">
          <div className="h-full w-1/3 bg-red-600" />
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{displayPost.title}</h3>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar src={displayPost.avatar} fallback="AC" size="md" />
            <div>
              <p className="font-bold text-sm text-gray-900">{displayPost.handle.replace('@', '')}</p>
              <p className="text-xs text-gray-500">1.2M subscribers</p>
            </div>
            <button className="ml-2 bg-black text-white text-sm font-bold px-4 py-2 rounded-full">Subscribe</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-full">
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-r border-gray-200 hover:bg-gray-200 rounded-l-full">
                <ThumbsUp className="h-4 w-4" /> 12K
              </button>
              <button className="px-4 py-2 hover:bg-gray-200 rounded-r-full">
                <ThumbsDown className="h-4 w-4" />
              </button>
            </div>
            <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full text-sm font-medium">
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </div>
        <div className="bg-gray-100 rounded-xl p-3 text-sm">
          <p className="font-medium mb-1">124K views  •  2 hours ago</p>
          <p className="text-gray-800 whitespace-pre-wrap">{displayPost.caption}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Preview */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="mb-6 w-full flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand flex items-center justify-center text-white font-bold">P</div>
              <div>
                <h1 className="font-bold text-text-primary">PostHub Approval</h1>
                <p className="text-xs text-text-secondary">Reviewing content for {displayPost.handle}</p>
              </div>
            </div>
            <Badge variant={post.status === 'approved' ? 'success' : post.status === 'changes_requested' ? 'warning' : post.status === 'rejected' ? 'error' : 'default'}>
              {post.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Platform Mockup */}
          {(() => {
            if (post.contentType === 'static' || post.contentType === 'carousel') {
              return renderFeedMockup();
            }
            if (post.contentType === 'vertical_video') {
              return renderTikTokMockup();
            }
            if (post.contentType === 'horizontal_video') {
              return renderYouTubeMockup();
            }
            // Fallback
            return renderFeedMockup();
          })()}
          
          <p className="mt-6 text-xs text-text-secondary">This is a high-fidelity preview of how your post will look on {post.platform}.</p>
        </div>

        {/* Right Side: Actions & Feedback */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-8">
            <h2 className="text-xl font-bold text-text-primary mb-2">Review Content</h2>
            <p className="text-sm text-text-secondary mb-8">Please review the preview and provide your feedback below.</p>

            <div className="space-y-4 mb-8">
              <Button 
                className={cn("w-full gap-3 h-14 text-lg", post.status === 'approved' ? "bg-green-600" : "")}
                onClick={() => handleStatusChange('approved')}
              >
                <CheckCircle className="h-6 w-6" />
                Approve Content
              </Button>
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  variant="secondary" 
                  className={cn("gap-2 h-12", post.status === 'changes_requested' ? "border-yellow-500 text-yellow-600 bg-yellow-50" : "")}
                  onClick={() => handleStatusChange('changes_requested')}
                >
                  <MessageSquare className="h-5 w-5" />
                  Request Changes
                </Button>
                <Button 
                  variant="secondary" 
                  className={cn("gap-2 h-12", post.status === 'rejected' ? "border-red-500 text-red-600 bg-red-50" : "")}
                  onClick={() => handleStatusChange('rejected')}
                >
                  <XCircle className="h-5 w-5" />
                  Reject
                </Button>
                <Button variant="outline" className="gap-2 h-12" onClick={() => document.getElementById('feedback-input')?.focus()}>
                  <MessageSquare className="h-5 w-5" />
                  Leave Comment
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Feedback / Comments</label>
                <textarea 
                  id="feedback-input"
                  className="w-full min-h-[120px] rounded-xl border border-gray-200 p-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  placeholder="Write your feedback here..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitFeedback();
                    }
                  }}
                />
              </div>
              <Button variant="secondary" className="w-full gap-2" disabled={!comment.trim()} onClick={handleSubmitFeedback}>
                <Send className="h-4 w-4" />
                Submit Feedback
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-brand" />
              Review History
            </h3>
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {comments.filter(c => c.approvalItemId === post.id).length > 0 ? (
                comments
                  .filter(c => c.approvalItemId === post.id)
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map(comment => (
                    <div key={comment.id} className={cn("flex gap-3", comment.authorType === 'external' ? "" : "flex-row-reverse")}>
                      <Avatar 
                        fallback={comment.authorName.substring(0, 2).toUpperCase()} 
                        size="sm" 
                        className={comment.authorType === 'external' ? "" : "bg-brand text-white"} 
                      />
                      <div className={cn("flex flex-col", comment.authorType === 'external' ? "items-start" : "items-end")}>
                        <div className="flex items-center gap-2 mb-1">
                          {comment.authorType === 'external' ? (
                            <>
                              <span className="text-sm font-bold text-text-primary">{comment.authorName}</span>
                              <span className="text-[10px] text-text-secondary">{new Date(comment.createdAt).toLocaleString()}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] text-text-secondary">{new Date(comment.createdAt).toLocaleString()}</span>
                              <span className="text-sm font-bold text-text-primary">{comment.authorName}</span>
                            </>
                          )}
                        </div>
                        <p className={cn(
                          "text-sm p-3 rounded-xl",
                          comment.authorType === 'external' 
                            ? "text-text-secondary bg-gray-50 rounded-tl-none"
                            : "text-white bg-brand rounded-tr-none" 
                        )}>
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-text-secondary text-sm">
                  No feedback or comments yet.
                </div>
              )}
            </div>
          </Card>
        </div>

      </div>

      <Modal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Notice"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">{alertMessage}</p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setAlertMessage(null)}>OK</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
