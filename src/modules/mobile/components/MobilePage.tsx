import * as React from 'react';
import { cn } from '../../../shared/utils/cn';

interface MobilePageProps {
  children: React.ReactNode;
  className?: string;
}

export const MobilePage = ({ children, className }: MobilePageProps) => {
  return (
    <div
      className={cn(
        'mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-40 pt-5',
        className
      )}
    >
      {children}
    </div>
  );
};
