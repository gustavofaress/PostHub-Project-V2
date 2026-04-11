import * as React from 'react';
import {
  ArrowUpRight,
  Copy,
  FolderKanban,
  KeyRound,
  Mail,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { Input } from '../../shared/components/Input';
import { Modal } from '../../shared/components/Modal';
import { Tabs } from '../../shared/components/Tabs';
import { Avatar } from '../../shared/components/Avatar';
import { useAuth } from '../../app/context/AuthContext';
import { useProfile } from '../../app/context/ProfileContext';
import { useSearchParams } from 'react-router-dom';
import { LockedModuleState } from '../../shared/components/LockedModuleState';
import { hasAccess } from '../../shared/constants/plans';
import {
  DEFAULT_MEMBER_PERMISSIONS,
  WORKSPACE_PERMISSION_OPTIONS,
  type TeamMemberRole,
  type TeamPermissionId,
} from '../../shared/constants/workspaceMembers';
import { useWorkspaceMembers } from '../../hooks/useWorkspaceMembers';
import { useWorkspacePermissions } from '../../hooks/useWorkspacePermissions';
import { MemberAssignmentField } from '../../shared/components/MemberAssignmentField';
import { workspaceMembersService, type InviteWorkspaceMemberResult } from '../../services/workspace-members.service';
import { workspaceCollaborationService } from '../../services/workspace-collaboration.service';
import type {
  WorkspaceDemandItem,
  WorkspaceTaskAssignment,
} from '../../shared/constants/workspaceCollaboration';

type SettingsTab = 'members' | 'demands';

const DEMAND_STATUS_OPTIONS = [
  'Planned',
  'Draft',
  'Review',
  'Published',
  'Backlog',
  'Drafting',
  'pending',
  'approved',
  'changes_requested',
  'rejected',
];

const generatePasswordPreview = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  return Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
    ''
  );
};

const formatPermissionLabel = (permissionId: TeamPermissionId) =>
  WORKSPACE_PERMISSION_OPTIONS.find((permission) => permission.id === permissionId)?.label ||
  permissionId;

export const SettingsArea = () => {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeMembers, members, isLoadingMembers, reloadMembers } = useWorkspaceMembers();
  const { canManageMembers } = useWorkspacePermissions();

  const canUseTeamMembers = hasAccess(user?.currentPlan, 'team', user?.isAdmin);

  const [activeTab, setActiveTab] = React.useState<SettingsTab>(
    searchParams.get('tab') === 'demands' ? 'demands' : 'members'
  );
  const [alertMessage, setAlertMessage] = React.useState<string | null>(null);

  const [isMemberModalOpen, setIsMemberModalOpen] = React.useState(false);
  const [memberName, setMemberName] = React.useState('');
  const [memberEmail, setMemberEmail] = React.useState('');
  const [memberRole, setMemberRole] = React.useState<Exclude<TeamMemberRole, 'owner'>>('editor');
  const [memberPermissions, setMemberPermissions] =
    React.useState<TeamPermissionId[]>(DEFAULT_MEMBER_PERMISSIONS);
  const [memberPassword, setMemberPassword] = React.useState(generatePasswordPreview());
  const [createdInvite, setCreatedInvite] = React.useState<InviteWorkspaceMemberResult | null>(null);
  const [isCreatingMember, setIsCreatingMember] = React.useState(false);

  const [demands, setDemands] = React.useState<WorkspaceDemandItem[]>([]);
  const [assignments, setAssignments] = React.useState<WorkspaceTaskAssignment[]>([]);
  const [isLoadingDemands, setIsLoadingDemands] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [moduleFilter, setModuleFilter] = React.useState<string>('all');
  const [selectedDemand, setSelectedDemand] = React.useState<WorkspaceDemandItem | null>(null);
  const [demandTitle, setDemandTitle] = React.useState('');
  const [demandDescription, setDemandDescription] = React.useState('');
  const [demandStatus, setDemandStatus] = React.useState('');
  const [demandMemberIds, setDemandMemberIds] = React.useState<string[]>([]);
  const [isSavingDemand, setIsSavingDemand] = React.useState(false);

  const resetMemberForm = React.useCallback(() => {
    setMemberName('');
    setMemberEmail('');
    setMemberRole('editor');
    setMemberPermissions(DEFAULT_MEMBER_PERMISSIONS);
    setMemberPassword(generatePasswordPreview());
    setCreatedInvite(null);
  }, []);

  const openMemberModal = () => {
    resetMemberForm();
    setIsMemberModalOpen(true);
  };

  const loadDemandData = React.useCallback(async () => {
    if (!activeProfile?.id) {
      setDemands([]);
      setAssignments([]);
      return;
    }

    setIsLoadingDemands(true);

    try {
      const [demandData, assignmentData] = await Promise.all([
        workspaceCollaborationService.listDemandItems(activeProfile.id),
        workspaceCollaborationService.listAssignments(activeProfile.id),
      ]);

      setDemands(demandData);
      setAssignments(assignmentData);
    } catch (error) {
      console.error('[SettingsArea] Failed to load demand data:', error);
      setDemands([]);
      setAssignments([]);
    } finally {
      setIsLoadingDemands(false);
    }
  }, [activeProfile?.id]);

  React.useEffect(() => {
    void loadDemandData();
  }, [loadDemandData]);

  React.useEffect(() => {
    setActiveTab(searchParams.get('tab') === 'demands' ? 'demands' : 'members');
  }, [searchParams]);

  const togglePermission = (permissionId: TeamPermissionId) => {
    setMemberPermissions((current) =>
      current.includes(permissionId)
        ? current.filter((value) => value !== permissionId)
        : [...current, permissionId]
    );
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setAlertMessage('Copiado para a área de transferência.');
      window.setTimeout(() => setAlertMessage(null), 2000);
    } catch (error) {
      console.error('[SettingsArea] Failed to copy text:', error);
      setAlertMessage('Não foi possível copiar o valor agora.');
    }
  };

  const handleCreateMember = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!activeProfile?.id) {
      setAlertMessage('Selecione um perfil antes de criar membros.');
      return;
    }

    if (!memberEmail.trim()) {
      setAlertMessage('Informe o email do membro.');
      return;
    }

    setIsCreatingMember(true);
    setAlertMessage(null);

    try {
      const result = await workspaceMembersService.invite({
        profileId: activeProfile.id,
        name: memberName,
        email: memberEmail,
        role: memberRole,
        permissions: memberPermissions,
        generatedPassword: memberPassword,
      });

      setCreatedInvite(result);
      await reloadMembers();
      setAlertMessage('Membro criado com acesso liberado ao workspace.');
    } catch (error: any) {
      console.error('[SettingsArea] Failed to create member:', error);
      setAlertMessage(error?.message || 'Não foi possível criar o membro.');
    } finally {
      setIsCreatingMember(false);
    }
  };

  const filteredDemands = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return demands.filter((demand) => {
      const matchesModule = moduleFilter === 'all' ? true : demand.moduleId === moduleFilter;
      const haystack = `${demand.title} ${demand.description} ${demand.status} ${demand.moduleLabel}`.toLowerCase();
      const matchesSearch = query ? haystack.includes(query) : true;
      return matchesModule && matchesSearch;
    });
  }, [demands, moduleFilter, searchTerm]);

  const demandAssignmentsCount = React.useMemo(
    () => new Set(assignments.map((assignment) => `${assignment.entityType}:${assignment.entityId}`)).size,
    [assignments]
  );

  const openDemandEditor = React.useCallback(
    async (demand: WorkspaceDemandItem) => {
      setSelectedDemand(demand);
      setDemandTitle(demand.title);
      setDemandDescription(demand.description);
      setDemandStatus(demand.status);

      if (!activeProfile?.id) {
        setDemandMemberIds([]);
        return;
      }

      const assignedMembers = await workspaceCollaborationService.getAssignedMemberIds(
        activeProfile.id,
        demand.entityType,
        demand.id
      );
      setDemandMemberIds(assignedMembers);
    },
    [activeProfile?.id]
  );

  const handleSaveDemand = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedDemand || !activeProfile?.id) return;

    setIsSavingDemand(true);

    try {
      await workspaceCollaborationService.updateDemandItem({
        profileId: activeProfile.id,
        entityType: selectedDemand.entityType,
        entityId: selectedDemand.id,
        title: demandTitle.trim(),
        description: demandDescription.trim(),
        status: demandStatus.trim(),
      });

      await workspaceCollaborationService.setAssignedMembers(
        activeProfile.id,
        selectedDemand.entityType,
        selectedDemand.id,
        demandMemberIds
      );

      setSelectedDemand(null);
      await loadDemandData();
      setAlertMessage('Demanda atualizada com sucesso.');
    } catch (error: any) {
      console.error('[SettingsArea] Failed to save demand:', error);
      setAlertMessage(error?.message || 'Não foi possível atualizar a demanda.');
    } finally {
      setIsSavingDemand(false);
    }
  };

  if (!canUseTeamMembers) {
    return (
      <LockedModuleState
        feature="team"
        title="Organização de demandas é exclusiva do plano PRO"
        description="Ative o PRO para criar membros ilimitados, controlar acessos por módulo e distribuir as demandas da operação."
      />
    );
  }

  if (!canManageMembers) {
    return (
      <LockedModuleState
        feature="team"
        title="Somente admins podem organizar este workspace"
        description="Este painel centraliza membros, permissões e vínculos das demandas. Peça ao administrador para ajustar o acesso da equipe."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Organização de Demandas do Workspace
          </h1>
          <p className="text-text-secondary">
            Centralize membros, permissões, vínculos de tarefas e comentários operacionais do perfil ativo.
          </p>
          {activeProfile && (
            <p className="mt-2 text-sm text-text-secondary">
              Perfil ativo: <span className="font-medium text-text-primary">{activeProfile.name}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="brand">Plano PRO</Badge>
          <Badge>Membros ilimitados</Badge>
          <Button className="gap-2" onClick={openMemberModal}>
            <Plus className="h-4 w-4" />
            Adicionar membro
          </Button>
        </div>
      </div>

      {alertMessage ? (
        <Card className="border-brand/20 bg-brand/5 p-4 text-sm text-brand">{alertMessage}</Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Membros ativos</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{activeMembers.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Demandas mapeadas</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{demands.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <FolderKanban className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Demandas com responsáveis</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{demandAssignmentsCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      <Tabs
        tabs={[
          { id: 'members', label: 'Membros e acessos' },
          { id: 'demands', label: 'Demandas do workspace' },
        ]}
        activeTab={activeTab}
        onChange={(value) => {
          const nextTab = value as SettingsTab;
          setActiveTab(nextTab);
          setSearchParams(nextTab === 'demands' ? { tab: 'demands' } : { tab: 'members' });
        }}
      />

      {activeTab === 'members' ? (
        <Card>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <CardTitle>Equipe vinculada</CardTitle>
              <CardDescription>
                Cada membro recebe um email, uma senha automática e acesso somente aos módulos liberados.
              </CardDescription>
            </div>

            <Button variant="secondary" className="gap-2" onClick={openMemberModal}>
              <Plus className="h-4 w-4" />
              Novo membro
            </Button>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-brand/10 bg-brand/[0.04] p-4">
              <div className="flex items-start gap-3">
                <Avatar fallback={user?.name || activeProfile?.name || 'PH'} size="sm" className="bg-brand text-white" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">
                      {user?.name || 'Administrador do workspace'}
                    </p>
                    <Badge variant="brand">Owner / Admin</Badge>
                  </div>
                  <p className="text-xs text-text-secondary">{user?.email}</p>
                  <p className="mt-2 text-xs text-text-secondary">
                    Responsável por criar membros, gerenciar acessos e editar o fluxo das demandas.
                  </p>
                </div>
              </div>
            </div>

            {isLoadingMembers ? (
              <Card className="p-4 text-sm text-text-secondary">Carregando membros...</Card>
            ) : members.length > 0 ? (
              members.map((member) => (
                <div key={member.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar fallback={member.name} size="sm" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-text-primary">{member.name}</p>
                          <Badge>{member.role}</Badge>
                          <Badge variant={member.status === 'active' ? 'brand' : 'default'}>
                            {member.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-text-secondary">{member.email}</p>
                        <p className="mt-2 text-xs text-text-secondary">
                          Último envio de acesso:{' '}
                          {new Date(member.inviteSentAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {member.permissions.length > 0 ? (
                        member.permissions.map((permission) => (
                          <span
                            key={permission}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-text-secondary"
                          >
                            {formatPermissionLabel(permission)}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-text-secondary">
                          Sem módulos liberados
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <Card className="border-dashed border-gray-200 bg-gray-50 p-5 text-center">
                <p className="text-sm text-text-secondary">
                  Ainda não há membros adicionais neste workspace.
                </p>
              </Card>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Demandas centralizadas</CardTitle>
              <CardDescription>
                Edite o título, status, descrição e responsáveis das demandas sem sair das configurações.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por título, módulo ou status..."
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand"
                />
              </div>

              <select
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-brand"
              >
                <option value="all">Todos os módulos</option>
                <option value="calendar">Calendário / Kanban</option>
                <option value="ideas">Ideias</option>
                <option value="references">Referências</option>
                <option value="approval">Aprovação</option>
              </select>
            </div>
          </div>

          {isLoadingDemands ? (
            <Card className="p-4 text-sm text-text-secondary">Carregando demandas...</Card>
          ) : filteredDemands.length > 0 ? (
            <div className="space-y-3">
              {filteredDemands.map((demand) => {
                const demandMemberCount = assignments.filter(
                  (assignment) =>
                    assignment.entityType === demand.entityType && assignment.entityId === demand.id
                ).length;

                return (
                  <button
                    key={`${demand.entityType}-${demand.id}`}
                    type="button"
                    onClick={() => void openDemandEditor(demand)}
                    className="flex w-full flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left transition-all hover:border-brand/30 hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant="brand">{demand.moduleLabel}</Badge>
                          <Badge>{demand.status}</Badge>
                          <Badge>{demandMemberCount} membro(s)</Badge>
                        </div>
                        <p className="text-sm font-semibold text-text-primary">{demand.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
                          {demand.description || 'Sem descrição cadastrada.'}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 text-sm font-medium text-brand">
                        Editar demanda
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-gray-200 bg-gray-50 p-5 text-center">
              <p className="text-sm text-text-secondary">
                Nenhuma demanda encontrada com os filtros atuais.
              </p>
            </Card>
          )}
        </Card>
      )}

      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title="Adicionar membro ao workspace"
        className="max-w-3xl"
      >
        <form onSubmit={handleCreateMember} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nome do membro"
              placeholder="Ex.: Ana Souza"
              value={memberName}
              onChange={(event) => setMemberName(event.target.value)}
            />

            <Input
              label="Email do membro"
              type="email"
              placeholder="ana@empresa.com"
              value={memberEmail}
              onChange={(event) => setMemberEmail(event.target.value)}
              icon={<Mail className="h-4 w-4" />}
              required
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Cargo operacional</label>
              <select
                value={memberRole}
                onChange={(event) =>
                  setMemberRole(event.target.value as Exclude<TeamMemberRole, 'owner'>)
                }
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-brand"
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="reviewer">Reviewer</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Senha automática</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Input
                    value={memberPassword}
                    onChange={(event) => setMemberPassword(event.target.value)}
                    icon={<KeyRound className="h-4 w-4" />}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2 sm:shrink-0"
                  onClick={() => setMemberPassword(generatePasswordPreview())}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Gerar
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-text-primary">Módulos liberados</p>
              <p className="text-xs text-text-secondary">
                O membro poderá usar e criar demandas somente nos módulos selecionados abaixo.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {WORKSPACE_PERMISSION_OPTIONS.map((permission) => {
                const isSelected = memberPermissions.includes(permission.id);

                return (
                  <button
                    key={permission.id}
                    type="button"
                    onClick={() => togglePermission(permission.id)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-brand bg-brand/5'
                        : 'border-gray-200 hover:border-brand/30 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-xl p-2 ${isSelected ? 'bg-brand text-white' : 'bg-gray-100 text-text-secondary'}`}>
                        <permission.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{permission.label}</p>
                        <p className="mt-1 text-xs leading-5 text-text-secondary">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {createdInvite ? (
            <Card className="border-brand/20 bg-brand/[0.05]">
              <div className="mb-4">
                <CardTitle className="text-base">Acesso gerado para o membro</CardTitle>
                <CardDescription>
                  Compartilhe a senha e o link abaixo com segurança. O login é exclusivo para membros.
                </CardDescription>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Senha automática
                  </p>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3">
                    <span className="min-w-0 break-all font-mono text-sm text-text-primary">
                      {createdInvite.generatedPassword}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-brand"
                      onClick={() => void handleCopy(createdInvite.generatedPassword)}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Link de login
                  </p>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3">
                    <span className="min-w-0 truncate text-sm text-text-primary">
                      {createdInvite.loginUrl}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-brand"
                      onClick={() => void handleCopy(createdInvite.loginUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-between">
            <Button type="button" variant="secondary" onClick={() => setIsMemberModalOpen(false)}>
              Fechar
            </Button>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="secondary" onClick={resetMemberForm}>
                Limpar
              </Button>
              <Button type="submit" isLoading={isCreatingMember}>
                Criar membro
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!selectedDemand}
        onClose={() => setSelectedDemand(null)}
        title={selectedDemand ? `Editar demanda: ${selectedDemand.moduleLabel}` : 'Editar demanda'}
        className="max-w-3xl"
      >
        {selectedDemand ? (
          <form onSubmit={handleSaveDemand} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Título"
                value={demandTitle}
                onChange={(event) => setDemandTitle(event.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Status / etapa</label>
                <select
                  value={demandStatus}
                  onChange={(event) => setDemandStatus(event.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-brand"
                >
                  {Array.from(new Set([...DEMAND_STATUS_OPTIONS, selectedDemand.status])).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Descrição operacional</label>
              <textarea
                rows={4}
                value={demandDescription}
                onChange={(event) => setDemandDescription(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
                placeholder="Descreva o objetivo ou o contexto desta demanda."
              />
            </div>

            <MemberAssignmentField
              members={activeMembers}
              value={demandMemberIds}
              onChange={setDemandMemberIds}
            />

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setSelectedDemand(null)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSavingDemand}>
                Salvar demanda
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
};
