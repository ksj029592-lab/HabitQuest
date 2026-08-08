/**
 * Apple HIG 기반 카드 컴포넌트
 */
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ interactive = false, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-sm ${
          interactive ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
        } ${className}`}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
