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
      'hq-button rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

    const variantStyles = {
      primary: 'bg-teal-700 border-teal-700 text-white hover:bg-teal-800',
      secondary:
        'bg-white text-gray-700 hover:bg-gray-50 border-gray-200',
      destructive: 'bg-red-600 border-red-600 text-white hover:bg-red-700',
      plain: 'text-teal-700 hover:bg-teal-50 border-transparent',
    };

    const sizeStyles = {
      small: 'px-3 py-2 text-xs min-h-11',
      medium: 'px-5 py-2.5 text-sm min-h-11',
      large: 'px-6 py-3 text-base min-h-14',
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
