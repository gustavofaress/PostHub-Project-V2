import * as React from 'react';
import { cn } from '../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && <label className="text-sm font-medium text-text-primary">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'flex h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] ring-offset-white transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:rounded-lg sm:px-3 sm:text-sm',
              icon && 'pl-10',
              error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
