/**
 * 퀘스트 카드 컴포넌트 - Glassmorphism 스타일
 */
import React from 'react';
import { Check, CheckCheck, Coins, Flag, LoaderCircle, Trophy, Zap } from 'lucide-react';
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

export const QuestCard: React.FC<QuestCardProps> = ({
  quest,
  onComplete,
  isCompleting = false,
}) => {
  const config = difficultyConfig[quest.difficulty];
  const isCompleted = quest.status === 'completed';

  return (
    <article className={`hq-quest ${isCompleted ? 'is-completed' : ''}`}>
      <div className={`hq-quest-symbol ${quest.difficulty}`} aria-hidden="true">
        {isCompleted ? <CheckCheck size={23} /> : <Flag size={23} />}
      </div>
      <div className="hq-quest-body">
        <div className="hq-quest-meta">
          <span className={`hq-difficulty ${quest.difficulty}`}>{config.label}</span>
          <span>{isCompleted ? '완료한 퀘스트' : `QUEST ${String(quest.slotNo + 1).padStart(2, '0')}`}</span>
        </div>
        <h3>{quest.title}</h3>
        <p>{quest.description}</p>
        <div className="hq-quest-rewards" aria-label="퀘스트 보상">
          <span title="경험치"><Zap size={14} /> +{quest.expReward} XP</span>
          <span title="골드"><Coins size={14} /> +{quest.goldReward} G</span>
          <span title="랭킹 포인트"><Trophy size={14} /> +{quest.rankingPointAwarded ?? quest.rankingPointReward ?? { easy: 10, normal: 20, hard: 30 }[quest.difficulty]} PT</span>
        </div>
        {isCompleted && quest.verificationFeedback && <p className="hq-quest-feedback">{quest.verificationFeedback}</p>}
      </div>
      {!isCompleted && (
        <Button onClick={() => onComplete?.(quest.id)} disabled={isCompleting} className="hq-quest-complete">
          {isCompleting ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
          {isCompleting ? '처리 중' : '완료하기'}
        </Button>
      )}
    </article>
  );
};
