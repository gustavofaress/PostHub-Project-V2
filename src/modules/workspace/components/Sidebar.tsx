import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, ChevronRight } from 'lucide-react';
import { NAV_GROUPS, NavItem } from '../../../shared/constants/navigation';
import { cn } from '../../../shared/utils/cn';
import { useAuth } from '../../../app/context/AuthContext';

export const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  
  const [hoveredItem, setHoveredItem] = React.useState<{ item: NavItem, rect: DOMRect } | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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

  // Clean up timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 h-screen w-[72px] bg-[#38B6FF] flex flex-col py-5 shadow-2xl">
        {/* Logo */}
        <div className="px-3 mb-6 flex items-center justify-center">
          <Link 
            to="/workspace/dashboard" 
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white text-[#38B6FF] shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md"
          >
            <span className="text-2xl font-black tracking-tighter">P</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 w-full flex flex-col gap-5 overflow-y-auto px-3 pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {NAV_GROUPS.map((group, groupIdx) => (
            <div key={group.label} className="flex w-full flex-col gap-2">
              {/* Group Divider */}
              {groupIdx > 0 && <div className="h-[2px] w-6 bg-white/15 mb-1.5 rounded-full mx-auto" />}
              
              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const isApproval = item.id === 'approval';

                return (
                  <div key={item.id} className="flex flex-col w-full">
                    <Link
                      to={item.path}
                      onMouseEnter={(e) => handleMouseEnter(item, e)}
                      onMouseLeave={handleMouseLeave}
                      className={cn(
                        'relative flex h-12 w-12 mx-auto items-center justify-center rounded-[16px] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
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
                      
                      {/* Active Indicator Dot (Optional, keeping it for extra flair if desired, but making it subtle) */}
                      {isActive && (
                        <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center">
                          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", isApproval ? "bg-amber-400" : "bg-white")}></span>
                          <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full ring-[3px] ring-[#38B6FF]", isApproval ? "bg-amber-400" : "bg-white")}></span>
                        </span>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-auto pt-4 flex flex-col px-3">
          <button 
            onClick={async () => {
              await logout();
            }}
            className="flex h-12 w-12 mx-auto items-center justify-center rounded-[16px] text-white/75 transition-all duration-300 hover:bg-red-500 hover:text-white hover:shadow-md"
            title="Logout"
          >
            <LogOut className="h-[22px] w-[22px]" />
          </button>
        </div>
      </aside>

      {/* Floating Hover Panel */}
      {hoveredItem && (() => {
        const isBottomHalf = hoveredItem.rect.top > window.innerHeight / 2;
        const availableHeight = isBottomHalf 
          ? hoveredItem.rect.bottom - 20 
          : window.innerHeight - hoveredItem.rect.top - 20;

        return (
          <div 
            className={cn(
              "fixed left-[72px] z-50 flex",
              isBottomHalf ? "items-end" : "items-start"
            )}
            style={{ 
              ...(isBottomHalf 
                ? { bottom: window.innerHeight - hoveredItem.rect.bottom }
                : { top: hoveredItem.rect.top }
              )
            }}
            onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
            onMouseLeave={handleMouseLeave}
          >
            {/* Invisible bridge to prevent hover loss */}
            <div className="w-[12px] self-stretch bg-transparent" />
            
            {/* Actual Panel */}
            <div 
              className="w-[280px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-5 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto overscroll-contain hide-scrollbar pointer-events-auto"
              style={{ maxHeight: `min(80vh, ${availableHeight}px)` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#38B6FF]/10 text-[#38B6FF]">
                  <hoveredItem.item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">{hoveredItem.item.label}</h3>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                {hoveredItem.item.description}
              </p>
              
              {hoveredItem.item.subItems && hoveredItem.item.subItems.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Features</div>
                  {hoveredItem.item.subItems.slice(0, 5).map((sub, idx) => (
                    <Link 
                      key={idx}
                      to={sub.path}
                      onClick={() => setHoveredItem(null)}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#38B6FF] hover:bg-[#38B6FF]/5 px-2 py-2 rounded-lg transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />
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
