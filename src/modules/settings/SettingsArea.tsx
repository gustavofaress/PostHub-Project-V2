import * as React from 'react';
import { CheckCircle2, CreditCard, Mail, Users, Zap } from 'lucide-react';
import { useAuth } from '../../app/context/AuthContext';
import { useProfile } from '../../app/context/ProfileContext';
import { useWorkspacePermissions } from '../../hooks/useWorkspacePermissions';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { Modal } from '../../shared/components/Modal';
import { cn } from '../../shared/utils/cn';
import { LockedModuleState } from '../../shared/components/LockedModuleState';
import { hasAccess } from '../../shared/constants/plans';
import {
  DEFAULT_MEMBER_PERMISSIONS,
  TeamMember,
  TeamPermissionId,
  WORKSPACE_PERMISSION_OPTIONS,
} from '../../shared/constants/workspaceMembers';
import { workspaceMembersService } from '../../services/workspace-members.service';

const ROLE_OPTIONS: Array<{
  value: TeamMember['role'];
  label: string;
  description: string;
}> = [
  {
    value: 'editor',
    label: 'Editor',
    description: 'Pode operar somente nas tarefas liberadas.',
  },
  {
    value: 'reviewer',
    label: 'Revisor',
    description: 'Focado em validação, feedback e acompanhamento.',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Pode coordenar a operação do workspace.',
  },
];

const ROLE_BADGE_VARIANTS: Record<TeamMember['role'], 'brand' | 'info' | 'success' | 'default'> = {
  owner: 'brand',
  admin: 'info',
  editor: 'success',
  reviewer: 'default',
};

const ROLE_LABELS: Record<TeamMember['role'], string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  reviewer: 'Revisor',
};

const STATUS_LABELS: Record<TeamMember['status'], string> = {
  active: 'Ativo',
  invited: 'Convite enviado',
  disabled: 'Desativado',
};

export const SettingsArea = () => {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { canManageMembers, isLoadingPermissions } = useWorkspacePermissions();
  const canUseTeamMembers = hasAccess(user?.currentPlan, 'team', user?.isAdmin);
  const ownerName = user?.name?.trim() || 'Você';
  const ownerEmail = user?.email?.trim() || 'owner@posthub.app';

  const ownerMember = React.useMemo<TeamMember | null>(() => {
    if (activeProfile?.role !== 'owner') return null;

    return {
      id: 'workspace-owner',
      name: ownerName,
      email: ownerEmail,
      role: 'owner',
      status: 'active',
      permissions: WORKSPACE_PERMISSION_OPTIONS.map((permission) => permission.id),
      createdAt: new Date().toISOString(),
      inviteSentAt: new Date().toISOString(),
      userId: user?.id || null,
    };
  }, [activeProfile?.role, ownerEmail, ownerName, user?.id]);

  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [inviteName, setInviteName] = React.useState('');
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<TeamMember['role']>('editor');
  const [selectedPermissions, setSelectedPermissions] =
    React.useState<TeamPermissionId[]>(DEFAULT_MEMBER_PERMISSIONS);
  const [formError, setFormError] = React.useState('');
  const [membersError, setMembersError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeProfile?.id || !canUseTeamMembers) {
      setMembers([]);
      return;
    }

    let isMounted = true;

    const loadMembers = async () => {
      setIsLoadingMembers(true);
      setMembersError(null);

      try {
        const nextMembers = await workspaceMembersService.list(activeProfile.id);
        if (!isMounted) return;
        setMembers(nextMembers);
      } catch (error) {
        console.error('[SettingsArea] Failed to load workspace members:', error);
        if (!isMounted) return;
        setMembers([]);
        setMembersError('Não foi possível carregar os membros deste workspace.');
      } finally {
        if (isMounted) {
          setIsLoadingMembers(false);
        }
      }
    };

    void loadMembers();

    return () => {
      isMounted = false;
    };
  }, [activeProfile?.id, canUseTeamMembers]);

  const allMembers = React.useMemo(
    () => (ownerMember ? [ownerMember, ...members] : members),
    [members, ownerMember]
  );

  const selectedPermissionsLabel = React.useMemo(() => {
    if (selectedPermissions.length === 0) return 'Nenhuma tarefa selecionada';
    if (selectedPermissions.length === WORKSPACE_PERMISSION_OPTIONS.length) {
      return 'Acesso completo ao workspace';
    }
    return `${selectedPermissions.length} tarefas liberadas`;
  }, [selectedPermissions]);

  const togglePermission = (permissionId: TeamPermissionId) => {
    setSelectedPermissions((currentPermissions) =>
      currentPermissions.includes(permissionId)
        ? currentPermissions.filter((currentPermission) => currentPermission !== permissionId)
        : [...currentPermissions, permissionId]
    );
  };

  const resetInviteForm = React.useCallback(() => {
    setInviteName('');
    setInviteEmail('');
    setInviteRole('editor');
    setSelectedPermissions(DEFAULT_MEMBER_PERMISSIONS);
    setFormError('');
  }, []);

  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
    resetInviteForm();
  };

  const handleCreateMember = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProfile?.id) {
      setFormError('Selecione um workspace antes de convidar membros.');
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const normalizedName = inviteName.trim();

    if (!normalizedEmail || !/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setFormError('Informe um email válido para criar o login do membro.');
      return;
    }

    if (selectedPermissions.length === 0) {
      setFormError('Selecione pelo menos uma tarefa para liberar o acesso.');
      return;
    }

    const emailAlreadyExists = allMembers.some(
      (member) => member.email.trim().toLowerCase() === normalizedEmail
    );

    if (emailAlreadyExists) {
      setFormError('Já existe um membro configurado com esse email neste workspace.');
      return;
    }

    void (async () => {
      try {
        const nextMember = await workspaceMembersService.invite({
          profileId: activeProfile.id,
          email: normalizedEmail,
          name: normalizedName,
          role: inviteRole as Exclude<TeamMember['role'], 'owner'>,
          permissions: selectedPermissions,
        });

        setMembers((prev) => [nextMember, ...prev]);
        handleCloseInviteModal();
      } catch (error: any) {
        console.error('[SettingsArea] Failed to invite member:', error);
        setFormError(error?.message || 'Não foi possível criar o convite do membro.');
      }
    })();
  };

  const handleResendInvite = (memberId: string) => {
    if (!activeProfile?.id) return;

    const targetMember = members.find((member) => member.id === memberId);
    if (!targetMember) return;

    void (async () => {
      try {
        const updatedMember = await workspaceMembersService.resendInvite(
          activeProfile.id,
          targetMember
        );
        setMembers((prev) =>
          prev.map((member) => (member.id === memberId ? updatedMember : member))
        );
      } catch (error: any) {
        console.error('[SettingsArea] Failed to resend invite:', error);
        setMembersError(error?.message || 'Não foi possível reenviar o convite.');
      }
    })();
  };

  const handleToggleMemberStatus = (memberId: string) => {
    if (!activeProfile?.id) return;

    const targetMember = members.find((member) => member.id === memberId);
    if (!targetMember) return;

    const nextStatus = targetMember.status === 'active' ? 'disabled' : 'active';

    void (async () => {
      try {
        const updatedMember = await workspaceMembersService.updateStatus(
          activeProfile.id,
          memberId,
          nextStatus
        );
        setMembers((prev) =>
          prev.map((member) => (member.id === memberId ? updatedMember : member))
        );
      } catch (error: any) {
        console.error('[SettingsArea] Failed to update member status:', error);
        setMembersError(error?.message || 'Não foi possível atualizar o status do membro.');
      }
    })();
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Configurações do Workspace</h1>
        <p className="text-text-secondary">Configure seu workspace e as preferências da equipe.</p>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>Você está atualmente no Plano Pro.</CardDescription>
            </div>
            <Badge variant="brand">Ativo</Badge>
          </div>

          <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">Uso Mensal</span>
              <span className="text-sm text-text-secondary">84% utilizado</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-full w-[84%] bg-brand" />
            </div>
            <p className="mt-2 text-xs text-text-secondary">
              840 de 1.000 roteiros gerados neste mês.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Gerenciar Cobrança
            </Button>
            <Button className="gap-2">
              <Zap className="h-4 w-4" />
              Fazer Upgrade do Plano
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-2">Integrações</CardTitle>
          <CardDescription className="mb-6">
            Conecte suas contas de redes sociais ao PostHub.
          </CardDescription>

          <div className="space-y-4">
            {[
              { name: 'Instagram', status: 'Conectado', icon: '📸' },
              { name: 'TikTok', status: 'Conectado', icon: '🎵' },
              { name: 'LinkedIn', status: 'Não Conectado', icon: '💼' },
              { name: 'Twitter / X', status: 'Não Conectado', icon: '🐦' },
            ].map((platform) => (
              <div
                key={platform.name}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{platform.icon}</span>
                  <span className="font-medium text-text-primary">{platform.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'text-xs',
                      platform.status === 'Conectado' ? 'text-green-600' : 'text-gray-400'
                    )}
                  >
                    {platform.status}
                  </span>
                  <Button variant="ghost" size="sm">
                    {platform.status === 'Conectado' ? 'Desconectar' : 'Conectar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <CardTitle>Membros da Equipe</CardTitle>
              <CardDescription>
                Crie acessos por email e defina exatamente em quais tarefas cada membro pode atuar.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsInviteModalOpen(true)}
              disabled={!canUseTeamMembers || !canManageMembers || isLoadingPermissions}
            >
              <Users className="h-4 w-4" />
              Adicionar Membro
            </Button>
          </div>

          {!canUseTeamMembers ? (
            <LockedModuleState
              feature="team"
              compact
              title="Gerenciar equipe é exclusivo do plano PRO"
              description="Traga sua equipe para a mesma operação, com acessos por email e controle claro sobre quem pode atuar em cada etapa."
            />
          ) : (
            <>
          {!canManageMembers && !isLoadingPermissions ? (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Seu acesso neste workspace não permite gerenciar membros.
            </div>
          ) : null}

          {membersError ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {membersError}
            </div>
          ) : null}

          <div className="mb-5 grid gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                Workspace
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {activeProfile?.name || 'Workspace principal'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                Membros com acesso
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">{allMembers.length} pessoas</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                Convites pendentes
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {members.filter((member) => member.status === 'invited').length} aguardando aceite
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {isLoadingMembers ? (
              <div className="rounded-2xl border border-gray-100 p-6 text-sm text-text-secondary">
                Carregando membros do workspace...
              </div>
            ) : null}

            {allMembers.map((member) => {
              const initials = member.name
                .split(' ')
                .slice(0, 2)
                .map((part) => part.charAt(0).toUpperCase())
                .join('');

              const visiblePermissions = WORKSPACE_PERMISSION_OPTIONS.filter((permission) =>
                member.permissions.includes(permission.id)
              );

              return (
                <div
                  key={member.id}
                  className="rounded-2xl border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                        {initials}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            {member.name}
                            {member.role === 'owner' ? ' (Você)' : ''}
                          </p>
                          <Badge variant={ROLE_BADGE_VARIANTS[member.role]}>
                            {ROLE_LABELS[member.role]}
                          </Badge>
                          <Badge variant={member.status === 'active' ? 'success' : 'warning'}>
                            {STATUS_LABELS[member.status]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {member.email}
                          </span>
                          <span className="hidden text-gray-300 md:inline">•</span>
                          <span>Login por email configurado</span>
                        </div>
                      </div>
                    </div>

                    {member.role !== 'owner' ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleMemberStatus(member.id)}
                          disabled={!canManageMembers}
                        >
                          {member.status === 'active' ? 'Desativar acesso' : 'Liberar acesso'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleResendInvite(member.id)}
                          disabled={!canManageMembers}
                        >
                          Reenviar convite
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-100 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                        Tarefas liberadas
                      </p>
                      <span className="text-xs text-text-secondary">
                        {visiblePermissions.length} selecionadas
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {visiblePermissions.map((permission) => (
                        <span
                          key={permission.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand"
                        >
                          <permission.icon className="h-3.5 w-3.5" />
                          {permission.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        isOpen={isInviteModalOpen}
        onClose={handleCloseInviteModal}
        title="Adicionar membro"
        className="max-w-3xl"
      >
        <form onSubmit={handleCreateMember} className="space-y-5">
          <div className="rounded-2xl border border-brand/10 bg-gradient-to-br from-brand/[0.07] via-brand/[0.03] to-white p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                  Convite de workspace
                </p>
                <h4 className="mt-2 text-lg font-semibold text-text-primary">
                  Crie um acesso novo sem sair das configurações
                </h4>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  Defina o perfil do membro, libere somente as áreas necessárias e mantenha a
                  operação organizada no mesmo padrão visual do restante da plataforma.
                </p>
              </div>
              <Badge variant="brand" className="self-start px-3 py-1">
                {selectedPermissionsLabel}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1.15fr]">
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-text-primary">Dados de acesso</p>
                <p className="text-sm text-text-secondary">
                  Informe quem vai entrar e qual email será usado no login.
                </p>
              </div>

              <Input
                label="Nome do membro"
                placeholder="Ex.: Ana Souza"
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
              />
              <Input
                label="Email de acesso"
                type="email"
                placeholder="ana@empresa.com"
                value={inviteEmail}
                onChange={(event) => {
                  setInviteEmail(event.target.value);
                  if (formError) setFormError('');
                }}
                error={formError}
              />
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-text-primary">Perfil de acesso</p>
                <p className="text-sm text-text-secondary">
                  Escolha o nível base antes de liberar as tarefas.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {ROLE_OPTIONS.map((roleOption) => (
                  <button
                    key={roleOption.value}
                    type="button"
                    onClick={() => setInviteRole(roleOption.value)}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-all',
                      inviteRole === roleOption.value
                        ? 'border-brand bg-brand/5 shadow-sm ring-1 ring-brand/20'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <p className="text-sm font-semibold text-text-primary">{roleOption.label}</p>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                      {roleOption.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Tarefas permitidas</p>
                <p className="text-sm text-text-secondary">
                  Defina em quais áreas do workspace esse membro poderá mexer.
                </p>
              </div>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                {selectedPermissions.length} selecionadas
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {WORKSPACE_PERMISSION_OPTIONS.map((permission) => (
                <label
                  key={permission.id}
                  className={cn(
                    'group flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all',
                    selectedPermissions.includes(permission.id)
                      ? 'border-brand/30 bg-brand/[0.04] shadow-sm'
                      : 'border-gray-200 bg-white hover:border-brand/20 hover:bg-gray-50'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                      selectedPermissions.includes(permission.id)
                        ? 'border-brand bg-brand'
                        : 'border-gray-300 bg-white'
                    )}
                  >
                    {selectedPermissions.includes(permission.id) ? (
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <permission.icon className="h-4 w-4 text-brand" />
                      <span className="text-sm font-medium text-text-primary">
                        {permission.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                      {permission.description}
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedPermissions.includes(permission.id)}
                    onChange={() => {
                      if (formError) setFormError('');
                      togglePermission(permission.id);
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-brand/10 bg-brand/5 p-4">
            <p className="text-sm font-medium text-text-primary">Como esse acesso vai funcionar</p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              O membro será cadastrado com login por email e ficará marcado como convite enviado
              dentro deste workspace. As permissões escolhidas já ficam registradas para a
              integração futura com o backend.
            </p>
          </div>

          <div className="sticky bottom-0 -mx-6 border-t border-gray-100 bg-white/95 px-6 pb-1 pt-4 backdrop-blur">
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={handleCloseInviteModal}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                <Mail className="h-4 w-4" />
                Criar login do membro
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
