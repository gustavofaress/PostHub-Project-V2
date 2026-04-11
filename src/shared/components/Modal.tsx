import * as React from 'react';
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
  return (
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
          <div className="relative flex min-h-full items-start justify-center overflow-y-auto p-4 sm:items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                'relative my-auto flex w-full max-w-lg max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-2xl',
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
              <div className="min-h-0 overflow-y-auto pr-1">{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
