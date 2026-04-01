import * as React from 'react';
import { cn } from '../utils/cn';

export const Avatar = ({
  src,
  fallback,
  className,
  size = 'md',
}: {
  src?: string;
  fallback: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full bg-gray-100 border border-gray-200 items-center justify-center font-medium text-text-secondary',
        sizes[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt={fallback} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span>{fallback.substring(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
};
