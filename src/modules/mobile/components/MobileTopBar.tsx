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
    <header className="sticky top-0 z-30 overflow-hidden md:hidden">
      <div className="absolute inset-x-0 top-0 h-full bg-[linear-gradient(135deg,#38B6FF_0%,#2496EB_52%,#1F7AE0_100%)]" />
      <div className="absolute left-[-15%] top-8 h-32 w-32 rounded-full bg-white/18 blur-3xl" />
      <div className="absolute right-[-18%] top-2 h-36 w-36 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-md px-5 pb-5 pt-[calc(0.95rem+env(safe-area-inset-top))]">
        <div className="flex items-start gap-3">
          <div className="mobile-surface flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white/16 shadow-[0_14px_32px_rgba(15,23,42,0.16)]">
            <img src="/logo-icon.png" alt="PostHub" className="h-8 w-8 object-contain" />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-white/74">
              {subtitle || activeProfile?.name || 'Workspace mobile'}
            </p>
            <h1 className="truncate text-[1.45rem] font-semibold tracking-[-0.03em] text-white">
              {title}
            </h1>
            <p className="mt-1 truncate text-[0.9rem] text-white/78">
              {activeProfile?.name || 'Sua operação de conteúdo, agora no celular'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/14 text-white active:scale-[0.98]"
              aria-label="Busca"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={onOpenMenu}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand shadow-[0_12px_28px_rgba(15,23,42,0.16)] active:scale-[0.98]"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {activeProfile ? (
              <Avatar
                src={activeProfile.avatar_url}
                fallback={activeProfile.name}
                size="sm"
                className="hidden border-2 border-white/35 shadow-[0_10px_24px_rgba(15,23,42,0.18)] sm:flex"
              />
            ) : null}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-[#EEF6FB]" />
    </header>
  );
};
