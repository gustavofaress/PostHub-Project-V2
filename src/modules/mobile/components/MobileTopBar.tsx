import * as React from 'react';
import { Menu, Search } from 'lucide-react';
import { useProfile } from '../../../app/context/ProfileContext';
import { Avatar } from '../../../shared/components/Avatar';

interface MobileTopBarProps {
  title: string;
  subtitle?: string;
  onOpenMenu: () => void;
}

export const MobileTopBar = ({ title, subtitle, onOpenMenu }: MobileTopBarProps) => {
  const { activeProfile } = useProfile();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85 md:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 pb-3 pt-[calc(0.85rem+env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8rem] font-medium text-slate-500 dark:text-slate-400">
            {subtitle || activeProfile?.name || 'PostHub'}
          </p>
          <h1 className="truncate text-[1.35rem] font-semibold tracking-[-0.02em] text-slate-950 dark:text-slate-50">
            {title}
          </h1>
        </div>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-100"
          aria-label="Busca"
        >
          <Search className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white active:scale-[0.98]"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {activeProfile ? (
          <Avatar
            src={activeProfile.avatar_url}
            fallback={activeProfile.name}
            size="sm"
            className="hidden sm:flex"
          />
        ) : null}
      </div>
    </header>
  );
};
