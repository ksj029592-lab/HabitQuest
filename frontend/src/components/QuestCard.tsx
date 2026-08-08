/**
 * 퀘스트 카드 컴포넌트
 */
import React from 'react';
import { DailyQuest } from '@types';
import { Card, Button } from '.';

interface QuestCardProps {
  quest: DailyQuest;
  onComplete?: (questId: string) => void;
  isCompleting?: boolean;
}

const difficultyConfig = {
  easy: { label: '쉬움', color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900' },
  normal: {
    label: '보통',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900',
  },
  hard: { label: '어려움', color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900' },
};

export const QuestCard: React.FC<QuestCardProps> = ({
  quest,
  onComplete,
  isCompleting = false,
}) => {
  const config = difficultyConfig[quest.difficulty];
  const isCompleted = quest.status === 'completed';

  return (
    <Card className={isCompleted ? 'opacity-60' : ''}>
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor}`}>
                {config.label}
              </span>
              {isCompleted && (
                <span className="text-green-500 text-lg">✓</span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-black dark:text-white">
              {quest.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {quest.description}
            </p>
          </div>
        </div>

        {/* 보상 정보 */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">경험치</span>
            <span className="font-semibold text-blue-500">+{quest.expReward} EXP</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">골드</span>
            <span className="font-semibold text-yellow-500">+{quest.goldReward} 💰</span>
          </div>
          {quest.difficulty === 'hard' && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-300 dark:border-gray-700">
              <span className="text-xs text-gray-600 dark:text-gray-400">포인트 보너스</span>
              <span className="font-semibold text-purple-500">+{Math.round(quest.expReward * 0.6)} PT</span>
            </div>
          )}
        </div>

        {/* 버튼 */}
        {!isCompleted && (
          <Button
            onClick={() => onComplete?.(quest.id)}
            disabled={isCompleting}
            className="w-full"
          >
            {isCompleting ? '처리 중...' : '완료'}
          </Button>
        )}
      </div>
    </Card>
  );
};
