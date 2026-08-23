/**
 * 퀘스트 카드 컴포넌트 - Glassmorphism 스타일
 */
import React, { useState, useCallback } from 'react';
import { DailyQuest } from '@types';
import { Button } from '.';

interface QuestCardProps {
  quest: DailyQuest;
  onComplete?: (questId: string) => void;
  isCompleting?: boolean;
}

const difficultyConfig = {
  easy: { 
    label: '쉬움', 
    color: 'text-green-400',
    bgColor: 'from-green-500/20 to-emerald-500/20 border-green-400/30',
    gradient: 'from-green-400 to-emerald-400',
    icon: '🟢'
  },
  normal: {
    label: '보통',
    color: 'text-yellow-400',
    bgColor: 'from-yellow-500/20 to-orange-500/20 border-yellow-400/30',
    gradient: 'from-yellow-400 to-orange-400',
    icon: '🟡'
  },
  hard: { 
    label: '어려움', 
    color: 'text-red-400',
    bgColor: 'from-red-500/20 to-pink-500/20 border-red-400/30',
    gradient: 'from-red-400 to-pink-400',
    icon: '🔴'
  },
};

const CONFETTI_EMOJIS = ['🎉', '✨', '🎊', '🌟', '💫', '⭐', '🎆'];

export const QuestCard: React.FC<QuestCardProps> = ({
  quest,
  onComplete,
  isCompleting = false,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; left: string; emoji: string; delay: number }>>([]);

  const config = difficultyConfig[quest.difficulty];
  const isCompleted = quest.status === 'completed';

  const handleCompleteClick = useCallback(() => {
    // 폭죽 이펙트 생성
    const newConfetti = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
      delay: i * 0.03,
    }));
    
    setShowConfetti(true);
    setConfetti(newConfetti);
    
    // 콜백 실행
    onComplete?.(quest.id);
    
    // 애니메이션 후 리셋
    setTimeout(() => {
      setShowConfetti(false);
      setConfetti([]);
    }, 1800);
  }, [onComplete]);

  return (
    <div 
      className={`relative bg-gradient-to-br ${config.bgColor} backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-xl hover:shadow-2xl transition-all ${
        isCompleted ? 'opacity-50' : ''
      }`}
    >
      {/* 폭죽 이펙트 - 절대 위치로 QuestCard 기준 렌더링 */}
      {showConfetti && (
        <>
          <style>{`
            @keyframes confetti-pop {
              0% {
                opacity: 1;
                transform: translateY(0) rotate(0deg) scale(1);
              }
              100% {
                opacity: 0;
                transform: translateY(300px) rotate(720deg) scale(0);
              }
            }
          `}</style>
          <div 
            className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none" 
            style={{ zIndex: 999 }}
          >
            {confetti.map((item) => (
              <div
                key={item.id}
                className="absolute text-2xl"
                style={{
                  left: item.left,
                  top: '-30px',
                  animation: `confetti-pop 1.5s ease-out forwards`,
                  animationDelay: `${item.delay}s`,
                  willChange: 'transform, opacity',
                }}
              >
                {item.emoji}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="space-y-4 relative z-10">
        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md bg-white/10 border border-white/20 ${config.color} flex items-center gap-1`}>
                {config.icon} {config.label}
              </span>
              {isCompleted && (
                <span className="text-green-400 text-lg animate-pulse">✓</span>
              )}
            </div>
            <h3 className="text-base font-semibold text-white">
              {quest.title}
            </h3>
            <p className="text-xs text-white/70 mt-1">
              {quest.description}
            </p>
          </div>
        </div>

        {/* 보상 정보 - 글래스모피즘 스타일 */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60 font-medium">경험치</span>
            <span className={`font-bold text-sm bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent`}>
              +{quest.expReward} EXP
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60 font-medium">골드</span>
            <span className={`font-bold text-sm bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent`}>
              +{quest.goldReward} 💰
            </span>
          </div>
          {quest.difficulty === 'hard' && (
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-xs text-white/60 font-medium">포인트 보너스</span>
              <span className={`font-bold text-sm bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent`}>
                +{Math.round(quest.expReward * 0.6)} PT
              </span>
            </div>
          )}
        </div>

        {/* 버튼 */}
        {!isCompleted && (
          <Button
            onClick={handleCompleteClick}
            disabled={isCompleting}
            className="w-full"
            label={isCompleting ? '처리 중...' : '완료'}
          />
        )}
      </div>
    </div>
  );
};
