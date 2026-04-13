import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal = ({ isOpen, onClose, title, children, className }: ModalProps) => {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="relative flex min-h-full items-end justify-center overflow-y-auto p-0 sm:items-start sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                'relative mt-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white p-5 shadow-2xl sm:mt-0 sm:max-h-[calc(100vh-3rem)] sm:max-w-lg sm:self-start sm:rounded-2xl sm:p-6',
                className
              )}
            >
              <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
                <h3 className="min-w-0 text-xl font-bold text-text-primary">{title}</h3>
                <button
                  onClick={onClose}
                  className="shrink-0 rounded-full p-1 text-text-secondary transition-colors hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pr-1">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
    ,
    document.body
  );
};
