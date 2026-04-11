import * as React from 'react';
import { CheckCircle, XCircle, MessageSquare, Send, History, ArrowLeft } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { Avatar } from '../../shared/components/Avatar';
import { Modal } from '../../shared/components/Modal';
import { cn } from '../../shared/utils/cn';
import { useProfile } from '../../app/context/ProfileContext';
import { useWorkspaceMembers } from '../../hooks/useWorkspaceMembers';
import { buildMemberMentionHandle } from '../../shared/constants/workspaceCollaboration';
import { ApprovalContentMockup, getApprovalMockupProfile } from './ApprovalContentMockup';
import type { ApprovalPost, ApprovalComment } from './ApprovalModule';

interface InternalPreviewProps {
  post: ApprovalPost;
  comments: ApprovalComment[];
  onBack: () => void;
  onStatusChange: (status: 'approved' | 'changes_requested' | 'rejected', comment: string) => void;
  onCommentSubmit: (comment: string) => void;
}

export const InternalPreview: React.FC<InternalPreviewProps> = ({
  post,
  comments,
  onBack,
  onStatusChange,
  onCommentSubmit
}) => {
  const { activeProfile } = useProfile();
  const { activeMembers } = useWorkspaceMembers();
  const [comment, setComment] = React.useState('');
  const [alertMessage, setAlertMessage] = React.useState<string | null>(null);
  const displayProfile = getApprovalMockupProfile(post, {
    profileName: activeProfile?.name,
    profileAvatarUrl: activeProfile?.avatar_url
  });

  const handleStatusChange = (newStatus: 'approved' | 'changes_requested' | 'rejected') => {
    if ((newStatus === 'changes_requested' || newStatus === 'rejected') && !comment.trim()) {
      setAlertMessage('Um comentário é obrigatório ao solicitar alterações ou rejeitar o conteúdo.');
      document.getElementById('internal-feedback-input')?.focus();
      return;
    }
    onStatusChange(newStatus, comment);
    setComment('');
  };

  const handleSubmitFeedback = () => {
    if (!comment.trim()) return;
    onCommentSubmit(comment);
    setComment('');
  };

  const mentionMatch = comment.match(/(^|\s)@([a-z0-9.]*)$/i);
  const mentionQuery = mentionMatch?.[2]?.toLowerCase() ?? '';
  const mentionSuggestions = React.useMemo(() => {
    if (!mentionMatch) return [];

    return activeMembers.filter((member) => {
      const handle = buildMemberMentionHandle(member);
      const haystack = `${member.name} ${member.email} ${handle}`.toLowerCase();
      return haystack.includes(mentionQuery);
    });
  }, [activeMembers, mentionMatch, mentionQuery]);

  const insertMention = (member: (typeof activeMembers)[number]) => {
    const handle = `@${buildMemberMentionHandle(member)}`;
    setComment((current) => current.replace(/(^|\s)@([a-z0-9.]*)$/i, `$1${handle} `));
  };

  const renderCommentWithMentions = (content: string) =>
    content.split(/(\s+)/).map((part, index) => {
      if (!part.trim()) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;

      if (part.startsWith('@')) {
        return (
          <span
            key={`${part}-${index}`}
            className="rounded bg-brand/10 px-1.5 py-0.5 font-medium text-brand"
          >
            {part}
          </span>
        );
      }

      return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Aprovações
        </Button>
        <h2 className="text-xl font-bold text-text-primary">Visualização Interna</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Preview */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="mb-6 w-full flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand flex items-center justify-center text-white font-bold">P</div>
              <div>
                <h1 className="font-bold text-text-primary">Aprovação PostHub</h1>
                <p className="text-xs text-text-secondary">
                  Revisando conteúdo para {displayProfile.name}
                </p>
              </div>
            </div>
            <Badge variant={post.status === 'approved' ? 'success' : post.status === 'changes_requested' ? 'warning' : post.status === 'rejected' ? 'error' : 'default'}>
              {post.status === 'approved'
                ? 'APROVADO'
                : post.status === 'changes_requested'
                ? 'AJUSTES SOLICITADOS'
                : post.status === 'rejected'
                ? 'REJEITADO'
                : 'PENDENTE'}
            </Badge>
          </div>

          <ApprovalContentMockup
            post={post}
            profileName={activeProfile?.name}
            profileAvatarUrl={activeProfile?.avatar_url}
          />
          
          <p className="mt-6 text-xs text-text-secondary text-center">Esta é uma prévia de alta fidelidade de como seu post ficará.</p>
        </div>

        {/* Right Side: Actions & Feedback */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-8">
            <h2 className="text-xl font-bold text-text-primary mb-2">Revisar Conteúdo</h2>
            <p className="text-sm text-text-secondary mb-8">Revise a prévia e deixe seu feedback abaixo.</p>

            <div className="space-y-4 mb-8">
              <Button 
                className={cn("w-full gap-3 h-14 text-lg", post.status === 'approved' ? "bg-green-600" : "")}
                onClick={() => handleStatusChange('approved')}
              >
                <CheckCircle className="h-6 w-6" />
                Aprovar Conteúdo
              </Button>
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  variant="secondary" 
                  className={cn("gap-2 h-12", post.status === 'changes_requested' ? "border-yellow-500 text-yellow-600 bg-yellow-50" : "")}
                  onClick={() => handleStatusChange('changes_requested')}
                >
                  <MessageSquare className="h-5 w-5" />
                  Solicitar Ajustes
                </Button>
                <Button 
                  variant="secondary" 
                  className={cn("gap-2 h-12", post.status === 'rejected' ? "border-red-500 text-red-600 bg-red-50" : "")}
                  onClick={() => handleStatusChange('rejected')}
                >
                  <XCircle className="h-5 w-5" />
                  Rejeitar
                </Button>
                <Button variant="outline" className="gap-2 h-12" onClick={() => document.getElementById('internal-feedback-input')?.focus()}>
                  <MessageSquare className="h-5 w-5" />
                  Deixar Comentário
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Feedback / Comentários</label>
                <textarea 
                  id="internal-feedback-input"
                  className="w-full min-h-[120px] rounded-xl border border-gray-200 p-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  placeholder="Escreva seu feedback aqui..."
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
              {mentionSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {mentionSuggestions.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => insertMention(member)}
                      className="rounded-full border border-brand/20 bg-white px-3 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand/5"
                    >
                      Mencionar {member.name}
                    </button>
                  ))}
                </div>
              ) : null}
              <Button variant="secondary" className="w-full gap-2" disabled={!comment.trim()} onClick={handleSubmitFeedback}>
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
                          {renderCommentWithMentions(comment.content)}
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
            <Button variant="primary" onClick={() => setAlertMessage(null)}>OK</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
