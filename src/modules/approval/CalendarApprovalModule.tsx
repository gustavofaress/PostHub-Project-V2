import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle,
  Clock3,
  ExternalLink,
  Eye,
  History,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  MoreVertical,
  Play,
  Video,
  Youtube,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { Modal } from '../../shared/components/Modal';
import { Avatar } from '../../shared/components/Avatar';
import { Dropdown, DropdownItem } from '../../shared/components/Dropdown';
import { cn } from '../../shared/utils/cn';
import { useProfile } from '../../app/context/ProfileContext';
import { InternalPreview } from './InternalPreview';
import {
  getApprovalStatusBadgeVariant,
  getApprovalStatusLabel,
  type ApprovalPost,
  type ApprovalStatus,
} from './approval.types';
import { calendarApprovalService } from '../calendar/services/calendarApprovalService';
import type {
  CalendarApprovalDashboardItem,
  CalendarApprovalFeedback,
  CalendarApprovalLink,
} from '../calendar/calendarApproval.types';

const formatPostDate = (value: string) =>
  format(new Date(value), "dd 'de' MMM 'de' yyyy", { locale: ptBR });

const formatDateTime = (value: string) =>
  format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

const formatLinkRange = (link: CalendarApprovalLink) => {
  const start = new Date(`${link.startDate}T12:00:00`);
  const end = new Date(`${link.endDate}T12:00:00`);

  return `${format(start, "dd 'de' MMM", { locale: ptBR })} a ${format(end, "dd 'de' MMM 'de' yyyy", {
    locale: ptBR,
  })}`;
};

const getContentTypeLabel = (contentType: ApprovalPost['contentType']) => {
  switch (contentType) {
    case 'carousel':
      return 'Carrossel';
    case 'vertical_video':
      return 'Vídeo curto';
    case 'horizontal_video':
      return 'Vídeo horizontal';
    case 'static':
    default:
      return 'Imagem';
  }
};

const getContentTypeIcon = (contentType: ApprovalPost['contentType']) => {
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

const getLinkStatusBadgeVariant = (status: CalendarApprovalLink['status']) => {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'expired':
      return 'warning' as const;
    case 'revoked':
      return 'error' as const;
    default:
      return 'default' as const;
  }
};

const getLinkStatusLabel = (status: CalendarApprovalLink['status']) => {
  switch (status) {
    case 'active':
      return 'Link ativo';
    case 'expired':
      return 'Link expirado';
    case 'revoked':
      return 'Link revogado';
    default:
      return 'Link';
  }
};

const flattenFeedback = (item: CalendarApprovalDashboardItem): CalendarApprovalFeedback[] =>
  item.rounds
    .flatMap((round) => round.feedback)
    .sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());

const renderCardCover = (post: ApprovalPost) => {
  let url = post.thumbnail;
  let isVideo = false;
  const isCarousel = post.contentType === 'carousel' && (post.mediaItems?.length || 0) > 1;
  let isLostVideo = false;

  if (post.mediaItems && post.mediaItems.length > 0) {
    const item = post.mediaItems[0];
    url = item.previewUrl || item.persistedPreview || post.thumbnail;
    isVideo = item.type === 'video' && !!item.previewUrl && !url.includes('picsum.photos');
    isLostVideo = item.type === 'video' && !item.previewUrl;
  } else if (typeof post.media === 'object' && post.media !== null) {
    url = post.media.previewUrl || post.thumbnail;
    isVideo = post.media.type === 'video' && !url.includes('picsum.photos');
  } else if (typeof post.media === 'string' && post.media) {
    url = post.media;
    isVideo = !!post.media.match(/\.(mp4|webm|ogg)$/i);
  }

  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-400">
        {isLostVideo ? (
          <Video className="h-8 w-8 opacity-50" />
        ) : (
          <ImageIcon className="h-8 w-8 opacity-50" />
        )}
      </div>
    );
  }

  return (
    <>
      {isVideo ? (
        <video
          src={url}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          muted
          playsInline
        />
      ) : (
        <img
          src={url}
          alt={post.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
      )}
      {(isVideo || isLostVideo || post.contentType?.includes('video')) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/40 p-3 text-white backdrop-blur-sm">
            <Play className="ml-1 h-6 w-6" />
          </div>
        </div>
      )}
      {isCarousel && (
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
          {post.mediaItems?.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'h-1.5 rounded-full shadow-sm',
                idx === 0 ? 'w-4 bg-white' : 'w-1.5 bg-white/70'
              )}
            />
          ))}
        </div>
      )}
    </>
  );
};

export const CalendarApprovalModule = () => {
  const navigate = useNavigate();
  const { activeProfile } = useProfile();
  const activeProfileId = activeProfile?.id ?? null;

  const [items, setItems] = React.useState<CalendarApprovalDashboardItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [alertMessage, setAlertMessage] = React.useState<string | null>(null);
  const [loadErrorMessage, setLoadErrorMessage] = React.useState<string | null>(null);
  const [selectedPreviewPostId, setSelectedPreviewPostId] = React.useState<string | null>(null);
  const [selectedHistoryPostId, setSelectedHistoryPostId] = React.useState<string | null>(null);

  const loadDashboard = React.useCallback(async () => {
    if (!activeProfileId) {
      setItems([]);
      return;
    }

    const data = await calendarApprovalService.listInternalApprovalDashboard(activeProfileId, {
      profileName: activeProfile?.name,
      profileAvatarUrl: activeProfile?.avatar_url,
    });
    setItems(data);
  }, [activeProfile?.avatar_url, activeProfile?.name, activeProfileId]);

  const reloadDashboard = React.useCallback(async () => {
    setIsLoading(true);
    setLoadErrorMessage(null);

    try {
      await loadDashboard();
    } catch (error: any) {
      console.error('[CalendarApprovalModule] Failed to load approval dashboard:', error);
      setLoadErrorMessage(
        error?.message || 'Não foi possível carregar o histórico de aprovações deste perfil.'
      );
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadDashboard]);

  React.useEffect(() => {
    void reloadDashboard();
  }, [reloadDashboard]);

  const selectedPreviewItem = React.useMemo(
    () => items.find((item) => item.calendarPost.id === selectedPreviewPostId) ?? null,
    [items, selectedPreviewPostId]
  );

  const selectedHistoryItem = React.useMemo(
    () => items.find((item) => item.calendarPost.id === selectedHistoryPostId) ?? null,
    [items, selectedHistoryPostId]
  );

  const previewComments = React.useMemo(
    () => (selectedPreviewItem ? flattenFeedback(selectedPreviewItem) : []),
    [selectedPreviewItem]
  );

  const totalPosts = items.length;
  const totalWithRounds = items.filter((item) => item.totalRounds > 0).length;
  const pendingCount = items.filter((item) => item.latestStatus === 'pending').length;
  const approvedCount = items.filter((item) => item.latestStatus === 'approved').length;
  const changesCount = items.filter(
    (item) =>
      item.latestStatus === 'changes_requested' || item.latestStatus === 'rejected'
  ).length;
  const unsentCount = items.filter((item) => item.totalRounds === 0).length;

  const handleCopyLink = React.useCallback(async (link: CalendarApprovalLink) => {
    try {
      await navigator.clipboard.writeText(calendarApprovalService.buildPublicLink(link.publicToken));
      setAlertMessage('Link público copiado para a área de transferência.');
    } catch {
      setAlertMessage('Não foi possível copiar o link público deste histórico.');
    }
  }, []);

  if (selectedPreviewItem) {
    const latestLink = selectedPreviewItem.latestLink;
    const previewDescription =
      selectedPreviewItem.totalRounds > 0
        ? `Última atualização em ${formatDateTime(selectedPreviewItem.lastInteractionAt)}. Use o histórico abaixo para acompanhar cada rodada enviada ao cliente.`
        : 'Este post veio do Calendário Editorial e ainda não recebeu uma rodada pública de aprovação.';

    return (
      <>
        <InternalPreview
          key={selectedPreviewItem.calendarPost.id}
          post={selectedPreviewItem.previewPost}
          comments={previewComments}
          onBack={() => setSelectedPreviewPostId(null)}
          onStatusChange={() => {}}
          onCommentSubmit={() => {}}
          backLabel="Voltar para a Central de Aprovações"
          heading="Preview e Histórico"
          previewHint="A mesma experiência visual do Approval agora está conectada ao Calendário Editorial."
          profileNameOverride={latestLink?.profileName || activeProfile?.name}
          profileAvatarUrlOverride={latestLink?.profileAvatarUrl || activeProfile?.avatar_url}
          emptyHistoryMessage="Este post ainda não possui feedback registrado."
          enableMentions={false}
          readOnly
          readOnlyTitle="Histórico do post"
          readOnlyDescription={previewDescription}
          primaryActionLabel={
            latestLink ? 'Abrir link público' : 'Abrir Calendário Editorial'
          }
          onPrimaryAction={() => {
            if (latestLink) {
              window.open(
                calendarApprovalService.buildPublicLink(latestLink.publicToken),
                '_blank'
              );
              return;
            }

            navigate('/workspace/calendar');
          }}
          secondaryActionLabel="Ver rodadas"
          secondaryActionDataTourId="approval-internal-preview-button"
          onSecondaryAction={() => setSelectedHistoryPostId(selectedPreviewItem.calendarPost.id)}
        />

        <Modal
          isOpen={!!selectedHistoryItem}
          onClose={() => setSelectedHistoryPostId(null)}
          title="Rodadas de aprovação"
          className="sm:max-w-4xl"
        >
          {selectedHistoryItem ? (
            <div className="space-y-6">
              <Card className="space-y-4 border-slate-200 bg-slate-50/80">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-200">
                    {selectedHistoryItem.previewPost.thumbnail ? (
                      <img
                        src={selectedHistoryItem.previewPost.thumbnail}
                        alt={selectedHistoryItem.previewPost.title}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          selectedHistoryItem.latestStatus
                            ? getApprovalStatusBadgeVariant(selectedHistoryItem.latestStatus)
                            : 'info'
                        }
                      >
                        {selectedHistoryItem.latestStatus
                          ? getApprovalStatusLabel(selectedHistoryItem.latestStatus)
                          : 'SEM RODADA'}
                      </Badge>
                      <Badge variant="brand">
                        {selectedHistoryItem.totalRounds} rodada(s)
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">
                      {selectedHistoryItem.previewPost.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                      <span>{formatPostDate(selectedHistoryItem.calendarPost.scheduled_date)}</span>
                      <span>{selectedHistoryItem.previewPost.platform}</span>
                      <span>{getContentTypeLabel(selectedHistoryItem.previewPost.contentType)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {selectedHistoryItem.totalRounds === 0 ? (
                <Card className="border-dashed border-slate-300 bg-white">
                  <div className="space-y-3 text-center">
                    <h4 className="text-base font-semibold text-text-primary">
                      Este post ainda não foi enviado para aprovação
                    </h4>
                    <p className="text-sm text-text-secondary">
                      A criação de novas rodadas agora acontece no Calendário Editorial.
                    </p>
                    <div className="flex justify-center">
                      <Button
                        className="gap-2"
                        onClick={() => {
                          setSelectedHistoryPostId(null);
                          navigate('/workspace/calendar');
                        }}
                      >
                        <CalendarDays className="h-4 w-4" />
                        Abrir Calendário Editorial
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {selectedHistoryItem.rounds.map((round, index) => (
                    <Card key={round.approval.id} className="space-y-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="brand">
                              Rodada {selectedHistoryItem.totalRounds - index}
                            </Badge>
                            <Badge variant={getApprovalStatusBadgeVariant(round.approval.status)}>
                              {getApprovalStatusLabel(round.approval.status)}
                            </Badge>
                            <Badge variant={getLinkStatusBadgeVariant(round.link.status)}>
                              {getLinkStatusLabel(round.link.status)}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-semibold text-text-primary">
                              Período enviado: {formatLinkRange(round.link)}
                            </h4>
                            <p className="text-sm text-text-secondary">
                              Link criado em {formatDateTime(round.link.createdAt)}
                            </p>
                            <p className="text-sm text-text-secondary">
                              Última resposta em {formatDateTime(round.approval.updatedAt)}
                            </p>
                            <p className="text-sm text-text-secondary">
                              Expira em {formatDateTime(round.link.expiresAt)}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            variant="secondary"
                            className="gap-2"
                            onClick={() => void handleCopyLink(round.link)}
                          >
                            <History className="h-4 w-4" />
                            Copiar link
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() =>
                              window.open(
                                calendarApprovalService.buildPublicLink(round.link.publicToken),
                                '_blank'
                              )
                            }
                          >
                            <ExternalLink className="h-4 w-4" />
                            Abrir público
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3 border-t border-slate-100 pt-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                          <MessageSquare className="h-4 w-4 text-brand" />
                          Comentários desta rodada
                        </div>

                        {round.feedback.length > 0 ? (
                          <div className="space-y-3">
                            {round.feedback.map((comment) => (
                              <div
                                key={comment.id}
                                className={cn(
                                  'flex gap-3',
                                  comment.authorType === 'internal' ? 'flex-row-reverse' : ''
                                )}
                              >
                                <Avatar
                                  fallback={comment.authorName.substring(0, 2).toUpperCase()}
                                  size="sm"
                                  className={
                                    comment.authorType === 'internal'
                                      ? 'bg-brand text-white'
                                      : ''
                                  }
                                />
                                <div
                                  className={cn(
                                    'flex max-w-[85%] flex-col',
                                    comment.authorType === 'internal'
                                      ? 'items-end'
                                      : 'items-start'
                                  )}
                                >
                                  <div className="mb-1 flex items-center gap-2">
                                    <span className="text-sm font-semibold text-text-primary">
                                      {comment.authorName}
                                    </span>
                                    <span className="text-[11px] text-text-secondary">
                                      {formatDateTime(comment.createdAt)}
                                    </span>
                                  </div>
                                  <div
                                    className={cn(
                                      'rounded-2xl p-3 text-sm',
                                      comment.authorType === 'internal'
                                        ? 'rounded-tr-none bg-brand text-white'
                                        : 'rounded-tl-none bg-slate-50 text-text-secondary'
                                    )}
                                  >
                                    {comment.content}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-text-secondary">
                            Nenhum comentário foi registrado nesta rodada.
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </Modal>

        <Modal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} title="Aviso">
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">{alertMessage}</p>
            <div className="flex justify-end">
              <Button onClick={() => setAlertMessage(null)}>OK</Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {!activeProfileId ? (
          <Card className="border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-700">
              Nenhum perfil ativo foi encontrado. Selecione um perfil para carregar as aprovações do calendário.
            </p>
          </Card>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
              <CheckCircle className="h-6 w-6 text-brand" />
              Central de Aprovações
            </h1>
            <p className="max-w-3xl text-text-secondary">
              Os posts do Calendário Editorial aparecem aqui com o mockup do Approval, o status mais recente e o histórico completo de cada rodada enviada ao cliente.
            </p>
          </div>

          <Button className="gap-2" onClick={() => navigate('/workspace/calendar')}>
            <CalendarDays className="h-4 w-4" />
            Abrir Calendário Editorial
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="space-y-1">
            <p className="text-sm text-text-secondary">Posts no módulo</p>
            <p className="text-3xl font-bold text-text-primary">{totalPosts}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-sm text-text-secondary">Com histórico</p>
            <p className="text-3xl font-bold text-text-primary">{totalWithRounds}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-sm text-text-secondary">Pendentes</p>
            <p className="text-3xl font-bold text-text-primary">{pendingCount}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-sm text-text-secondary">Aprovados</p>
            <p className="text-3xl font-bold text-text-primary">{approvedCount}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-sm text-text-secondary">Sem rodada</p>
            <p className="text-3xl font-bold text-text-primary">{unsentCount}</p>
          </Card>
        </div>

        <Card className="flex flex-wrap items-center gap-3 bg-slate-50/80">
          <Badge variant="warning">{changesCount} com ajustes ou rejeição</Badge>
          <p className="text-sm text-text-secondary">
            Novas rodadas são geradas pelo Calendário Editorial. Aqui o foco é acompanhar a aprovação e consultar o histórico.
          </p>
        </Card>

        {isLoading ? (
          <Card className="p-8">
            <p className="text-sm text-text-secondary">
              Carregando posts e histórico de aprovação...
            </p>
          </Card>
        ) : loadErrorMessage ? (
          <Card className="space-y-4 p-8">
            <h2 className="text-lg font-semibold text-text-primary">
              Não foi possível carregar a Central de Aprovações
            </h2>
            <p className="text-sm text-text-secondary">{loadErrorMessage}</p>
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2" onClick={() => void reloadDashboard()}>
                <History className="h-4 w-4" />
                Tentar novamente
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => navigate('/workspace/calendar')}
              >
                <CalendarDays className="h-4 w-4" />
                Abrir Calendário
              </Button>
            </div>
          </Card>
        ) : items.length === 0 ? (
          <Card className="space-y-4 p-8 text-center">
            <h2 className="text-lg font-semibold text-text-primary">
              Ainda não há posts do calendário neste perfil
            </h2>
            <p className="text-sm text-text-secondary">
              Assim que você organizar conteúdos no Calendário Editorial, eles passam a aparecer aqui para consulta e histórico.
            </p>
            <div className="flex justify-center">
              <Button className="gap-2" onClick={() => navigate('/workspace/calendar')}>
                <CalendarDays className="h-4 w-4" />
                Ir para o Calendário
              </Button>
            </div>
          </Card>
        ) : (
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}
          >
            {items.map((item, index) => {
              const ContentTypeIcon = getContentTypeIcon(item.previewPost.contentType);
              const hasHistory = item.totalRounds > 0;
              const latestLink = item.latestLink;

              return (
                <Card key={item.calendarPost.id} padding="none" className="group flex flex-col overflow-hidden">
                  <button
                    type="button"
                    className="relative aspect-[4/5] overflow-hidden bg-gray-100 text-left"
                    onClick={() => setSelectedPreviewPostId(item.calendarPost.id)}
                  >
                    {renderCardCover(item.previewPost)}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <Badge
                        variant={
                          item.latestStatus
                            ? getApprovalStatusBadgeVariant(item.latestStatus)
                            : 'info'
                        }
                        className="shadow-sm"
                      >
                        {item.latestStatus
                          ? getApprovalStatusLabel(item.latestStatus)
                          : 'SEM RODADA'}
                      </Badge>
                      <Badge variant="brand" className="shadow-sm">
                        {item.totalRounds} rodada(s)
                      </Badge>
                    </div>
                  </button>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 font-bold text-text-primary">
                          {item.previewPost.title}
                        </h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          Agendado para {formatPostDate(item.calendarPost.scheduled_date)}
                        </p>
                      </div>

                      <Dropdown
                        trigger={
                          <button className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-text-primary">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        }
                      >
                        <DropdownItem onClick={() => setSelectedPreviewPostId(item.calendarPost.id)}>
                          <Eye className="h-4 w-4" />
                          Abrir preview
                        </DropdownItem>
                        <DropdownItem onClick={() => setSelectedHistoryPostId(item.calendarPost.id)}>
                          <History className="h-4 w-4" />
                          Ver histórico
                        </DropdownItem>
                        {latestLink ? (
                          <DropdownItem
                            onClick={() =>
                              window.open(
                                calendarApprovalService.buildPublicLink(latestLink.publicToken),
                                '_blank'
                              )
                            }
                          >
                            <ExternalLink className="h-4 w-4" />
                            Abrir link público
                          </DropdownItem>
                        ) : null}
                        <DropdownItem onClick={() => navigate('/workspace/calendar')}>
                          <CalendarDays className="h-4 w-4" />
                          Abrir calendário
                        </DropdownItem>
                      </Dropdown>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      <div className="flex items-center gap-1">
                        {item.previewPost.platform === 'Instagram' && <ImageIcon className="h-3.5 w-3.5" />}
                        {item.previewPost.platform === 'TikTok' && <Video className="h-3.5 w-3.5" />}
                        {item.previewPost.platform === 'YouTube' && <Youtube className="h-3.5 w-3.5" />}
                        <span>{item.previewPost.platform}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ContentTypeIcon className="h-3.5 w-3.5" />
                        <span>{getContentTypeLabel(item.previewPost.contentType)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{item.totalFeedbackCount} comentário(s)</span>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl bg-slate-50/90 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-text-primary">
                          Última movimentação
                        </span>
                        <span className="text-xs text-text-secondary">
                          {formatDateTime(item.lastInteractionAt)}
                        </span>
                      </div>

                      {hasHistory && latestLink ? (
                        <div className="space-y-2">
                          <p className="text-sm text-text-secondary">
                            Rodada atual: {formatLinkRange(latestLink)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={getLinkStatusBadgeVariant(latestLink.status)}>
                              {getLinkStatusLabel(latestLink.status)}
                            </Badge>
                            <Badge
                              variant={getApprovalStatusBadgeVariant(item.latestStatus || 'pending')}
                            >
                              {getApprovalStatusLabel(item.latestStatus || 'pending')}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-text-secondary">
                          Este post já está no módulo porque veio do calendário, mas ainda não recebeu uma solicitação pública de aprovação.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        className="gap-2"
                        data-tour-id={index === 0 ? 'approval-open-create-button' : undefined}
                        onClick={() => setSelectedPreviewPostId(item.calendarPost.id)}
                      >
                        <Eye className="h-4 w-4" />
                        Abrir preview
                      </Button>
                      <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={() =>
                          hasHistory
                            ? setSelectedHistoryPostId(item.calendarPost.id)
                            : navigate('/workspace/calendar')
                        }
                      >
                        {hasHistory ? (
                          <>
                            <History className="h-4 w-4" />
                            Ver histórico
                          </>
                        ) : (
                          <>
                            <CalendarDays className="h-4 w-4" />
                            Solicitar no calendário
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedHistoryItem}
        onClose={() => setSelectedHistoryPostId(null)}
        title="Histórico de aprovação"
        className="sm:max-w-4xl"
      >
        {selectedHistoryItem ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-text-primary">
                {selectedHistoryItem.previewPost.title}
              </h3>
              <p className="text-sm text-text-secondary">
                Consulte as rodadas enviadas, o status de cada uma e os comentários recebidos.
              </p>
            </div>

            {selectedHistoryItem.totalRounds === 0 ? (
              <Card className="border-dashed border-slate-300 bg-slate-50">
                <div className="space-y-3 text-center">
                  <h4 className="text-base font-semibold text-text-primary">
                    Ainda não há histórico para este post
                  </h4>
                  <p className="text-sm text-text-secondary">
                    A primeira rodada precisa ser criada no Calendário Editorial usando o fluxo de Solicitar Aprovação.
                  </p>
                  <div className="flex justify-center">
                    <Button
                      className="gap-2"
                      onClick={() => {
                        setSelectedHistoryPostId(null);
                        navigate('/workspace/calendar');
                      }}
                    >
                      <CalendarDays className="h-4 w-4" />
                      Abrir Calendário Editorial
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {selectedHistoryItem.rounds.map((round, index) => (
                  <Card key={round.approval.id} className="space-y-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="brand">
                            Rodada {selectedHistoryItem.totalRounds - index}
                          </Badge>
                          <Badge variant={getApprovalStatusBadgeVariant(round.approval.status)}>
                            {getApprovalStatusLabel(round.approval.status)}
                          </Badge>
                          <Badge variant={getLinkStatusBadgeVariant(round.link.status)}>
                            {getLinkStatusLabel(round.link.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-secondary">
                          Período do link: {formatLinkRange(round.link)}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            Criado em {formatDateTime(round.link.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {round.feedback.length} comentário(s)
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          variant="secondary"
                          className="gap-2"
                          onClick={() => void handleCopyLink(round.link)}
                        >
                          <History className="h-4 w-4" />
                          Copiar link
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() =>
                            window.open(
                              calendarApprovalService.buildPublicLink(round.link.publicToken),
                              '_blank'
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                          Abrir público
                        </Button>
                      </div>
                    </div>

                    {round.feedback.length > 0 ? (
                      <div className="space-y-3 border-t border-slate-100 pt-4">
                        {round.feedback.map((comment) => (
                          <div
                            key={comment.id}
                            className={cn(
                              'flex gap-3',
                              comment.authorType === 'internal' ? 'flex-row-reverse' : ''
                            )}
                          >
                            <Avatar
                              fallback={comment.authorName.substring(0, 2).toUpperCase()}
                              size="sm"
                              className={
                                comment.authorType === 'internal' ? 'bg-brand text-white' : ''
                              }
                            />
                            <div
                              className={cn(
                                'flex max-w-[85%] flex-col',
                                comment.authorType === 'internal'
                                  ? 'items-end'
                                  : 'items-start'
                              )}
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <span className="text-sm font-semibold text-text-primary">
                                  {comment.authorName}
                                </span>
                                <span className="text-[11px] text-text-secondary">
                                  {formatDateTime(comment.createdAt)}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  'rounded-2xl p-3 text-sm',
                                  comment.authorType === 'internal'
                                    ? 'rounded-tr-none bg-brand text-white'
                                    : 'rounded-tl-none bg-slate-50 text-text-secondary'
                                )}
                              >
                                {comment.content}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-text-secondary">
                        Nenhum comentário foi registrado nesta rodada.
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} title="Aviso">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">{alertMessage}</p>
          <div className="flex justify-end">
            <Button onClick={() => setAlertMessage(null)}>OK</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
