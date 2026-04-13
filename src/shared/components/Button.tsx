import * as React from 'react';
import { cn } from '../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-brand text-white hover:bg-brand-hover shadow-sm',
      secondary: 'bg-white text-text-primary border border-gray-200 hover:bg-gray-50 shadow-sm',
      outline: 'bg-transparent text-brand border border-brand hover:bg-brand/5',
      ghost: 'bg-transparent text-text-secondary hover:bg-gray-100 hover:text-text-primary',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    };

    const sizes = {
      sm: 'min-h-[40px] px-3 py-2 text-sm',
      md: 'min-h-[44px] px-4 py-2.5 text-sm sm:text-base',
      lg: 'min-h-[52px] px-6 py-3 text-base sm:text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-2xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:pointer-events-none disabled:opacity-50 sm:rounded-lg',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);
