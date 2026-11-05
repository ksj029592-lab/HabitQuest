/**
 * Glassmorphism 탭바 컴포넌트
 */
import React from 'react';
import { ChartNoAxesCombined, ListChecks, ShoppingBag, Trophy, UserRound } from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const DEFAULT_TABS: TabItem[] = [
  { id: 'quests', label: '오늘의 퀘스트', icon: <ListChecks size={20} /> },
  { id: 'stats', label: '활동 통계', icon: <ChartNoAxesCombined size={20} /> },
  { id: 'shop', label: '보상 상점', icon: <ShoppingBag size={20} /> },
  { id: 'profile', label: '내 프로필', icon: <UserRound size={20} /> },
  { id: 'ranking', label: '시즌 랭킹', icon: <Trophy size={20} /> },
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
        role="navigation"
        aria-label="주 메뉴"
        className={`hq-navigation ${className}`}
        {...props}
      >
        {tabItems.map((item) => {
          const isActive = currentActiveId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`hq-nav-item ${isActive ? 'is-active' : ''}`}
              aria-label={item.label}
              aria-pressed={isActive}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
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
