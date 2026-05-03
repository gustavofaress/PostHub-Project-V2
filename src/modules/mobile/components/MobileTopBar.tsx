import * as React from 'react';
import { ChevronDown, Menu } from 'lucide-react';
import { useProfile } from '../../../app/context/ProfileContext';
import { Avatar } from '../../../shared/components/Avatar';

interface MobileTopBarProps {
  title: string;
  subtitle?: string;
  onOpenMenu: () => void;
  onOpenProfiles: () => void;
}

export const MobileTopBar = ({
  title,
  subtitle,
  onOpenMenu,
  onOpenProfiles,
}: MobileTopBarProps) => {
  const { activeProfile, profiles } = useProfile();
  const previewProfiles = profiles.slice(0, 3);

  return (
    <header className="relative z-30 overflow-hidden md:hidden">
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
            <button
              type="button"
              onClick={onOpenProfiles}
              className="mt-3 flex w-full items-center gap-3 rounded-[22px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.10)_100%)] px-3 py-3 text-left text-white/92 shadow-[0_16px_34px_rgba(15,23,42,0.16)] active:scale-[0.98]"
              aria-label="Trocar perfil"
            >
              <div className="flex shrink-0 items-center">
                <div className="flex -space-x-2">
                  {previewProfiles.length > 0 ? (
                    previewProfiles.map((profile, index) => (
                      <Avatar
                        key={profile.id}
                        src={profile.avatar_url}
                        fallback={profile.name}
                        size="sm"
                        className="border-2 border-[#1F7AE0] bg-white/90 text-brand shadow-[0_8px_18px_rgba(15,23,42,0.14)]"
                      />
                    ))
                  ) : (
                    <Avatar
                      fallback={activeProfile?.name || 'PH'}
                      size="sm"
                      className="border-2 border-[#1F7AE0] bg-white/90 text-brand shadow-[0_8px_18px_rgba(15,23,42,0.14)]"
                    />
                  )}
                </div>
                {profiles.length > 1 ? (
                  <span className="ml-2 flex h-6 min-w-[1.55rem] items-center justify-center rounded-full bg-white/90 px-1.5 text-[0.68rem] font-bold text-brand shadow-[0_8px_18px_rgba(15,23,42,0.12)]">
                    {profiles.length}
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.82rem] font-semibold">
                  {activeProfile?.name || 'Selecionar perfil'}
                </p>
                <p className="truncate text-[0.72rem] text-white/74">
                  {profiles.length > 1
                    ? 'Troque rápido entre seus perfis'
                    : 'Toque para gerenciar este perfil'}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[0.63rem] font-semibold uppercase tracking-[0.14em] text-white/58">
                  Perfis
                </span>
                <ChevronDown className="h-4 w-4 text-white/78" />
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={onOpenMenu}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand shadow-[0_12px_28px_rgba(15,23,42,0.16)] active:scale-[0.98]"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-[#EEF6FB]" />
    </header>
  );
};
