import * as React from 'react';
import { useApp } from '../../../app/context/AppContext';
import { DashboardMobile } from '../modules/dashboard/DashboardMobile';
import { IdeasMobile } from '../modules/ideas/IdeasMobile';
import { ModuleRenderer } from '../../workspace/components/ModuleRenderer';

export const MobileModuleRenderer = () => {
  const { activeModule } = useApp();

  switch (activeModule) {
    case 'dashboard':
      return <DashboardMobile />;
    case 'ideas':
      return <IdeasMobile />;
    default:
      return <ModuleRenderer />;
  }
};
