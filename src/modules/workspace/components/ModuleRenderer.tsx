import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../../app/context/AppContext';
import { useAuth } from '../../../app/context/AuthContext';
import { Dashboard } from '../../dashboard/Dashboard';
import { Onboarding } from '../../onboarding/Onboarding';
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
import { LockedModuleState } from '../../../shared/components/LockedModuleState';
import { hasAccess } from '../../../shared/constants/plans';
import { useWorkspacePermissions } from '../../../hooks/useWorkspacePermissions';
import { WORKSPACE_MODULE_PERMISSION_MAP } from '../../../shared/constants/workspaceAccess';

export const ModuleRenderer = () => {
  const { activeModule } = useApp();
  const { user } = useAuth();
  const { canAccess, canManageMembers } = useWorkspacePermissions();

  if (
    activeModule === 'consultant' ||
    activeModule === 'scheduler' ||
    activeModule === 'integrations'
  ) {
    return <Navigate to="/workspace/dashboard" replace />;
  }

  if (activeModule === 'onboarding' && user?.isMemberOnlyAccount) {
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

  if (!hasAccess(user?.currentPlan, activeModule, user?.isAdmin) || isBlockedByWorkspacePermission) {
    return (
      <LockedModuleState
        feature={activeModule === 'settings' ? 'team' : activeModule}
        autoOpen
        title={
          activeModule === 'settings' && isBlockedByWorkspacePermission
            ? 'Somente admins podem organizar demandas do workspace'
            : undefined
        }
        description={
          activeModule === 'settings' && isBlockedByWorkspacePermission
            ? 'Peça ao administrador para ajustar membros, permissões e vínculos das demandas.'
            : undefined
        }
      />
    );
  }

  switch (activeModule) {
    case 'onboarding':
      return <Onboarding />;
    case 'dashboard':
      return <Dashboard />;
    case 'scripts':
      return <Navigate to="/workspace/ideas" replace />;
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
