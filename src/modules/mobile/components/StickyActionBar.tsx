import * as React from 'react';
import { cn } from '../../../shared/utils/cn';

interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export const StickyActionBar = ({ children, className }: StickyActionBarProps) => {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/85 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 md:hidden',
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-md items-center gap-3">{children}</div>
    </div>
  );
};
