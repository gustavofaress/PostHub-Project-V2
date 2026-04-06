import * as React from 'react';
import { LayoutDashboard, Lightbulb, FileText, Calendar, Ellipsis } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../../shared/utils/cn';
import { WorkspaceModule } from '../../../shared/constants/navigation';
import { useApp } from '../../../app/context/AppContext';

interface MobileBottomNavProps {
  onOpenMore: () => void;
}

const ITEMS: Array<{
  id: WorkspaceModule | 'more';
  label: string;
  icon: React.ElementType;
  path?: string;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/workspace/dashboard' },
  { id: 'ideas', label: 'Ideias', icon: Lightbulb, path: '/workspace/ideas' },
  { id: 'scripts', label: 'Roteiros', icon: FileText, path: '/workspace/scripts' },
  { id: 'calendar', label: 'Calendário', icon: Calendar, path: '/workspace/calendar' },
  { id: 'more', label: 'Mais', icon: Ellipsis },
];

export const MobileBottomNav = ({ onOpenMore }: MobileBottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setActiveModule } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-white/90 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 px-3">
        {ITEMS.map((item) => {
          const isActive = item.path ? location.pathname.startsWith(item.path) : false;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'more') {
                  onOpenMore();
                  return;
                }

                setActiveModule(item.id);
                navigate(item.path!);
              }}
              className={cn(
                'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[0.72rem] font-medium transition-transform active:scale-[0.98]',
                isActive
                  ? 'bg-brand/12 text-brand'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'scale-105')} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
