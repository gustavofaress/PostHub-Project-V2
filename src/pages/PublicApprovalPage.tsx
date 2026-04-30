import * as React from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, MessageSquare, Send, History } from 'lucide-react';
import { Card } from '../shared/components/Card';
import { Button } from '../shared/components/Button';
import { Badge } from '../shared/components/Badge';
import { Avatar } from '../shared/components/Avatar';
import { Modal } from '../shared/components/Modal';
import { cn } from '../shared/utils/cn';
import {
  loadApprovals,
  loadComments
} from '../modules/approval/ApprovalModule';
import { ApprovalContentMockup, getApprovalMockupProfile } from '../modules/approval/ApprovalContentMockup';
import type { ApprovalPost, ApprovalComment } from '../modules/approval/approval.types';
import { approvalService } from '../modules/approval/services/approvalService';

export const PublicApprovalPage = () => {
  const { token } = useParams<{ token: string }>();

  const [comment, setComment] = React.useState('');
  const [alertMessage, setAlertMessage] = React.useState<string | null>(null);
  const [post, setPost] = React.useState<ApprovalPost | null>(null);
  const [comments, setComments] = React.useState<ApprovalComment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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
          profileName: fetchedPost.profileName,
          profileAvatarUrl: fetchedPost.profileAvatarUrl,
          mediaItems: normalizedItems
        };

        if (normalizedPost.profileId && !normalizedPost.profileName) {
          const profileSummary = await approvalService.getApprovalProfileSummary(
            normalizedPost.profileId,
            token
          );

          if (profileSummary) {
            normalizedPost.profileName =
              normalizedPost.profileName || profileSummary.profileName;
            normalizedPost.profileAvatarUrl =
              normalizedPost.profileAvatarUrl || profileSummary.profileAvatarUrl;
          }
        }

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

  const displayProfile = getApprovalMockupProfile(post);

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
                  Revisando conteúdo para {displayProfile.name}
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
              {post.status === 'approved'
                ? 'APROVADO'
                : post.status === 'changes_requested'
                  ? 'AJUSTES SOLICITADOS'
                  : post.status === 'rejected'
                    ? 'REJEITADO'
                    : 'PENDENTE'}
            </Badge>
          </div>

          <ApprovalContentMockup post={post} />

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
