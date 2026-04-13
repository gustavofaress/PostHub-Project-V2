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
        'pointer-events-none fixed bottom-0 left-0 right-0 z-40 bg-transparent px-4 pb-[calc(5.6rem+env(safe-area-inset-bottom))] pt-3 md:hidden',
        className
      )}
    >
      <div className="mobile-surface pointer-events-auto mx-auto flex w-full max-w-md items-center gap-3 rounded-[28px] p-2">
        {children}
      </div>
    </div>
  );
};
