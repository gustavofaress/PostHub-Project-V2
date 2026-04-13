import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  fullScreen?: boolean;
}

export const BottomSheet = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  fullScreen = false,
}: BottomSheetProps) => {
  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[80] md:hidden">
          <motion.button
            type="button"
            aria-label="Fechar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={cn(
              'absolute bottom-0 left-0 right-0 flex max-h-[92vh] flex-col overflow-hidden rounded-t-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,251,255,0.94)_100%)] shadow-[0_-18px_48px_rgba(15,23,42,0.2)]',
              fullScreen ? 'h-[92vh]' : 'min-h-[240px]',
              className
            )}
          >
            <div className="flex items-center justify-between px-5 pb-4 pt-3">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300" />
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm active:scale-[0.98]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {title ? (
              <div className="px-5 pb-4">
                <h2 className="text-[1.1rem] font-semibold text-slate-900">
                  {title}
                </h2>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
