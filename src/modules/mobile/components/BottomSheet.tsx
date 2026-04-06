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
              'absolute bottom-0 left-0 right-0 flex max-h-[92vh] flex-col overflow-hidden rounded-t-[28px] border border-white/60 bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.18)] dark:border-slate-700/70 dark:bg-slate-900',
              fullScreen ? 'h-[92vh]' : 'min-h-[240px]',
              className
            )}
          >
            <div className="flex items-center justify-between px-5 pb-4 pt-3">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {title ? (
              <div className="px-5 pb-4">
                <h2 className="text-[1.1rem] font-semibold text-slate-900 dark:text-slate-50">
                  {title}
                </h2>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
