/**
 * Glassmorphism 헤더 컴포넌트
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
        className={`flex items-center justify-between px-6 py-4 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl border-b border-white/20 z-40 ${className}`}
        {...props}
      >
        <div className="flex items-center gap-3 flex-1">
          {onBackPress && (
            <button
              onClick={onBackPress}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/20 backdrop-blur-md"
              aria-label="Back"
            >
              <span className="text-2xl text-white/80 hover:text-white">‹</span>
            </button>
          )}
          <div className="flex-1">
            {title && (
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {title}
              </h1>
            )}
            {subtitle && <p className="text-sm text-white/60">{subtitle}</p>}
          </div>
        </div>
        {trailing && <div className="ml-4">{trailing}</div>}
      </div>
    );
  }
);

Header.displayName = 'Header';
