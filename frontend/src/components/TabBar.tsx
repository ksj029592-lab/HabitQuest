/**
 * Glassmorphism 탭바 컴포넌트
 */
import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const DEFAULT_TABS: TabItem[] = [
  { id: 'quests', label: '퀘스트', icon: '⚔️' },
  { id: 'stats', label: '통계', icon: '📊' },
  { id: 'shop', label: '상점', icon: '🛒' },
  { id: 'profile', label: '프로필', icon: '👤' },
  { id: 'ranking', label: '랭킹', icon: '🏆' },
];

interface TabBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: TabItem[];
  activeTabId?: string;
  activeTab?: string;
  onTabChange: (tabId: string) => void;
}

export const TabBar = React.forwardRef<HTMLDivElement, TabBarProps>(
  ({ items = DEFAULT_TABS, activeTabId, activeTab, onTabChange, className = '', ...props }, ref) => {
    const currentActiveId = activeTabId || activeTab || 'quests';
    const tabItems = items && items.length > 0 ? items : DEFAULT_TABS;

    return (
      <div
        ref={ref}
        className={`fixed bottom-0 left-0 right-0 flex items-center justify-around bg-gradient-to-t from-slate-950/90 via-slate-900/80 to-black/60 backdrop-blur-2xl border-t border-white/20 px-4 py-3 gap-2 z-40 ${className}`}
        {...props}
      >
        {tabItems.map((item) => {
          const isActive = currentActiveId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-2.5 px-2 rounded-2xl transition-all relative backdrop-blur-md border ${
                isActive
                  ? 'bg-gradient-to-br from-purple-500/40 via-pink-500/30 to-blue-500/40 text-white ring-2 ring-purple-400/80 border-purple-300/60 shadow-lg shadow-purple-500/20'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border-white/10'
              }`}
              aria-label={item.label}
              aria-pressed={isActive}
            >
              <div className="text-xl">{item.icon}</div>
              <span className="text-[11px] text-center font-medium leading-none">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg border border-white/50 px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
);

TabBar.displayName = 'TabBar';
