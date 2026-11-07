/**
 * 퀘스트 카드와 서버 보상 표시
 */
import React from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { DailyQuest } from '@types';
import { Button } from './Button';
import { FieldIcon } from './FieldArt';

interface QuestCardProps {
  quest: DailyQuest;
  onComplete?: (questId: string) => void;
  isCompleting?: boolean;
}

const difficultyLabels = { easy: '쉬움', normal: '보통', hard: '어려움' };

export const QuestCard: React.FC<QuestCardProps> = ({
  quest,
  onComplete,
  isCompleting = false,
}) => {
  const isCompleted = quest.status === 'completed';

  return (
    <article className={`hq-quest ${isCompleted ? 'is-completed' : ''}`}>
      <div className={`hq-quest-symbol ${quest.difficulty}`} aria-hidden="true">
        <FieldIcon name={isCompleted ? 'check' : 'flag'} size={22} />
      </div>
      <div className="hq-quest-body">
        <div className="hq-quest-meta">
          <span className={`hq-difficulty ${quest.difficulty}`}>{difficultyLabels[quest.difficulty]}</span>
          <span className="hq-quest-category">{quest.categoryName || '습관 퀘스트'}</span>
          <span>{isCompleted ? '완료' : '진행 중'}</span>
        </div>
        <h3>{quest.title}</h3>
        <p>{quest.description}</p>
        <div className="hq-quest-rewards" aria-label={isCompleted ? "지급된 보상" : "기본 보상"}>
          <span title="경험치"><FieldIcon name="spark" size={14} /> +{quest.expReward} XP</span>
          <span title="골드"><FieldIcon name="coin" size={14} /> +{quest.goldReward} G</span>
          <span title="랭킹 포인트"><FieldIcon name="flag" size={14} /> +{isCompleted ? (quest.rankingPointAwarded ?? '—') : (quest.rankingPointReward ?? '—')} PT</span>
        </div>
        {isCompleted && quest.rewardAdjustments?.includes('daily_gold_cap') && <p className="hq-quest-feedback">일일 골드 한도가 적용됐어요.</p>}
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
