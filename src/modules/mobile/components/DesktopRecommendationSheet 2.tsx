import * as React from 'react';
import { MonitorSmartphone } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

interface DesktopRecommendationSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopRecommendationSheet = ({
  isOpen,
  onClose,
}: DesktopRecommendationSheetProps) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Melhor experiência no computador">
      <div className="space-y-5 pb-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-brand/10 text-brand">
          <MonitorSmartphone className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <p className="text-[1rem] leading-7 text-slate-700 dark:text-slate-300">
            A versão mobile está disponível, mas recomendamos usar a PostHub no computador para
            uma experiência mais completa e confortável.
          </p>
          <p className="text-[0.95rem] leading-7 text-slate-500 dark:text-slate-400">
            No desktop, você terá uma navegação mais ampla para planejamento, gestão e edição de
            conteúdos.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[0.92rem] text-slate-600 dark:text-slate-400">
            Se precisar continuar agora, pode seguir normalmente no celular.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-brand px-4 text-[1rem] font-semibold text-white shadow-[0_8px_24px_rgba(56,182,255,0.3)] active:scale-[0.98]"
        >
          Continuar no celular
        </button>
      </div>
    </BottomSheet>
  );
};
