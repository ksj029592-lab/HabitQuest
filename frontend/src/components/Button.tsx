/**
 * Glassmorphism 버튼 컴포넌트
 */
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'plain';
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode;
  label?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'medium', className = '', label, children, ...props }, ref) => {
    const baseStyles =
      'font-system rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md border border-white/20 shadow-lg';

    const variantStyles = {
      primary: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 active:shadow-inner',
      secondary:
        'bg-white/10 text-white/80 hover:bg-white/20 border-white/30',
      destructive: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 active:shadow-inner',
      plain: 'text-blue-300 hover:text-blue-400 active:text-blue-500 border-transparent',
    };

    const sizeStyles = {
      small: 'px-4 py-2 text-sm h-8',
      medium: 'px-6 py-3 text-base h-11',
      large: 'px-8 py-4 text-lg h-14',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {label || children}
      </button>
    );
  }
);

Button.displayName = 'Button';
