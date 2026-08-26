import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useApp } from '../../../app/context/AppContext';
import { useAuth } from '../../../app/context/AuthContext';
import { Dashboard } from '../../dashboard/Dashboard';
import { IdeasBank } from '../../ideas/IdeasBank';
import { ApprovalModule } from '../../approval/ApprovalModule';
import { EditorialCalendar } from '../../calendar/EditorialCalendar';
import { KanbanBoard } from '../../kanban/KanbanBoard';
import { Performance } from '../../performance/Performance';
import { References } from '../../references/References';
import { Credits } from '../../credits/Credits';
import { AccountArea } from '../../account/AccountArea';
import { SettingsArea } from '../../settings/SettingsArea';
import { Support } from '../../support/Support';
import { ReportsModule } from '../../reports/ReportsModule';
import { AdminDashboard } from '../../admin/AdminDashboard';
import { Integrations } from '../../integrations/Integrations';
import { LockedModuleState } from '../../../shared/components/LockedModuleState';
import { hasAccess } from '../../../shared/constants/plans';
import { useWorkspacePermissions } from '../../../hooks/useWorkspacePermissions';
import { WORKSPACE_MODULE_PERMISSION_MAP } from '../../../shared/constants/workspaceAccess';
import { useActiveProfileCommercialAccess } from '../../../hooks/useActiveProfileCommercialAccess';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { getWorkspaceModuleCommercialFeature } from '../../../shared/utils/activeProfileCommercialAccess.ts';

export const ModuleRenderer = () => {
  const { activeModule } = useApp();
  const { user } = useAuth();
  const { canAccess, canManageMembers } = useWorkspacePermissions();
  const commercialAccess = useActiveProfileCommercialAccess();

  if (
    activeModule === 'consultant' ||
    activeModule === 'scripts' ||
    activeModule === 'clients' ||
    activeModule === 'scheduler'
  ) {
    return <Navigate to="/workspace/dashboard" replace />;
  }

  if (activeModule === 'onboarding') {
    return <Navigate to="/workspace/dashboard" replace />;
  }

  const requiredPermission = WORKSPACE_MODULE_PERMISSION_MAP[activeModule];
  const isBlockedByWorkspacePermission =
    !!user?.isWorkspaceMember &&
    (activeModule === 'settings'
      ? !canManageMembers
      : requiredPermission
      ? !canAccess(requiredPermission)
      : false);
  const commercialFeature = getWorkspaceModuleCommercialFeature(activeModule);
  const commercialFeatureAccess = commercialFeature
    ? commercialAccess.resolveFeatureAccess(commercialFeature)
    : null;
  const isBlockedByCommercialPlan = !!commercialFeatureAccess && !commercialFeatureAccess.enabled;

  if (commercialFeatureAccess?.status === 'loading' && isBlockedByCommercialPlan) {
    return (
      <Card className="flex min-h-[320px] flex-col items-center justify-center gap-4 border-dashed border-slate-200 bg-white text-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text-primary">
            Verificando acesso do perfil ativo
          </h1>
          <p className="max-w-xl text-text-secondary">
            Estamos conferindo o entitlement comercial deste perfil antes de abrir este módulo.
          </p>
        </div>
      </Card>
    );
  }

  if (commercialFeatureAccess?.status === 'error' && isBlockedByCommercialPlan) {
    return (
      <LockedModuleState
        feature={activeModule}
        autoOpen
        eyebrowLabel="Acesso do perfil"
        showUpgradeActions={false}
        title="Não foi possível verificar o plano deste perfil"
        description="O acesso comercial deste perfil não pôde ser confirmado agora. Tente novamente para abrir este módulo com segurança."
        actions={
          <Button
            variant="secondary"
            onClick={() => void commercialAccess.refetch()}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (commercialFeatureAccess?.status === 'resolved' && isBlockedByCommercialPlan) {
    return (
      <LockedModuleState
        feature={activeModule}
        autoOpen
        eyebrowLabel="Plano do perfil"
        title={
          activeModule === 'references'
            ? 'Referências é um recurso PRO por perfil'
            : activeModule === 'performance'
            ? 'Performance é um recurso PRO por perfil'
            : activeModule === 'reports'
            ? 'Relatórios é um recurso PRO por perfil'
            : 'Aprovação é um recurso PRO por perfil'
        }
        description={
          activeModule === 'references'
            ? 'Ative o PRO neste perfil para acessar referências, uploads e materiais de apoio sem mudar o restante do workspace.'
            : activeModule === 'performance'
            ? 'Ative o PRO neste perfil para acompanhar métricas, analytics sociais e histórico de performance dentro da PostHub.'
            : activeModule === 'reports'
            ? 'Ative o PRO neste perfil para montar relatórios profissionais, visualizar prévias e exportar PDFs sem mudar o restante do workspace.'
            : 'Ative o PRO neste perfil para abrir o workspace interno de aprovação e gerar novos fluxos de revisão.'
        }
      />
    );
  }

  if (commercialFeatureAccess?.status === 'legacy_fallback' && isBlockedByCommercialPlan) {
    return <LockedModuleState feature={activeModule} autoOpen />;
  }

  if (!commercialFeatureAccess && !hasAccess(user?.currentPlan, activeModule, user?.isAdmin)) {
    return (
      <LockedModuleState
        feature={activeModule === 'settings' ? 'team' : activeModule}
        autoOpen
      />
    );
  }

  if (isBlockedByWorkspacePermission) {
    return (
      <LockedModuleState
        feature={activeModule === 'settings' ? 'team' : activeModule}
        autoOpen
        eyebrowLabel="Permissão do workspace"
        showUpgradeActions={false}
        title={
          activeModule === 'settings' && isBlockedByWorkspacePermission
            ? 'Somente admins podem organizar demandas do workspace'
            : 'Seu papel atual não libera este módulo'
        }
        description={
          activeModule === 'settings' && isBlockedByWorkspacePermission
            ? 'Peça ao administrador para ajustar membros, permissões e vínculos das demandas.'
            : 'Peça ao administrador do workspace para ajustar as permissões do seu papel neste perfil.'
        }
      />
    );
  }

  switch (activeModule) {
    case 'dashboard':
      return <Dashboard />;
    case 'ideas':
      return <IdeasBank />;
    case 'approval':
      return <ApprovalModule />;
    case 'calendar':
      return <EditorialCalendar />;
    case 'kanban':
      return <KanbanBoard />;
    case 'performance':
      return <Performance />;
    case 'reports':
      return <ReportsModule />;
    case 'references':
      return <References />;
    case 'integrations':
      return <Integrations />;
    case 'settings':
      return <SettingsArea />;
    case 'account':
      return <AccountArea />;
    case 'credits':
      return <Credits />;
    case 'support':
      return <Support />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <Dashboard />;
  }
};
