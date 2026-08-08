/**
 * Apple HIG 기반 버튼 컴포넌트
 */
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'plain';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'medium', className = '', ...props }, ref) => {
    const baseStyles =
      'font-system rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
      secondary:
        'bg-gray-200 text-black hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600',
      destructive: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
      plain: 'text-blue-500 hover:text-blue-600 active:text-blue-700',
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
      />
    );
  }
);

Button.displayName = 'Button';
