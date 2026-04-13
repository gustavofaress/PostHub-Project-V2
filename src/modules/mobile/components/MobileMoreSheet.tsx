import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, LogOut } from 'lucide-react';
import { NAV_GROUPS } from '../../../shared/constants/navigation';
import { cn } from '../../../shared/utils/cn';
import { useAuth } from '../../../app/context/AuthContext';
import { BottomSheet } from './BottomSheet';
import { hasAccess } from '../../../shared/constants/plans';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeModuleId?: string;
}

const MOBILE_READY_MODULES = new Set(['dashboard', 'ideas', 'calendar']);
const HIDDEN_MODULE_IDS = new Set(['performance']);

export const MobileMoreSheet = ({
  isOpen,
  onClose,
  activeModuleId,
}: MobileMoreSheetProps) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const visibleGroups = React.useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.id === 'admin' && !user?.isAdmin) return false;
        if (HIDDEN_MODULE_IDS.has(item.id)) return false;
        return !['dashboard', 'ideas', 'scripts', 'approval', 'calendar'].includes(item.id);
      }),
    })).filter((group) => group.items.length > 0);
  }, [user?.isAdmin]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Mais" fullScreen>
      <div className="space-y-6 pb-4">
        {visibleGroups.map((group) => (
          <section key={group.label} className="space-y-3">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {group.label}
            </p>
            <div className="space-y-2">
              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const isLocked = !hasAccess(user?.currentPlan, item.id, user?.isAdmin);
                const isMobileReady = MOBILE_READY_MODULES.has(item.id);
                const isCurrentFallbackModule = activeModuleId === item.id && !isMobileReady;

                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      'mobile-panel-muted flex min-h-[72px] items-center gap-4 px-4 py-4 active:scale-[0.99]',
                      isActive && 'border-brand/30 bg-[linear-gradient(180deg,rgba(56,182,255,0.14)_0%,rgba(255,255,255,0.96)_100%)]'
                    )}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-[0_10px_22px_rgba(56,182,255,0.12)]">
                      <div className="relative">
                        <item.icon className="h-5 w-5" />
                        {isLocked ? (
                          <Lock className="absolute -right-2 -top-2 h-3.5 w-3.5 rounded-full bg-white text-brand" />
                        ) : null}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-slate-950">
                          {item.label}
                        </p>
                        {!isMobileReady ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.68rem] font-semibold text-slate-500">
                            Mobile parcial
                          </span>
                        ) : null}
                        {isLocked ? (
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[0.68rem] font-semibold text-brand">
                            PRO
                          </span>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="text-sm leading-6 text-slate-600">
                          {item.description}
                        </p>
                      ) : null}
                      {isCurrentFallbackModule ? (
                        <p className="mt-2 text-[0.78rem] font-medium text-slate-400">
                          Esta tela ainda está em adaptação para celular.
                        </p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <button
          type="button"
          onClick={async () => {
            onClose();
            await logout();
          }}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[22px] border border-red-200 bg-red-50 px-4 text-base font-semibold text-red-600 active:scale-[0.99]"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </BottomSheet>
  );
};
