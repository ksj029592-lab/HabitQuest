/**
 * Glassmorphism 헤더 컴포넌트 (상단 콤팩트 사용자 정보 바 지원)
 */
import React from 'react';

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
        className={`sticky top-0 z-40 bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950/80 backdrop-blur-xl border-b border-white/10 shadow-lg ${className}`}
        {...props}
      >
        <div className="max-w-xl mx-auto px-4 py-3 space-y-2">
          {/* Top Bar: 로고 / 제목 / 상단 콤팩트 스탯 & 선택창 버튼 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {onBackPress && (
                <button
                  onClick={onBackPress}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/20 backdrop-blur-md text-white font-bold"
                  aria-label="Back"
                >
                  ‹
                </button>
              )}
              <div>
                {title && (
                  <h1 className="text-xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent leading-none">
                    {title}
                  </h1>
                )}
                {subtitle && <p className="text-[11px] text-slate-300 mt-0.5">{subtitle}</p>}
              </div>
            </div>

            {trailing && <div className="shrink-0">{trailing}</div>}
          </div>

          {/* 맨 상단부 요구사항: 연속 출석, 총 출석, 포인트, 골드, 레벨(Lv. , XP n%) 콤팩트 명시 바 */}
          {userStats && (
            <div className="grid grid-cols-5 gap-1.5 pt-1.5 border-t border-white/10 text-[11px]">
              {/* 1. 레벨 & XP % */}
              <div className="bg-purple-900/40 border border-purple-400/30 rounded-xl px-1.5 py-1 text-center backdrop-blur-md">
                <div className="text-[10px] text-purple-300 font-medium">레벨</div>
                <div className="font-extrabold text-white text-[11px]">
                  Lv.{userStats.level} <span className="text-[9px] text-purple-200">({userStats.expProgress}%)</span>
                </div>
              </div>

              {/* 2. 연속 출석 */}
              <div className="bg-orange-900/40 border border-orange-400/30 rounded-xl px-1.5 py-1 text-center backdrop-blur-md">
                <div className="text-[10px] text-orange-300 font-medium">🔥 연속</div>
                <div className="font-extrabold text-orange-200 text-[11px]">{userStats.currentStreak}일</div>
              </div>

              {/* 3. 총 출석 */}
              <div className="bg-blue-900/40 border border-blue-400/30 rounded-xl px-1.5 py-1 text-center backdrop-blur-md">
                <div className="text-[10px] text-blue-300 font-medium">📅 총출석</div>
                <div className="font-extrabold text-blue-200 text-[11px]">{userStats.totalAttendanceDays}일</div>
              </div>

              {/* 4. 시즌 포인트 */}
              <div className="bg-pink-900/40 border border-pink-400/30 rounded-xl px-1.5 py-1 text-center backdrop-blur-md">
                <div className="text-[10px] text-pink-300 font-medium">🏆 포인트</div>
                <div className="font-extrabold text-pink-200 text-[11px]">{userStats.seasonRankingPoints}P</div>
              </div>

              {/* 5. 골드 */}
              <div className="bg-yellow-900/40 border border-yellow-400/30 rounded-xl px-1.5 py-1 text-center backdrop-blur-md">
                <div className="text-[10px] text-yellow-300 font-medium">💰 골드</div>
                <div className="font-extrabold text-yellow-200 text-[11px]">{userStats.gold}</div>
              </div>
            </div>
          )}
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';
