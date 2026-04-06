import * as React from 'react';
import { cn } from '../../../shared/utils/cn';

interface MobilePageProps {
  children: React.ReactNode;
  className?: string;
}

export const MobilePage = ({ children, className }: MobilePageProps) => {
  return (
    <div className={cn('mx-auto flex min-h-full w-full max-w-md flex-col px-4 pb-32 pt-4', className)}>
      {children}
    </div>
  );
};
