/**
 * Reusable Button component with variants and motion feedback
 */

import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  children: ReactNode;
  isLoading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  disabled,
  ...props
}, ref) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1';

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-soft',
    secondary: 'bg-surface-100 text-surface-700 hover:bg-surface-200 focus:ring-surface-400',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500 shadow-soft',
    success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 shadow-soft',
    ghost: 'bg-transparent text-surface-600 hover:bg-surface-100 hover:text-surface-900 focus:ring-surface-400',
    outline: 'bg-transparent border border-surface-300 text-surface-700 hover:bg-surface-50 hover:border-surface-400 focus:ring-primary-500',
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs gap-1',
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2',
  };

  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const MotionButton = motion.button;

  return (
    <MotionButton
      ref={ref}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
      transition={{ duration: 0.1 }}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...(props as any)}
    >
      {isLoading ? (
        <>
          <svg className={`animate-spin ${iconSizes[size]}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Laddar...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className={iconSizes[size]} />}
          {children}
          {IconRight && <IconRight className={iconSizes[size]} />}
        </>
      )}
    </MotionButton>
  );
});
