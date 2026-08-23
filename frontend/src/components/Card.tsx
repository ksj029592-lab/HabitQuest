/**
 * Glassmorphism 카드 컴포넌트
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
        className={`rounded-2xl bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl border border-white/20 p-6 shadow-xl ${
          interactive ? 'hover:shadow-2xl hover:bg-white/20 transition-all cursor-pointer' : ''
        } ${className}`}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
