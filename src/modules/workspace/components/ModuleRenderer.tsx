import * as React from 'react';
import { useApp } from '../../../app/context/AppContext';
import { useAuth } from '../../../app/context/AuthContext';
import { Dashboard } from '../../dashboard/Dashboard';
import { Onboarding } from '../../onboarding/Onboarding';
import { Consultant } from '../../consultant/Consultant';
import { ScriptGenerator } from '../../scripts/ScriptGenerator';
import { IdeasBank } from '../../ideas/IdeasBank';
import { ApprovalModule } from '../../approval/ApprovalModule';
import { EditorialCalendar } from '../../calendar/EditorialCalendar';
import { KanbanBoard } from '../../kanban/KanbanBoard';
import { Performance } from '../../performance/Performance';
import { Scheduler } from '../../scheduler/Scheduler';
import { References } from '../../references/References';
import { Integrations } from '../../integrations/Integrations';
import { Credits } from '../../credits/Credits';
import { AccountArea } from '../../account/AccountArea';
import { SettingsArea } from '../../settings/SettingsArea';
import { Support } from '../../support/Support';
import { ReportsModule } from '../../reports/ReportsModule';
import { AdminDashboard } from '../../admin/AdminDashboard';
import { LockedModuleState } from '../../../shared/components/LockedModuleState';
import { hasAccess } from '../../../shared/constants/plans';

export const ModuleRenderer = () => {
  const { activeModule } = useApp();
  const { user } = useAuth();

  if (!hasAccess(user?.currentPlan, activeModule, user?.isAdmin)) {
    return <LockedModuleState feature={activeModule} autoOpen />;
  }

  switch (activeModule) {
    case 'onboarding':
      return <Onboarding />;
    case 'dashboard':
      return <Dashboard />;
    case 'consultant':
      return <Consultant />;
    case 'scripts':
      return <ScriptGenerator />;
    case 'ideas':
      return <IdeasBank />;
    case 'approval':
      return <ApprovalModule />;
    case 'calendar':
      return <EditorialCalendar />;
    case 'kanban':
      return <KanbanBoard />;
    case 'scheduler':
      return <Scheduler />;
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
