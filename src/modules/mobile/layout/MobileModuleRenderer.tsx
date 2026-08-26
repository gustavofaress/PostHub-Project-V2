import * as React from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useApp } from '../../../app/context/AppContext';
import { useAuth } from '../../../app/context/AuthContext';
import { useWorkspacePermissions } from '../../../hooks/useWorkspacePermissions';
import { useActiveProfileCommercialAccess } from '../../../hooks/useActiveProfileCommercialAccess';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { LockedModuleState } from '../../../shared/components/LockedModuleState';
import { WORKSPACE_MODULE_PERMISSION_MAP } from '../../../shared/constants/workspaceAccess';
import { DashboardMobile } from '../modules/dashboard/DashboardMobile';
import { IdeasMobile } from '../modules/ideas/IdeasMobile';
import { ModuleRenderer } from '../../workspace/components/ModuleRenderer';
import { MobilePage } from '../components/MobilePage';
import { NAV_GROUPS } from '../../../shared/constants/navigation';
import { Badge } from '../../../shared/components/Badge';

export const MobileModuleRenderer = () => {
  const { activeModule } = useApp();
  const { user } = useAuth();
  const { canAccess } = useWorkspacePermissions();
  const commercialAccess = useActiveProfileCommercialAccess();
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
    case 'ideas': {
      const commercialFeatureAccess = commercialAccess.resolveFeatureAccess('ideas');
      const workspacePermissionDenied =
        !!user?.isWorkspaceMember &&
        (WORKSPACE_MODULE_PERMISSION_MAP.ideas ? !canAccess(WORKSPACE_MODULE_PERMISSION_MAP.ideas) : false);
      const isBlockedByCommercialPlan = !commercialFeatureAccess.enabled;

      if (commercialFeatureAccess.status === 'loading' && isBlockedByCommercialPlan) {
        return (
          <MobilePage>
            <Card className="flex min-h-[320px] flex-col items-center justify-center gap-4 border-dashed border-slate-200 bg-white px-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-text-primary">
                  Verificando acesso do perfil ativo
                </h2>
                <p className="text-sm leading-6 text-text-secondary">
                  Estamos conferindo o entitlement comercial deste perfil antes de abrir o Banco de
                  Ideias.
                </p>
              </div>
            </Card>
          </MobilePage>
        );
      }

      if (commercialFeatureAccess.status === 'error' && isBlockedByCommercialPlan) {
        return (
          <MobilePage>
            <LockedModuleState
              feature="ideas"
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
          </MobilePage>
        );
      }

      if (commercialFeatureAccess.status === 'resolved' && isBlockedByCommercialPlan) {
        return (
          <MobilePage>
            <LockedModuleState
              feature="ideas"
              autoOpen
              eyebrowLabel="Plano do perfil"
              showUpgradeActions={false}
              title="Banco de Ideias não está disponível neste perfil"
              description="Este perfil não possui acesso materializado ao Banco de Ideias no momento."
            />
          </MobilePage>
        );
      }

      if (commercialFeatureAccess.status === 'legacy_fallback' && isBlockedByCommercialPlan) {
        return (
          <MobilePage>
            <LockedModuleState feature="ideas" autoOpen />
          </MobilePage>
        );
      }

      if (workspacePermissionDenied) {
        return (
          <MobilePage>
            <LockedModuleState
              feature="ideas"
              autoOpen
              eyebrowLabel="Permissão do workspace"
              showUpgradeActions={false}
              title="Seu papel atual não libera este módulo"
              description="Peça ao administrador do workspace para ajustar as permissões do seu papel neste perfil."
            />
          </MobilePage>
        );
      }

      return <IdeasMobile />;
    }
    case 'calendar':
      return (
        <div className="pb-40 pt-1">
          <ModuleRenderer />
        </div>
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
