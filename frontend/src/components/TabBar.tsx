/**
 * Apple HIG 기반 탭바 컴포넌트
 */
import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface TabBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TabItem[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}

export const TabBar = React.forwardRef<HTMLDivElement, TabBarProps>(
  ({ items, activeTabId, onTabChange, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`fixed bottom-0 left-0 right-0 flex items-center justify-around bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3 gap-4 ${className}`}
        {...props}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 px-4 rounded-lg transition-colors relative ${
              activeTabId === item.id
                ? 'text-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
            aria-label={item.label}
            aria-pressed={activeTabId === item.id}
          >
            <div className="text-2xl">{item.icon}</div>
            <span className="text-xs text-center">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute top-0 right-0 min-w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }
);

TabBar.displayName = 'TabBar';
