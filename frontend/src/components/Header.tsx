/**
 * Apple HIG 기반 타이틀/헤더 컴포넌트
 */
import React from 'react';

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onBackPress?: () => void;
}

export const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  ({ title, subtitle, trailing, onBackPress, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 ${className}`}
        {...props}
      >
        <div className="flex items-center gap-3 flex-1">
          {onBackPress && (
            <button
              onClick={onBackPress}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Back"
            >
              <span className="text-2xl">‹</span>
            </button>
          )}
          <div className="flex-1">
            {title && <h1 className="text-2xl font-bold text-black dark:text-white">{title}</h1>}
            {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {trailing && <div className="ml-4">{trailing}</div>}
      </div>
    );
  }
);

Header.displayName = 'Header';
