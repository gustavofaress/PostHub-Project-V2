import * as React from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Lightbulb,
  MessageSquare,
  Send,
  StickyNote,
  XCircle,
} from 'lucide-react';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { EmptyState } from '../../shared/components/EmptyState';
import { cn } from '../../shared/utils/cn';
import type { ClientTimelineEvent } from '../../services/client-operations.service';

const MODULE_LABELS: Record<ClientTimelineEvent['moduleId'], string> = {
  approval: 'Aprovação',
  calendar: 'Calendário',
  ideas: 'Ideias',
  kanban: 'Kanban',
  notes: 'Notas',
  references: 'Referências',
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const getEventMeta = (eventType: ClientTimelineEvent['eventType']) => {
  switch (eventType) {
    case 'calendar_created':
      return {
        icon: CalendarDays,
        tone: 'bg-sky-50 text-sky-600 ring-sky-100',
        label: 'Post criado',
      };
    case 'calendar_scheduled':
      return {
        icon: Clock3,
        tone: 'bg-blue-50 text-blue-600 ring-blue-100',
        label: 'Conteúdo agendado',
      };
    case 'approval_sent':
      return {
        icon: Send,
        tone: 'bg-amber-50 text-amber-600 ring-amber-100',
        label: 'Enviado para aprovação',
      };
    case 'approval_approved':
      return {
        icon: CheckCircle2,
        tone: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
        label: 'Aprovado',
      };
    case 'approval_rejected':
      return {
        icon: XCircle,
        tone: 'bg-rose-50 text-rose-600 ring-rose-100',
        label: 'Rejeitado',
      };
    case 'approval_changes_requested':
      return {
        icon: MessageSquare,
        tone: 'bg-orange-50 text-orange-600 ring-orange-100',
        label: 'Ajustes solicitados',
      };
    case 'approval_comment':
      return {
        icon: MessageSquare,
        tone: 'bg-violet-50 text-violet-600 ring-violet-100',
        label: 'Comentário recebido',
      };
    case 'idea_created':
      return {
        icon: Lightbulb,
        tone: 'bg-yellow-50 text-yellow-700 ring-yellow-100',
        label: 'Ideia criada',
      };
    case 'reference_created':
      return {
        icon: BookOpen,
        tone: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
        label: 'Referência adicionada',
      };
    case 'note_created':
      return {
        icon: StickyNote,
        tone: 'bg-slate-100 text-slate-700 ring-slate-200',
        label: 'Nota interna',
      };
    case 'workspace_comment':
    default:
      return {
        icon: MessageSquare,
        tone: 'bg-slate-100 text-slate-700 ring-slate-200',
        label: 'Comentário interno',
      };
  }
};

export const ClientTimeline = ({ events }: { events: ClientTimelineEvent[] }) => {
  return (
    <Card className="h-full">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <CardTitle>Timeline do Cliente</CardTitle>
          <CardDescription className="mt-1">
            Histórico cronológico do que aconteceu neste perfil.
          </CardDescription>
        </div>
        <Badge variant="brand">{events.length} eventos</Badge>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="Sem movimentações ainda"
          description="Assim que houver atividade no perfil, a timeline começa a ser preenchida aqui."
          icon={Clock3}
          className="py-10"
        />
      ) : (
        <div className="space-y-4">
          {events.map((event, index) => {
            const meta = getEventMeta(event.eventType);
            const Icon = meta.icon;

            return (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1',
                      meta.tone
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {index < events.length - 1 ? (
                    <div className="mt-2 h-full w-px flex-1 bg-slate-200" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info">{meta.label}</Badge>
                      <Badge variant="default">{MODULE_LABELS[event.moduleId]}</Badge>
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      {formatDateTime(event.occurredAt)}
                    </div>
                  </div>

                  <div className="mt-3 text-sm">
                    <p className="font-semibold text-slate-900">{event.title}</p>
                    <p className="mt-1 leading-6 text-slate-600">{event.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
