import * as React from 'react';
import { Building2, CalendarDays, Clock3, Search, Sparkles } from 'lucide-react';
import { Avatar } from '../../shared/components/Avatar';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import type { ClientProfileSummary } from '../../services/client-operations.service';

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sem atividade recente';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getStatusBadge = (status: ClientProfileSummary['status']) => {
  switch (status) {
    case 'active':
      return { label: 'Ativo', variant: 'success' as const };
    case 'inactive':
      return { label: 'Baixa atividade', variant: 'warning' as const };
    case 'idle':
    default:
      return { label: 'Sem atividade recente', variant: 'default' as const };
  }
};

const sumVisibleTaskCount = (profile: ClientProfileSummary) => profile.inProgressTasksCount;

export const ClientProfilesList = ({
  profiles,
  searchTerm,
  onSearchTermChange,
  activeProfileId,
  isMemberView,
  isLoading,
  errorMessage,
  onSelectProfile,
}: {
  profiles: ClientProfileSummary[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  activeProfileId?: string | null;
  isMemberView?: boolean;
  isLoading: boolean;
  errorMessage?: string | null;
  onSelectProfile: (profileId: string) => void;
}) => {
  const totalPendingApprovals = profiles.reduce(
    (total, profile) => total + profile.pendingApprovalsCount,
    0
  );
  const totalTasks = profiles.reduce((total, profile) => total + sumVisibleTaskCount(profile), 0);
  const inactiveClients = profiles.filter((profile) => profile.status !== 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            Novo Módulo
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Central de Clientes
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            {isMemberView
              ? 'Um painel operacional dos clientes vinculados ao workspace em que você atua, com agenda, aprovações, tarefas, histórico e contexto interno.'
              : 'Um painel operacional da carteira de clientes da conta master, com agenda, aprovações, tarefas, histórico e contexto interno.'}
          </p>
        </div>

        <div className="w-full max-w-md">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Buscar cliente por nome"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Buscar cliente por nome"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Clientes</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{profiles.length}</p>
              <p className="mt-2 text-sm text-slate-500">
                {isMemberView
                  ? 'Clientes do workspace aos quais você tem acesso.'
                  : 'Perfis de clientes cadastrados nesta conta master.'}
              </p>
            </div>
            <div className="rounded-2xl bg-brand/10 p-3 text-brand">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Aprovações pendentes</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{totalPendingApprovals}</p>
              <p className="mt-2 text-sm text-slate-500">Itens aguardando decisão ou ajustes.</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <Clock3 className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Tarefas em andamento</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{totalTasks}</p>
              <p className="mt-2 text-sm text-slate-500">
                Demandas abertas em produção, aprovação e acompanhamento.
              </p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Clientes frios</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{inactiveClients}</p>
              <p className="mt-2 text-sm text-slate-500">
                Perfis sem atividade recente ou com pouca movimentação.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
              <Clock3 className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="animate-pulse">
              <div className="h-28 rounded-2xl bg-slate-100" />
            </Card>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Quando houver perfis disponíveis nesta conta, eles aparecem aqui com o resumo operacional."
            icon={Building2}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {profiles.map((profile) => {
            const statusBadge = getStatusBadge(profile.status);

            return (
              <Card key={profile.id} className="border-slate-200/90">
                <div className="flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <Avatar
                        src={profile.avatarUrl}
                        fallback={profile.name}
                        size="lg"
                        className="h-14 w-14 text-base"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-semibold text-slate-950">
                            {profile.name}
                          </h3>
                          {activeProfileId === profile.id ? (
                            <Badge variant="brand">Perfil ativo</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Última atividade: {formatDateTime(profile.lastActivityAt)}
                        </p>
                      </div>
                    </div>

                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Calendário
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-950">
                        {profile.postsInCalendarCount}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Aprovações
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-950">
                        {profile.pendingApprovalsCount}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Tarefas
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-950">
                        {sumVisibleTaskCount(profile)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="secondary" onClick={() => onSelectProfile(profile.id)}>
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
