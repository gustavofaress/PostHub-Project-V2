import * as React from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Layers3,
  StickyNote,
  Trello,
} from 'lucide-react';
import { Avatar } from '../../shared/components/Avatar';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import type {
  ClientProfileDetail as ClientProfileDetailData,
  ClientTaskSummary,
} from '../../services/client-operations.service';
import type { WorkspaceModule } from '../../shared/constants/navigation';
import type { ClientOperationsVisibleModules } from './types';
import { ClientNotesPanel } from './ClientNotesPanel';
import { ClientTimeline } from './ClientTimeline';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sem atividade recente';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getStatusBadge = (status: ClientProfileDetailData['stats']['status']) => {
  switch (status) {
    case 'active':
      return { label: 'Operação ativa', variant: 'success' as const };
    case 'inactive':
      return { label: 'Pouca atividade', variant: 'warning' as const };
    case 'idle':
    default:
      return { label: 'Sem atividade recente', variant: 'default' as const };
  }
};

const getApprovalBadgeVariant = (status: string) => {
  if (status === 'approved') return 'success' as const;
  if (status === 'rejected') return 'error' as const;
  if (status === 'changes_requested') return 'warning' as const;
  return 'info' as const;
};

const TASK_MODULE_LABELS: Record<ClientTaskSummary['moduleId'], string> = {
  approval: 'Aprovação',
  calendar: 'Calendário',
  ideas: 'Ideias',
  kanban: 'Kanban',
  references: 'Referências',
};

const getVisibleTaskCount = (
  detail: ClientProfileDetailData,
  visibleModules: ClientOperationsVisibleModules
) =>
  (visibleModules.calendar ? detail.stats.openCalendarItemsCount : 0) +
  (visibleModules.approval ? detail.stats.openApprovalItemsCount : 0) +
  (visibleModules.ideas ? detail.stats.assignedIdeaTasksCount : 0) +
  (visibleModules.references ? detail.stats.assignedReferenceTasksCount : 0);

const getVisibleTimeline = (
  detail: ClientProfileDetailData,
  visibleModules: ClientOperationsVisibleModules
) =>
  detail.timeline.filter((event) => {
    if (event.moduleId === 'notes') return true;
    if (event.moduleId === 'calendar') return visibleModules.calendar;
    if (event.moduleId === 'approval') return visibleModules.approval;
    if (event.moduleId === 'ideas') return visibleModules.ideas;
    if (event.moduleId === 'references') return visibleModules.references;
    return false;
  });

const getVisibleTasks = (
  tasks: ClientTaskSummary[],
  visibleModules: ClientOperationsVisibleModules
) =>
  tasks.filter((task) => {
    if (task.moduleId === 'calendar') return visibleModules.calendar;
    if (task.moduleId === 'approval') return visibleModules.approval;
    if (task.moduleId === 'ideas') return visibleModules.ideas;
    if (task.moduleId === 'references') return visibleModules.references;
    return false;
  });

const ModuleShortcut = ({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-[78px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-brand/35 hover:bg-brand/5"
  >
    <div className="rounded-2xl bg-brand/10 p-3 text-brand">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-xs text-slate-500">Abrir este cliente no módulo</p>
    </div>
    <ExternalLink className="ml-auto h-4 w-4 text-slate-400" />
  </button>
);

export const ClientProfileDetail = ({
  detail,
  visibleModules,
  isActiveProfile,
  isLoading,
  errorMessage,
  noteDraft,
  noteErrorMessage,
  isSavingNote,
  onNoteDraftChange,
  onSaveNote,
  onBack,
  onActivateProfile,
  onOpenModule,
}: {
  detail: ClientProfileDetailData | null;
  visibleModules: ClientOperationsVisibleModules;
  isActiveProfile: boolean;
  isLoading: boolean;
  errorMessage?: string | null;
  noteDraft: string;
  noteErrorMessage?: string | null;
  isSavingNote: boolean;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
  onBack: () => void;
  onActivateProfile: () => void;
  onOpenModule: (moduleId: WorkspaceModule) => void;
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="h-[520px] animate-pulse rounded-3xl bg-slate-100" />
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <Card>
        <div className="flex flex-col gap-4">
          <Button variant="ghost" className="w-fit gap-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Voltar para clientes
          </Button>
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        </div>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card>
        <EmptyState
          title="Cliente não encontrado"
          description="Esse perfil não está disponível na sua conta ou ainda não pode ser carregado."
          icon={Layers3}
        />
      </Card>
    );
  }

  const statusBadge = getStatusBadge(detail.stats.status);
  const visibleTimeline = getVisibleTimeline(detail, visibleModules);
  const visibleTasks = getVisibleTasks(detail.tasks, visibleModules);
  const visibleTaskCount = getVisibleTaskCount(detail, visibleModules);

  return (
    <div className="space-y-6">
      <Card className="overflow-visible border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <Button variant="ghost" className="mb-3 w-fit gap-2 px-0" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
                Voltar para clientes
              </Button>

              <div className="flex min-w-0 items-center gap-4">
                <Avatar
                  src={detail.profile.avatarUrl}
                  fallback={detail.profile.name}
                  size="lg"
                  className="h-16 w-16 text-lg"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-3xl font-semibold tracking-tight text-slate-950">
                      {detail.profile.name}
                    </h1>
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                    {isActiveProfile ? <Badge variant="brand">Perfil ativo</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Última atividade registrada em {formatDateTime(detail.stats.lastActivityAt)}.
                  </p>
                </div>
              </div>
            </div>

            {!isActiveProfile ? (
              <Button variant="secondary" onClick={onActivateProfile}>
                Tornar perfil ativo
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {visibleModules.calendar ? (
              <ModuleShortcut
                label="Abrir Calendário"
                icon={CalendarDays}
                onClick={() => onOpenModule('calendar')}
              />
            ) : null}
            {visibleModules.kanban ? (
              <ModuleShortcut
                label="Abrir Kanban"
                icon={Trello}
                onClick={() => onOpenModule('kanban')}
              />
            ) : null}
            {visibleModules.approval ? (
              <ModuleShortcut
                label="Abrir Aprovações"
                icon={CheckCircle2}
                onClick={() => onOpenModule('approval')}
              />
            ) : null}
            {visibleModules.references ? (
              <ModuleShortcut
                label="Abrir Referências"
                icon={BookOpen}
                onClick={() => onOpenModule('references')}
              />
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleModules.calendar ? (
          <Card>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Posts no calendário
            </div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">
              {detail.stats.postsInCalendarCount}
            </div>
            <p className="mt-2 text-sm text-slate-500">Itens já organizados neste cliente.</p>
          </Card>
        ) : null}

        {visibleModules.approval ? (
          <Card>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Aprovações pendentes
            </div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">
              {detail.stats.pendingApprovalsCount}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Conteúdos aguardando retorno ou ajustes.
            </p>
          </Card>
        ) : null}

        <Card>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Tarefas em andamento
          </div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{visibleTaskCount}</div>
          <p className="mt-2 text-sm text-slate-500">
            Demandas abertas em produção e acompanhamento.
          </p>
        </Card>

        <Card>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Notas internas
          </div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">
            {detail.stats.notesCount}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Observações operacionais já registradas neste perfil.
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ClientTimeline events={visibleTimeline} />

        <div className="space-y-6">
          {visibleModules.approval ? (
            <Card>
              <div className="mb-5">
                <CardTitle>Aprovações Recentes</CardTitle>
                <CardDescription className="mt-1">
                  Últimos conteúdos enviados para feedback deste cliente.
                </CardDescription>
              </div>

              {detail.recentApprovals.length === 0 ? (
                <EmptyState
                  title="Nenhuma aprovação recente"
                  description="Quando conteúdos forem enviados para aprovação, eles aparecem aqui."
                  icon={CheckCircle2}
                  className="py-8"
                />
              ) : (
                <div className="space-y-3">
                  {detail.recentApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{approval.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Atualizado em {formatDateTime(approval.updatedAt)}
                          </p>
                        </div>
                        <Badge variant={getApprovalBadgeVariant(approval.status)}>
                          {approval.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          {visibleModules.calendar ? (
            <Card>
              <div className="mb-5">
                <CardTitle>Conteúdos Agendados</CardTitle>
                <CardDescription className="mt-1">
                  Próximos itens programados no calendário editorial.
                </CardDescription>
              </div>

              {detail.scheduledContent.length === 0 ? (
                <EmptyState
                  title="Nada agendado ainda"
                  description="Os próximos posts deste cliente serão listados aqui."
                  icon={CalendarDays}
                  className="py-8"
                />
              ) : (
                <div className="space-y-3">
                  {detail.scheduledContent.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(item.scheduledAt)}
                          </p>
                        </div>
                        <Badge variant="brand">{item.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          <Card>
            <div className="mb-5">
              <CardTitle>Tarefas</CardTitle>
              <CardDescription className="mt-1">
                Demandas vinculadas ao cliente com status e responsáveis.
              </CardDescription>
            </div>

            {visibleTasks.length === 0 ? (
              <EmptyState
                title="Nenhuma tarefa em destaque"
                description="Quando houver demandas ativas neste perfil, elas aparecem aqui."
                icon={Layers3}
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {visibleTasks.map((task) => (
                  <div
                    key={`${task.entityType}-${task.id}`}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-slate-900">{task.title}</p>
                          <Badge variant="default">{TASK_MODULE_LABELS[task.moduleId]}</Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                          {task.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {task.assignedMembers.length > 0 ? (
                            task.assignedMembers.map((member) => (
                              <span
                                key={member.id}
                                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                              >
                                {member.name}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                              Sem responsável
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <Badge variant="brand">{task.status}</Badge>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatDateTime(task.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <ClientNotesPanel
            notes={detail.notes}
            draft={noteDraft}
            onDraftChange={onNoteDraftChange}
            onSubmit={onSaveNote}
            isSaving={isSavingNote}
            errorMessage={noteErrorMessage}
          />
        </div>
      </div>
    </div>
  );
};
