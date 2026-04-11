import * as React from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { cn } from '../utils/cn';
import {
  buildMemberMentionHandle,
  DEMAND_ENTITY_META,
  DemandEntityType,
  type WorkspaceTaskComment,
} from '../constants/workspaceCollaboration';
import type { TeamMember } from '../constants/workspaceMembers';
import { workspaceCollaborationService } from '../../services/workspace-collaboration.service';

interface TaskCommentsPanelProps {
  profileId?: string | null;
  entityType: DemandEntityType;
  entityId?: string | null;
  currentUserName: string;
  currentUserId?: string | null;
  members: TeamMember[];
  assignedMemberIds?: string[];
}

const renderCommentWithMentions = (content: string) => {
  return content.split(/(\s+)/).map((part, index) => {
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
};

export const TaskCommentsPanel = ({
  profileId,
  entityType,
  entityId,
  currentUserName,
  currentUserId,
  members,
  assignedMemberIds = [],
}: TaskCommentsPanelProps) => {
  const [comments, setComments] = React.useState<WorkspaceTaskComment[]>([]);
  const [draft, setDraft] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  const availableMembers = React.useMemo(() => {
    const memberPool =
      assignedMemberIds.length > 0
        ? members.filter((member) => assignedMemberIds.includes(member.id))
        : members;

    return memberPool.filter((member) => member.status !== 'disabled');
  }, [assignedMemberIds, members]);

  const mentionMatch = draft.match(/(^|\s)@([a-z0-9.]*)$/i);
  const mentionQuery = mentionMatch?.[2]?.toLowerCase() ?? '';

  const mentionSuggestions = React.useMemo(() => {
    if (!mentionMatch) return [];

    return availableMembers.filter((member) => {
      const handle = buildMemberMentionHandle(member);
      const haystack = `${member.name} ${member.email} ${handle}`.toLowerCase();
      return haystack.includes(mentionQuery);
    });
  }, [availableMembers, mentionMatch, mentionQuery]);

  const loadComments = React.useCallback(async () => {
    if (!profileId || !entityId) {
      setComments([]);
      return;
    }

    setIsLoading(true);

    try {
      const data = await workspaceCollaborationService.listComments(
        profileId,
        entityType,
        entityId
      );
      setComments(data);
    } catch (error) {
      console.error('[TaskCommentsPanel] Failed to load comments:', error);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [entityId, entityType, profileId]);

  React.useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const insertMention = (member: TeamMember) => {
    const handle = `@${buildMemberMentionHandle(member)}`;
    setDraft((current) => current.replace(/(^|\s)@([a-z0-9.]*)$/i, `$1${handle} `));
  };

  const handleSend = async () => {
    if (!profileId || !entityId || !draft.trim()) return;

    setIsSending(true);

    try {
      await workspaceCollaborationService.addComment({
        profileId,
        entityType,
        entityId,
        authorName: currentUserName,
        authorUserId: currentUserId,
        content: draft.trim(),
      });
      setDraft('');
      await loadComments();
    } catch (error) {
      console.error('[TaskCommentsPanel] Failed to send comment:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!entityId) {
    return (
      <Card className="border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-text-secondary">
        Salve a demanda primeiro para liberar comentários e menções.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-text-primary">
          <MessageSquare className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold">Comentários da demanda</span>
        </div>

        <textarea
          rows={4}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escreva um comentário. Use @ para mencionar um membro vinculado."
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
        />

        {mentionSuggestions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
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

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-text-secondary">
            {availableMembers.length > 0
              ? 'Somente membros vinculados aparecem nas sugestões de menção.'
              : 'Nenhum membro vinculado a esta demanda ainda.'}
          </p>

          <Button
            type="button"
            className="gap-2"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || isSending}
            isLoading={isSending}
          >
            <Send className="h-4 w-4" />
            Enviar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-4 text-sm text-text-secondary">Carregando comentários...</Card>
      ) : comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-4">
              <Avatar fallback={comment.authorName} size="sm" className="bg-brand/10 text-brand" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{comment.authorName}</p>
                  <span className="text-xs text-text-secondary">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                  {renderCommentWithMentions(comment.content)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-gray-200 bg-white p-4 text-sm text-text-secondary">
          {DEMAND_ENTITY_META[entityType].emptyCommentLabel}
        </Card>
      )}
    </div>
  );
};
