import * as React from 'react';
import { cn } from '../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  className?: string;
  key?: string | number;
}

export const Card = ({ className, padding = 'md', children, ...props }: CardProps) => {
  const paddings = {
    none: '',
    sm: 'p-4 sm:p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-8',
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[24px] border border-slate-200/90 bg-white card-shadow sm:rounded-xl',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-lg font-semibold text-text-primary', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-text-secondary', className)} {...props}>
    {children}
  </p>
);
