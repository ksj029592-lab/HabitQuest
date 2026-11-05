/**
 * Glassmorphism 헤더 컴포넌트 (상단 콤팩트 사용자 정보 바 지원)
 */
import React from 'react';
import { ArrowLeft, CalendarCheck, Coins, Flame, Sprout, Trophy, Zap } from 'lucide-react';

export interface HeaderUserStats {
  level: number;
  expProgress: number;
  currentStreak: number;
  totalAttendanceDays: number;
  seasonRankingPoints: number;
  gold: number;
}

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onBackPress?: () => void;
  userStats?: HeaderUserStats;
}

export const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  ({ title, subtitle, trailing, onBackPress, userStats, className = '', ...props }, ref) => {
    return (
      <header
        ref={ref}
        className={`hq-header ${className}`}
        {...props}
      >
        <div className="hq-header-inner">
          {/* Top Bar: 로고 / 제목 / 상단 콤팩트 스탯 & 선택창 버튼 */}
          <div className="hq-brand-row">
            <div className="flex items-center gap-2">
              {onBackPress && (
                <button
                  onClick={onBackPress}
                  className="hq-icon-button"
                  aria-label="뒤로 가기"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <Sprout className="hq-brand-mark" size={30} aria-hidden="true" />
              <div>
                {title && (
                  <h1 className="hq-brand-title">
                    {title}
                  </h1>
                )}
                {subtitle && <p className="hq-brand-subtitle">{subtitle}</p>}
              </div>
            </div>

            {trailing && <div className="shrink-0">{trailing}</div>}
          </div>

          {/* 맨 상단부 요구사항: 연속 출석, 총 출석, 포인트, 골드, 레벨(Lv. , XP n%) 콤팩트 명시 바 */}
          {userStats && (
            <div className="hq-wallet">
              <span title={`경험치 ${userStats.expProgress}%`}><Zap size={15} /> Lv.{userStats.level}</span>
              <span title="연속 출석"><Flame size={15} /> {userStats.currentStreak}일</span>
              <span title="총 출석"><CalendarCheck size={15} /> {userStats.totalAttendanceDays}일</span>
              <span title="시즌 랭킹 포인트"><Trophy size={15} /> {userStats.seasonRankingPoints.toLocaleString()} PT</span>
              <span title="보유 골드"><Coins size={15} /> {userStats.gold.toLocaleString()} G</span>
            </div>
          )}
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';
