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
        itemsPreset: [
          { itemType: 'protection_ticket', quantity: 0, name: '방지권' },
        ],
        role: 'beginner',
        avatarIndex: 0,
        equippedTitle: null,
        equippedBorder: null,
        protectionTickets: 0,
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
          { itemType: 'cosmetic', rarity: 'rare', quantity: 1, name: '금색 테두리' },
        ],
        role: 'active',
        avatarIndex: 2,
        equippedTitle: '부지런한',
        equippedBorder: '금색 테두리',
        protectionTickets: 2,
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
          { itemType: 'cosmetic', rarity: 'legendary', quantity: 1, name: '무지개 테두리' },
        ],
        role: 'advanced',
        avatarIndex: 4,
        equippedTitle: '전설의',
        equippedBorder: '무지개 테두리',
        protectionTickets: 3,
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
    <div className="h-screen bg-gray-50 dark:bg-gray-950 flex flex-col overflow-hidden">
      <div className="text-center px-6 py-12 flex-shrink-0">
        <h1 className="text-4xl font-bold text-black dark:text-white mb-3">HabitQuest</h1>
        <p className="text-gray-600 dark:text-gray-400">플레이할 페르소나를 선택하세요</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-12">
        <div className="w-full max-w-md mx-auto space-y-4">
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

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">보유 아이템 & 착용 중</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-700 dark:text-gray-300">🛡️ 방지권</span>
                    <span className="font-semibold text-blue-500">{persona.protectionTickets}개</span>
                  </div>
                  {persona.equippedTitle && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 dark:text-gray-300">🏅 칭호</span>
                      <span className="font-semibold text-purple-500">{persona.equippedTitle}</span>
                    </div>
                  )}
                  {persona.equippedBorder && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 dark:text-gray-300">🎨 테두리</span>
                      <span className="font-semibold text-emerald-500">{persona.equippedBorder}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
        </div>
      </div>

      <div className="flex-shrink-0 px-6 py-6 bg-gray-50 dark:bg-gray-950">
        <button
          onClick={() => {
            if (selectedPersona) {
              const persona = personas.find((p) => p.id === selectedPersona);
              if (persona) {
                onPersonaSelected(persona);
              }
            }
          }}
          disabled={!selectedPersona}
          className={`w-full px-6 py-3 rounded-xl font-semibold transition-colors ${
            selectedPersona
              ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer active:scale-95 transform'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {selectedPersona ? '게임 시작' : '페르소나를 선택하세요'}
        </button>
      </div>
    </div>
  );
};
