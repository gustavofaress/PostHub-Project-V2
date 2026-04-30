import * as React from 'react';
import { useApp } from '../../../app/context/AppContext';
import { DashboardMobile } from '../modules/dashboard/DashboardMobile';
import { IdeasMobile } from '../modules/ideas/IdeasMobile';
import { ModuleRenderer } from '../../workspace/components/ModuleRenderer';
import { MobilePage } from '../components/MobilePage';
import { NAV_GROUPS } from '../../../shared/constants/navigation';
import { Badge } from '../../../shared/components/Badge';

export const MobileModuleRenderer = () => {
  const { activeModule } = useApp();
  const currentItem = React.useMemo(
    () => NAV_GROUPS.flatMap((group) => group.items).find((item) => item.id === activeModule),
    [activeModule]
  );
  const currentGroup = React.useMemo(
    () => NAV_GROUPS.find((group) => group.items.some((item) => item.id === activeModule)),
    [activeModule]
  );

  switch (activeModule) {
    case 'dashboard':
      return <DashboardMobile />;
    case 'ideas':
      return <IdeasMobile />;
    case 'calendar':
      return (
        <MobilePage className="max-w-none gap-4 px-2 pb-40 pt-5">
          <div className="posthub-mobile-fallback">
            <ModuleRenderer />
          </div>
        </MobilePage>
      );
    default:
      return (
        <MobilePage className="gap-4">
          {currentItem ? (
            <section className="mobile-panel px-5 py-5">
              <Badge variant="brand" className="mb-3 px-3 py-1 text-[0.72rem] uppercase tracking-[0.16em]">
                {currentGroup?.label || 'Workspace'}
              </Badge>
              <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-slate-950">
                {currentItem.label}
              </h2>
              {currentItem.description ? (
                <p className="mt-2 text-[0.96rem] leading-7 text-slate-600">
                  {currentItem.description}
                </p>
              ) : null}
            </section>
          ) : null}

          <div className="posthub-mobile-fallback">
            <ModuleRenderer />
          </div>
        </MobilePage>
      );
  }
};
