import * as React from 'react';
import { useParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Play,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar } from '../shared/components/Avatar';
import { Badge } from '../shared/components/Badge';
import { Button } from '../shared/components/Button';
import { Card } from '../shared/components/Card';
import { cn } from '../shared/utils/cn';
import { InternalPreview } from '../modules/approval/InternalPreview';
import {
  getApprovalStatusBadgeVariant,
  getApprovalStatusLabel,
  type ApprovalStatus,
} from '../modules/approval/approval.types';
import { calendarApprovalService } from '../modules/calendar/services/calendarApprovalService';
import type {
  CalendarApprovalFeedback,
  CalendarApprovalLink,
  CalendarApprovalListItem,
} from '../modules/calendar/calendarApproval.types';

const formatDateRangeLabel = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  return `${format(start, "dd 'de' MMM", { locale: ptBR })} a ${format(end, "dd 'de' MMM 'de' yyyy", {
    locale: ptBR,
  })}`;
};

const formatGroupDateLabel = (date: string) => {
  const parsedDate = new Date(date);
  const label = format(parsedDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const formatTimeLabel = (date: string) =>
  format(new Date(date), 'HH:mm', { locale: ptBR });

const getContentTypeLabel = (contentType: CalendarApprovalListItem['previewPost']['contentType']) => {
  switch (contentType) {
    case 'carousel':
      return 'Carrossel';
    case 'vertical_video':
      return 'Vídeo vertical';
    case 'horizontal_video':
      return 'Vídeo horizontal';
    case 'static':
    default:
      return 'Imagem';
  }
};

const getContentTypeIcon = (contentType: CalendarApprovalListItem['previewPost']['contentType']) => {
  switch (contentType) {
    case 'carousel':
      return Layers;
    case 'vertical_video':
    case 'horizontal_video':
      return Play;
    case 'static':
    default:
      return ImageIcon;
  }
};

const groupItemsByDate = (items: CalendarApprovalListItem[]) => {
  return items.reduce<Array<{ date: string; items: CalendarApprovalListItem[] }>>((accumulator, item) => {
    const dateKey = item.calendarPost.scheduled_date.slice(0, 10);
    const existingGroup = accumulator.find((group) => group.date === dateKey);

    if (existingGroup) {
      existingGroup.items.push(item);
      return accumulator;
    }

    accumulator.push({ date: dateKey, items: [item] });
    return accumulator;
  }, []);
};

const incrementIfStatusMatches = (items: CalendarApprovalListItem[], status: ApprovalStatus) =>
  items.filter((item) => item.approval.status === status).length;

export const PublicCalendarApprovalPage = () => {
  const { token } = useParams<{ token: string }>();

  const [link, setLink] = React.useState<CalendarApprovalLink | null>(null);
  const [items, setItems] = React.useState<CalendarApprovalListItem[]>([]);
  const [feedback, setFeedback] = React.useState<CalendarApprovalFeedback[]>([]);
  const [selectedPostId, setSelectedPostId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setErrorMessage('Este link pode ser inválido ou ter expirado.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const bundle = await calendarApprovalService.getPublicApprovalBundle(token);
        setLink(bundle.link);
        setItems(bundle.items);
        setFeedback(bundle.feedback);
      } catch (error: any) {
        console.error('[PublicCalendarApprovalPage] Failed to load calendar approval bundle:', error);
        setLink(null);
        setItems([]);
        setFeedback([]);
        setErrorMessage(error?.message || 'Não foi possível carregar este calendário para aprovação.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [token]);

  const selectedItem = React.useMemo(
    () => items.find((item) => item.calendarPost.id === selectedPostId) ?? null,
    [items, selectedPostId]
  );

  const selectedComments = React.useMemo(() => {
    if (!selectedItem) return [];
    return feedback.filter((item) => item.calendarPostId === selectedItem.calendarPost.id);
  }, [feedback, selectedItem]);

  const groupedItems = React.useMemo(() => groupItemsByDate(items), [items]);
  const approvedCount = React.useMemo(() => incrementIfStatusMatches(items, 'approved'), [items]);
  const pendingCount = React.useMemo(() => incrementIfStatusMatches(items, 'pending'), [items]);
  const changesRequestedCount = React.useMemo(
    () => incrementIfStatusMatches(items, 'changes_requested'),
    [items]
  );
  const rejectedCount = React.useMemo(() => incrementIfStatusMatches(items, 'rejected'), [items]);

  const appendFeedback = React.useCallback((entry: CalendarApprovalFeedback) => {
    setFeedback((previous) => [...previous, entry]);
    setItems((previous) =>
      previous.map((item) =>
        item.calendarPost.id === entry.calendarPostId
          ? {
              ...item,
              previewPost: {
                ...item.previewPost,
                feedbackCount: item.previewPost.feedbackCount + 1,
              },
              feedbackCount: item.feedbackCount + 1,
            }
          : item
      )
    );
  }, []);

  const updateItemStatus = React.useCallback(
    (calendarPostId: string, nextStatus: ApprovalStatus) => {
      setItems((previous) =>
        previous.map((item) =>
          item.calendarPost.id === calendarPostId
            ? {
                ...item,
                approval: {
                  ...item.approval,
                  status: nextStatus,
                  updatedAt: new Date().toISOString(),
                },
                previewPost: {
                  ...item.previewPost,
                  status: nextStatus,
                  updatedAt: new Date().toISOString(),
                },
              }
            : item
        )
      );
    },
    []
  );

  const handleStatusChange = React.useCallback(
    async (status: 'approved' | 'changes_requested' | 'rejected', comment: string) => {
      if (!token || !selectedItem) return;

      try {
        await calendarApprovalService.updatePublicApprovalStatus(selectedItem.approval.id, status, token);
        updateItemStatus(selectedItem.calendarPost.id, status);

        if (comment.trim()) {
          const createdFeedback = await calendarApprovalService.addPublicFeedback(
            {
              approvalId: selectedItem.approval.id,
              approvalLinkId: selectedItem.approval.approvalLinkId,
              calendarPostId: selectedItem.calendarPost.id,
              profileId: selectedItem.approval.profileId,
              content: comment,
              status,
            },
            token
          );

          appendFeedback(createdFeedback);
        }
      } catch (error: any) {
        console.error('[PublicCalendarApprovalPage] Failed to update status:', error);
        setErrorMessage(error?.message || 'Não foi possível atualizar o status deste post.');
      }
    },
    [appendFeedback, selectedItem, token, updateItemStatus]
  );

  const handleCommentSubmit = React.useCallback(
    async (comment: string) => {
      if (!token || !selectedItem || !comment.trim()) return;

      try {
        const createdFeedback = await calendarApprovalService.addPublicFeedback(
          {
            approvalId: selectedItem.approval.id,
            approvalLinkId: selectedItem.approval.approvalLinkId,
            calendarPostId: selectedItem.calendarPost.id,
            profileId: selectedItem.approval.profileId,
            content: comment,
          },
          token
        );

        appendFeedback(createdFeedback);
      } catch (error: any) {
        console.error('[PublicCalendarApprovalPage] Failed to send feedback:', error);
        setErrorMessage(error?.message || 'Não foi possível enviar o comentário deste post.');
      }
    },
    [appendFeedback, selectedItem, token]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand" />
      </div>
    );
  }

  if (errorMessage || !link) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <Card className="max-w-lg space-y-4 p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold text-text-primary">Calendário de Aprovação Indisponível</h1>
          <p className="text-sm text-text-secondary">
            {errorMessage || 'Este link pode ser inválido, ter expirado ou não estar mais disponível.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden border-slate-200/80 bg-white/95 p-0 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-brand text-xl font-bold text-white shadow-lg shadow-brand/20">
                  P
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900">Aprovação via Calendário</h1>
                    {rejectedCount > 0 ? (
                      <Badge variant="error">{rejectedCount} rejeitado(s)</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-600">
                    Revisando o planejamento de <span className="font-semibold text-slate-900">{link.profileName || 'Perfil'}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDateRangeLabel(link.startDate, link.endDate)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      Link válido até {format(new Date(link.expiresAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                <Avatar
                  src={link.profileAvatarUrl || undefined}
                  fallback={(link.profileName || 'Perfil').slice(0, 2).toUpperCase()}
                  size="md"
                />
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    Cliente
                  </p>
                  <p className="text-sm font-semibold text-slate-900">{link.profileName || 'Perfil'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
            <Card className="border-slate-200 bg-slate-50/80">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total de posts</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{items.length}</p>
              <p className="mt-1 text-sm text-slate-500">Conteúdos dentro do período selecionado.</p>
            </Card>
            <Card className="border-green-100 bg-green-50/80">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700/60">Aprovados</p>
              <p className="mt-3 text-3xl font-bold text-green-700">{approvedCount}</p>
              <p className="mt-1 text-sm text-green-700/80">Posts liberados para seguir.</p>
            </Card>
            <Card className="border-slate-200 bg-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pendentes</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{pendingCount}</p>
              <p className="mt-1 text-sm text-slate-500">Ainda aguardando decisão do cliente.</p>
            </Card>
            <Card className="border-amber-100 bg-amber-50/90">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700/60">Alterações</p>
              <p className="mt-3 text-3xl font-bold text-amber-700">{changesRequestedCount}</p>
              <p className="mt-1 text-sm text-amber-700/80">Posts com ajustes solicitados.</p>
            </Card>
          </div>
        </Card>

        {items.length === 0 ? (
          <Card className="p-8 text-center">
            <h2 className="text-lg font-bold text-text-primary">Nenhum post disponível</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Não encontramos posts desse período para exibir neste link.
            </p>
          </Card>
        ) : (
          groupedItems.map((group) => (
            <section key={group.date} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <div className="h-px flex-1 bg-slate-200" />
                <h2 className="shrink-0 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {formatGroupDateLabel(group.date)}
                </h2>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => {
                  const ContentTypeIcon = getContentTypeIcon(item.previewPost.contentType);

                  return (
                    <button
                      key={item.calendarPost.id}
                      type="button"
                      onClick={() => setSelectedPostId(item.calendarPost.id)}
                      className={cn(
                        'group w-full rounded-[28px] text-left transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand/30',
                        'active:scale-[0.99]'
                      )}
                    >
                      <Card className="h-full overflow-hidden border-slate-200/90 bg-white/95 p-0 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
                        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                          {item.previewPost.thumbnail ? (
                            <img
                              src={item.previewPost.thumbnail}
                              alt={item.previewPost.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-slate-200 text-slate-500">
                              <ContentTypeIcon className="h-10 w-10" />
                            </div>
                          )}

                          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                            <Badge variant={getApprovalStatusBadgeVariant(item.approval.status)}>
                              {getApprovalStatusLabel(item.approval.status)}
                            </Badge>
                            <Badge variant="default" className="bg-white/85 text-slate-700 backdrop-blur">
                              {item.previewPost.platform}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-4 p-5">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="line-clamp-2 text-lg font-bold text-slate-900">
                                  {item.previewPost.title}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                  {formatTimeLabel(item.calendarPost.scheduled_date)} • {getContentTypeLabel(item.previewPost.contentType)}
                                </p>
                              </div>
                              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-brand" />
                            </div>

                            <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                              {item.previewPost.caption || 'Sem legenda cadastrada ainda para este post.'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
                                <ContentTypeIcon className="h-3.5 w-3.5" />
                                {getContentTypeLabel(item.previewPost.contentType)}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5" />
                                {item.feedbackCount} comentário(s)
                              </span>
                            </div>

                            <Button size="sm" className="gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Abrir preview
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm">
          <div className="h-full overflow-y-auto">
            <div className="min-h-full p-0 sm:p-6">
              <div className="min-h-full rounded-none bg-slate-100 px-4 py-5 sm:mx-auto sm:min-h-0 sm:max-w-7xl sm:rounded-[32px] sm:px-6 sm:py-6">
                <InternalPreview
                  post={selectedItem.previewPost}
                  comments={selectedComments}
                  onBack={() => setSelectedPostId(null)}
                  onStatusChange={(status, comment) => void handleStatusChange(status, comment)}
                  onCommentSubmit={(comment) => void handleCommentSubmit(comment)}
                  backLabel="Voltar para o calendário"
                  heading="Revisão do conteúdo"
                  previewHint={`Esta é a mesma experiência de preview utilizada no fluxo de aprovação do PostHub para ${selectedItem.previewPost.platform}.`}
                  profileNameOverride={link.profileName}
                  profileAvatarUrlOverride={link.profileAvatarUrl}
                  emptyHistoryMessage="Ainda não há comentários para este post."
                  enableMentions={false}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
