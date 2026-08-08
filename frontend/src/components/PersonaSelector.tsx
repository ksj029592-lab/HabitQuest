/**
 * 페르소나 선택 컴포넌트
 */
import React, { useState, useEffect } from 'react';
import { TestPersona, ApiResponse } from '@types';
import { Card, Button } from '.';

interface PersonaSelectorProps {
  onPersonaSelected: (persona: TestPersona) => void;
  isLoading?: boolean;
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  onPersonaSelected,
  isLoading = false,
}) => {
  const [personas, setPersonas] = useState<TestPersona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 테스트 데이터 - 실제로는 API에서 가져올 예정
  useEffect(() => {
    const testPersonas: TestPersona[] = [
      {
        id: 'beginner',
        name: '새로운 도전',
        initialLevel: 1,
        initialGold: 0,
        initialStreak: 0,
        initialStats: {
          bestStreak: 0,
          totalQuestsCompleted: 0,
          monthlySuccessRate: 0,
        },
        itemsPreset: [],
        role: 'beginner',
      },
      {
        id: 'active',
        name: '꾸준한 참여자',
        initialLevel: 15,
        initialGold: 2500,
        initialStreak: 23,
        initialStats: {
          bestStreak: 45,
          totalQuestsCompleted: 156,
          monthlySuccessRate: 85,
        },
        itemsPreset: [
          { itemType: 'protection_ticket', quantity: 2, name: '방지권' },
          { itemType: 'cosmetic', rarity: 'rare', quantity: 1, name: '프로필 테두리' },
        ],
        role: 'active',
      },
      {
        id: 'advanced',
        name: '전설의 퀘스터',
        initialLevel: 45,
        initialGold: 8000,
        initialStreak: 89,
        initialStats: {
          bestStreak: 120,
          totalQuestsCompleted: 1203,
          monthlySuccessRate: 95,
        },
        itemsPreset: [
          { itemType: 'protection_ticket', quantity: 3, name: '방지권' },
          { itemType: 'cosmetic', rarity: 'legendary', quantity: 1, name: '전설 테두리' },
        ],
        role: 'advanced',
      },
    ];

    setPersonas(testPersonas);
    setLoading(false);
  }, []);

  const handlePersonaSelect = (persona: TestPersona) => {
    setSelectedPersona(persona.id);
    onPersonaSelected(persona);
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50 dark:bg-gray-950 px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-black dark:text-white mb-3">HabitQuest</h1>
        <p className="text-gray-600 dark:text-gray-400">플레이할 페르소나를 선택하세요</p>
      </div>

      <div className="w-full max-w-md space-y-4 mb-12">
        {personas.map((persona) => (
          <Card
            key={persona.id}
            interactive
            onClick={() => handlePersonaSelect(persona)}
            className={`cursor-pointer transition-all ${
              selectedPersona === persona.id
                ? 'ring-2 ring-blue-500 shadow-lg'
                : 'hover:shadow-md'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-black dark:text-white">
                    {persona.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {persona.role === 'beginner' && '초심자'}
                    {persona.role === 'active' && '활발한 사용자'}
                    {persona.role === 'advanced' && '고도화된 사용자'}
                  </p>
                </div>
                <div className="text-3xl font-bold text-blue-500">Lv. {persona.initialLevel}</div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">연속</div>
                  <div className="text-lg font-semibold text-black dark:text-white">
                    🔥 {persona.initialStreak}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">골드</div>
                  <div className="text-lg font-semibold text-yellow-500">
                    💰 {persona.initialGold}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">퀘스트</div>
                  <div className="text-lg font-semibold text-purple-500">
                    ✨ {persona.initialStats.totalQuestsCompleted}
                  </div>
                </div>
              </div>

              {persona.itemsPreset.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">보유 아이템</p>
                  <div className="flex flex-wrap gap-2">
                    {persona.itemsPreset.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                      >
                        {item.name} ×{item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Button
        size="large"
        disabled={!selectedPersona}
        className="w-full max-w-md"
      >
        {selectedPersona ? '게임 시작' : '페르소나를 선택하세요'}
      </Button>
    </div>
  );
};
