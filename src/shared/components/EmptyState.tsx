import * as React from 'react';
import { X, LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export const EmptyState = ({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="mb-4 rounded-full bg-gray-50 p-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mb-6 max-w-xs text-sm text-text-secondary">{description}</p>
      {action}
    </div>
  );
};
