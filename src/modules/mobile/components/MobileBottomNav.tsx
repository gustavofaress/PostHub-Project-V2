import * as React from 'react';
import { Lightbulb, CheckCircle, LayoutDashboard, Calendar, Ellipsis, Lock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../../shared/utils/cn';
import { WorkspaceModule } from '../../../shared/constants/navigation';
import { useApp } from '../../../app/context/AppContext';
import { useAuth } from '../../../app/context/AuthContext';
import { hasAccess } from '../../../shared/constants/plans';

interface MobileBottomNavProps {
  onOpenMore: () => void;
}

const ITEMS: Array<{
  id: WorkspaceModule | 'more';
  label: string;
  icon: React.ElementType;
  path?: string;
}> = [
  { id: 'ideas', label: 'Ideias', icon: Lightbulb, path: '/workspace/ideas' },
  { id: 'approval', label: 'Aprovação', icon: CheckCircle, path: '/workspace/approval' },
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard, path: '/workspace/dashboard' },
  { id: 'calendar', label: 'Calendário', icon: Calendar, path: '/workspace/calendar' },
  { id: 'more', label: 'Mais', icon: Ellipsis },
];

export const MobileBottomNav = ({ onOpenMore }: MobileBottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setActiveModule } = useApp();
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-transparent pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-3 md:hidden">
      <div className="mx-auto max-w-md px-4">
        <div className="mobile-surface grid grid-cols-5 gap-1 rounded-[28px] px-2 py-2">
          {ITEMS.map((item) => {
            const isActive = item.path ? location.pathname.startsWith(item.path) : false;
            const isLocked =
              item.id !== 'more' && !hasAccess(user?.currentPlan, item.id, user?.isAdmin);

            return (
              <button
                key={item.id}
                type="button"
                data-tour-id={item.id === 'more' ? 'mobile-more-nav-trigger' : `sidebar-${item.id}`}
                onClick={() => {
                  if (item.id === 'more') {
                    onOpenMore();
                    return;
                  }

                  setActiveModule(item.id);
                  navigate(item.path!);
                }}
                className={cn(
                  'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[22px] px-1 py-2 text-[0.72rem] font-semibold transition-transform active:scale-[0.98]',
                  isActive
                    ? 'bg-[linear-gradient(180deg,rgba(56,182,255,0.18)_0%,rgba(56,182,255,0.08)_100%)] text-brand shadow-[0_10px_24px_rgba(56,182,255,0.18)]'
                    : 'text-slate-500'
                )}
                aria-label={isLocked ? `${item.label} bloqueado` : item.label}
              >
                <span className="relative">
                  <item.icon className={cn('h-5 w-5', isActive && 'scale-105')} />
                  {isLocked ? (
                    <Lock className="absolute -right-2 -top-2 h-3.5 w-3.5 rounded-full bg-white text-brand" />
                  ) : null}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
