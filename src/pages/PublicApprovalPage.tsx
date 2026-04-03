import * as React from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  Video,
  Send,
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  MoreHorizontal,
  History,
  Image as ImageIcon
} from 'lucide-react';
import { Card } from '../shared/components/Card';
import { Button } from '../shared/components/Button';
import { Badge } from '../shared/components/Badge';
import { Avatar } from '../shared/components/Avatar';
import { Modal } from '../shared/components/Modal';
import { cn } from '../shared/utils/cn';
import {
  ApprovalPost,
  ApprovalComment,
  loadApprovals,
  loadComments
} from '../modules/approval/ApprovalModule';
import { approvalService } from '../modules/approval/services/approvalService';

export const PublicApprovalPage = () => {
  const { token } = useParams<{ token: string }>();

  const [comment, setComment] = React.useState('');
  const [alertMessage, setAlertMessage] = React.useState<string | null>(null);
  const [post, setPost] = React.useState<ApprovalPost | null>(null);
  const [comments, setComments] = React.useState<ApprovalComment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [carouselIndex, setCarouselIndex] = React.useState(0);

  const loadLocalFallback = React.useCallback((currentToken?: string) => {
    if (!currentToken) {
      setPost(null);
      setComments([]);
      return;
    }

    const loadedApprovals = loadApprovals();
    const localPost = loadedApprovals.find((p) => p.publicToken === currentToken);

    if (localPost) {
      setPost(localPost);

      const loadedComments = loadComments();
      setComments(loadedComments.filter((c) => c.approvalItemId === localPost.id));
    } else {
      setPost(null);
      setComments([]);
    }
  }, []);

  React.useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setIsLoading(false);
        setPost(null);
        setComments([]);
        return;
      }

      setIsLoading(true);

      try {
        const fetchedPost = await approvalService.getApprovalPostByToken(token);

        if (!fetchedPost) {
          loadLocalFallback(token);
          return;
        }

        const normalizedItems = (fetchedPost.mediaItems || []).map((item: any) => {
          const normalizedItem = { ...item };

          if (normalizedItem.previewUrl?.startsWith('blob:')) {
            if (normalizedItem.type === 'video') {
              normalizedItem.previewUrl = '';
            } else {
              normalizedItem.previewUrl =
                normalizedItem.persistedPreview ||
                `https://picsum.photos/seed/${fetchedPost.id}/800/1200`;
            }
          } else if (
            normalizedItem.type === 'video' &&
            normalizedItem.previewUrl &&
            normalizedItem.previewUrl.includes('picsum.photos')
          ) {
            normalizedItem.previewUrl =
              'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
          }

          return normalizedItem;
        });

        const normalizedPost: ApprovalPost = {
          ...fetchedPost,
          mediaItems: normalizedItems
        };

        setPost(normalizedPost);

        const fetchedComments = await approvalService.listApprovalFeedback(
          fetchedPost.id,
          token
        );
        setComments(fetchedComments || []);
      } catch (error) {
        console.error('Failed to load approval data from Supabase:', error);
        loadLocalFallback(token);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token, loadLocalFallback]);

  React.useEffect(() => {
    setCarouselIndex(0);
  }, [post?.id]);

  const handleStatusChange = async (
    newStatus: 'approved' | 'changes_requested' | 'rejected'
  ) => {
    if (!post || !token) return;

    if (
      (newStatus === 'changes_requested' || newStatus === 'rejected') &&
      !comment.trim()
    ) {
      setAlertMessage(
        'Um comentário é obrigatório ao solicitar alterações ou rejeitar o conteúdo.'
      );
      document.getElementById('feedback-input')?.focus();
      return;
    }

    try {
      await approvalService.updateApprovalStatus(post.id, newStatus, undefined, token);

      let updatedComments = [...comments];

      if (comment.trim()) {
        const newCommentData: Partial<ApprovalComment> = {
          approvalItemId: post.id,
          authorType: 'external',
          authorName: 'Revisor do Cliente',
          content: comment.trim()
        };

        const createdComment = await approvalService.addApprovalFeedback(
          newCommentData,
          {
            token,
            status: newStatus
          }
        );

        updatedComments = [...updatedComments, createdComment];
        setComments(updatedComments);
        setComment('');
      }

      setPost({
        ...post,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        feedbackCount: updatedComments.filter((c) => c.approvalItemId === post.id).length
      });
    } catch (error) {
      console.error('Failed to update status:', error);
      setAlertMessage('Não foi possível atualizar o status. Tente novamente.');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!post || !token || !comment.trim()) return;

    try {
      const newCommentData: Partial<ApprovalComment> = {
        approvalItemId: post.id,
        authorType: 'external',
        authorName: 'Revisor do Cliente',
        content: comment.trim()
      };

      const createdComment = await approvalService.addApprovalFeedback(
        newCommentData,
        {
          token,
          status: 'changes_requested'
        }
      );

      const updatedComments = [...comments, createdComment];
      setComments(updatedComments);

      setPost({
        ...post,
        feedbackCount: updatedComments.filter((c) => c.approvalItemId === post.id).length
      });

      setComment('');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setAlertMessage('Não foi possível enviar o feedback. Tente novamente.');
    }
  };

  const getMediaItem = () => {
    if (!post) return null;

    if (
      post.contentType === 'carousel' &&
      post.mediaItems &&
      post.mediaItems.length > 0
    ) {
      return post.mediaItems[carouselIndex];
    }

    if (post.mediaItems && post.mediaItems.length > 0) {
      return post.mediaItems[0];
    }

    return null;
  };

  const mediaItem = getMediaItem();
  const url =
    mediaItem?.previewUrl || mediaItem?.persistedPreview || post?.thumbnail || '';
  const isVideo =
    mediaItem?.type === 'video' &&
    !!mediaItem?.previewUrl &&
    !url.includes('picsum.photos');
  const isLostVideo = mediaItem?.type === 'video' && !mediaItem?.previewUrl;

  const renderMedia = (className: string) => {
    if (!post) return null;

    if (!url) {
      return (
        <div
          className={cn(
            className,
            'bg-gray-800 flex items-center justify-center text-gray-500'
          )}
        >
          {isLostVideo ? (
            <Video className="h-8 w-8 opacity-50" />
          ) : (
            <ImageIcon className="h-8 w-8 opacity-50" />
          )}
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
        <p>Seu navegador não suporta vídeo HTML.</p>
      </video>
    ) : (
      <div className="relative h-full w-full">
        <img
          src={url}
          alt="Prévia"
          className={className}
          referrerPolicy="no-referrer"
        />
        {isLostVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-4 text-center">
            <Video className="h-12 w-12 mb-2 opacity-80" />
            <p className="text-sm font-medium">
              Prévia do vídeo indisponível após atualizar a página.
            </p>
            <p className="text-xs opacity-70 mt-1">
              Anexe o arquivo novamente para reproduzi-lo.
            </p>
          </div>
        )}
      </div>
    );

    if (
      post.contentType === 'carousel' &&
      post.mediaItems &&
      post.mediaItems.length > 1
    ) {
      return (
        <div className="relative h-full w-full group">
          {mediaElement}

          <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCarouselIndex((prev) => Math.max(0, prev - 1));
              }}
              disabled={carouselIndex === 0}
              className="p-1 rounded-full bg-black/50 text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
            >
              ←
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCarouselIndex((prev) =>
                  Math.min((post.mediaItems?.length || 1) - 1, prev + 1)
                );
              }}
              disabled={carouselIndex === (post.mediaItems?.length || 1) - 1}
              className="p-1 rounded-full bg-black/50 text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
            >
              →
            </button>
          </div>
        </div>
      );
    }

    return mediaElement;
  };

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
          <h1 className="text-xl font-bold text-text-primary">
            Link de Aprovação Não Encontrado
          </h1>
          <p className="text-text-secondary">
            Este link pode ser inválido ou ter expirado.
          </p>
        </Card>
      </div>
    );
  }

  const displayPost = {
    ...post,
    handle: '@acme_corp',
    avatar: 'https://picsum.photos/seed/acme/100/100',
    audio: 'Áudio Original - Acme Corp'
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="mb-6 w-full flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand flex items-center justify-center text-white font-bold">
                P
              </div>
              <div>
                <h1 className="font-bold text-text-primary">Aprovação PostHub</h1>
                <p className="text-xs text-text-secondary">
                  Revisando conteúdo para {displayPost.handle}
                </p>
              </div>
            </div>

            <Badge
              variant={
                post.status === 'approved'
                  ? 'success'
                  : post.status === 'changes_requested'
                    ? 'warning'
                    : post.status === 'rejected'
                      ? 'error'
                      : 'default'
              }
            >
              {post.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          <div className="w-full max-w-[400px] bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden mx-auto">
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Avatar src={displayPost.avatar} fallback="AC" size="sm" />
                <span className="text-sm font-bold text-gray-900">
                  {displayPost.handle}
                </span>
              </div>
              <MoreHorizontal className="h-5 w-5 text-gray-500" />
            </div>

            <div
              className={cn(
                'relative bg-gray-100',
                post.contentType === 'carousel' ? 'aspect-[4/5]' : 'aspect-square'
              )}
            >
              {renderMedia('absolute inset-0 h-full w-full object-cover')}
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

              <p className="text-sm font-bold text-gray-900 mb-1">1.234 curtidas</p>

              <p className="text-sm text-gray-900">
                <span className="font-bold mr-2">{displayPost.handle}</span>
                {displayPost.caption}
              </p>
            </div>
          </div>

          <p className="mt-6 text-xs text-text-secondary">
            Esta é uma prévia de alta fidelidade de como seu post ficará no{' '}
            {post.platform}.
          </p>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card className="p-8">
            <h2 className="text-xl font-bold text-text-primary mb-2">
              Revisar Conteúdo
            </h2>
            <p className="text-sm text-text-secondary mb-8">
              Revise a prévia e deixe seu feedback abaixo.
            </p>

            <div className="space-y-4 mb-8">
              <Button
                className={cn(
                  'w-full gap-3 h-14 text-lg',
                  post.status === 'approved' ? 'bg-green-600' : ''
                )}
                onClick={() => handleStatusChange('approved')}
              >
                <CheckCircle className="h-6 w-6" />
                Aprovar Conteúdo
              </Button>

              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="secondary"
                  className={cn(
                    'gap-2 h-12',
                    post.status === 'changes_requested'
                      ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                      : ''
                  )}
                  onClick={() => handleStatusChange('changes_requested')}
                >
                  <MessageSquare className="h-5 w-5" />
                  Solicitar Alterações
                </Button>

                <Button
                  variant="secondary"
                  className={cn(
                    'gap-2 h-12',
                    post.status === 'rejected'
                      ? 'border-red-500 text-red-600 bg-red-50'
                      : ''
                  )}
                  onClick={() => handleStatusChange('rejected')}
                >
                  <XCircle className="h-5 w-5" />
                  Rejeitar
                </Button>

                <Button
                  variant="outline"
                  className="gap-2 h-12"
                  onClick={() => document.getElementById('feedback-input')?.focus()}
                >
                  <MessageSquare className="h-5 w-5" />
                  Deixar Comentário
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">
                  Feedback / Comentários
                </label>

                <textarea
                  id="feedback-input"
                  className="w-full min-h-[120px] rounded-xl border border-gray-200 p-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  placeholder="Escreva seu feedback aqui..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <Button
                variant="secondary"
                className="w-full gap-2"
                disabled={!comment.trim()}
                onClick={handleSubmitFeedback}
              >
                <Send className="h-4 w-4" />
                Enviar Feedback
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-brand" />
              Histórico de Revisão
            </h3>

            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {comments.length > 0 ? (
                comments.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <Avatar
                      fallback={item.authorName.substring(0, 2).toUpperCase()}
                      size="sm"
                    />

                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-text-primary">
                          {item.authorName}
                        </span>
                        <span className="text-[10px] text-text-secondary">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-sm p-3 rounded-xl text-text-secondary bg-gray-50 rounded-tl-none">
                        {item.content}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-text-secondary text-sm">
                  Ainda não há feedbacks ou comentários.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Aviso"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">{alertMessage}</p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setAlertMessage(null)}>
              OK
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
