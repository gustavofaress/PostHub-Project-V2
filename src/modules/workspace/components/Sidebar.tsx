import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, ChevronRight } from 'lucide-react';
import { NAV_GROUPS, NavItem } from '../../../shared/constants/navigation';
import { cn } from '../../../shared/utils/cn';
import { useAuth } from '../../../app/context/AuthContext';

const HIDDEN_MODULE_IDS = ['consultant', 'scheduler'];

export const Sidebar = () => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const [hoveredItem, setHoveredItem] = React.useState<{ item: NavItem; rect: DOMRect } | null>(
    null
  );
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const visibleGroups = React.useMemo(() => {
    return NAV_GROUPS
      .map((group) => {
        let items = group.items.filter((item) => !HIDDEN_MODULE_IDS.includes(item.id));

        if (group.label === 'Admin') {
          items = items.filter(() => !!user?.isAdmin);
        }

        return {
          ...group,
          items,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [user?.isAdmin]);

  const handleMouseEnter = (item: NavItem, e: React.MouseEvent) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredItem({ item, rect });
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 150);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (
      (hoveredItem?.item.id === 'admin' && !user?.isAdmin) ||
      (hoveredItem?.item.id && HIDDEN_MODULE_IDS.includes(hoveredItem.item.id))
    ) {
      setHoveredItem(null);
    }
  }, [hoveredItem, user?.isAdmin]);

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-[72px] flex-col bg-[#38B6FF] py-5 shadow-2xl">
        <div className="mb-6 flex items-center justify-center px-3">
          <Link
            to="/workspace/dashboard"
            className="flex h-12 w-12 shrink-0 items-center justify-center transition-all duration-300 hover:scale-105"
          >
            <img src="/logo-icon.png" alt="PostHub" className="h-10 w-10 object-contain" />
          </Link>
        </div>

        <nav
          className="flex w-full flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {visibleGroups.map((group, groupIdx) => (
            <div key={group.label} className="flex w-full flex-col gap-2">
              {groupIdx > 0 && (
                <div className="mx-auto mb-1.5 h-[2px] w-6 rounded-full bg-white/15" />
              )}

              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const isApproval = item.id === 'approval';

                return (
                  <div key={item.id} className="flex w-full flex-col">
                    <Link
                      to={item.path}
                      onMouseEnter={(e) => handleMouseEnter(item, e)}
                      onMouseLeave={handleMouseLeave}
                      className={cn(
                        'relative mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
                        isActive
                          ? isApproval
                            ? 'bg-white text-amber-500 shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                            : 'bg-white text-[#38B6FF] shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                          : 'text-white/75 hover:bg-white/15 hover:text-white'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-[22px] w-[22px] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
                          isActive && 'scale-105'
                        )}
                        strokeWidth={isActive ? 2.5 : 2}
                      />

                      {isActive && (
                        <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center">
                          <span
                            className={cn(
                              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
                              isApproval ? 'bg-amber-400' : 'bg-white'
                            )}
                          />
                          <span
                            className={cn(
                              'relative inline-flex h-2.5 w-2.5 rounded-full ring-[3px] ring-[#38B6FF]',
                              isApproval ? 'bg-amber-400' : 'bg-white'
                            )}
                          />
                        </span>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col px-3 pt-4">
          <button
            onClick={async () => {
              await logout();
            }}
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] text-white/75 transition-all duration-300 hover:bg-red-500 hover:text-white hover:shadow-md"
            title="Logout"
          >
            <LogOut className="h-[22px] w-[22px]" />
          </button>
        </div>
      </aside>

      {hoveredItem &&
        (() => {
          const isBottomHalf = hoveredItem.rect.top > window.innerHeight / 2;
          const availableHeight = isBottomHalf
            ? hoveredItem.rect.bottom - 20
            : window.innerHeight - hoveredItem.rect.top - 20;

          return (
            <div
              className={cn('fixed left-[72px] z-50 flex', isBottomHalf ? 'items-end' : 'items-start')}
              style={
                isBottomHalf
                  ? { bottom: window.innerHeight - hoveredItem.rect.bottom }
                  : { top: hoveredItem.rect.top }
              }
              onMouseEnter={() => {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
              }}
              onMouseLeave={handleMouseLeave}
            >
              <div className="w-[12px] self-stretch bg-transparent" />

              <div
                className="pointer-events-auto w-[280px] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in fade-in zoom-in-95 duration-200 overscroll-contain hide-scrollbar"
                style={{ maxHeight: `min(80vh, ${availableHeight}px)` }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#38B6FF]/10 text-[#38B6FF]">
                    <hoveredItem.item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="leading-tight font-bold text-gray-900">
                      {hoveredItem.item.label}
                    </h3>
                  </div>
                </div>

                <p className="mb-4 text-sm leading-relaxed text-gray-500">
                  {hoveredItem.item.description}
                </p>

                {hoveredItem.item.subItems && hoveredItem.item.subItems.length > 0 && (
                  <div className="space-y-1">
                    <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Features
                    </div>
                    {hoveredItem.item.subItems.slice(0, 5).map((sub, idx) => (
                      <Link
                        key={idx}
                        to={sub.path}
                        onClick={() => setHoveredItem(null)}
                        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-600 transition-colors hover:bg-[#38B6FF]/5 hover:text-[#38B6FF]"
                      >
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                        <span className="truncate">{sub.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </>
  );
};
