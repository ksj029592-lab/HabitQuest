/**
 * 페르소나 선택 페이지
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonaSelector } from '@components';
import { useSessionStore } from '@store';
import { personaApi } from '@api';
import { TestPersona, UserSession } from '@types';

export const PersonaSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);

  const handlePersonaSelected = useCallback(
    async (persona: TestPersona) => {
      try {
        // Mock 세션 생성 (백엔드 없이 테스트)
        const mockSession: UserSession = {
          sessionId: `session_${Date.now()}`,
          personaId: persona.id,
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          personaData: {
            userId: `user_${Date.now()}`,
            persona: persona,
            level: persona.initialLevel,
            totalExp: 0,
            gold: persona.initialGold,
            streak: {
              currentStreak: persona.initialStreak,
              bestStreak: persona.initialStats.bestStreak,
              lastAttendanceDateKst: new Date().toISOString().split('T')[0],
            },
            attendance: {
              todayChecked: false,
              lastSevenDaysKst: [],
            },
            inventory: [
              {
                itemType: 'protection_ticket',
                rarity: 'common',
                quantity: persona.protectionTickets,
                name: '방지권',
              },
              {
                itemType: 'cosmetic',
                rarity: 'common',
                quantity: 1,
                name: persona.equippedTitle || '없음',
              },
              {
                itemType: 'cosmetic',
                rarity: 'common',
                quantity: 1,
                name: persona.equippedBorder || '없음',
              },
            ],
            stats: {
              totalQuestsCompleted: persona.initialStats.totalQuestsCompleted,
              monthlySuccessRate: persona.initialStats.monthlySuccessRate,
              averageStreakLength: 0,
              thisMonthQuestsCompleted: persona.initialStats.totalQuestsCompleted,
            },
            equippedTitle: persona.equippedTitle,
            equippedBorder: persona.equippedBorder,
            avatarIndex: persona.avatarIndex,
          },
        };
        
        setSession(mockSession);
        navigate('/home');
      } catch (error) {
        console.error('Failed to select persona:', error);
      }
    },
    [navigate, setSession]
  );

  return <PersonaSelector onPersonaSelected={handlePersonaSelected} />;
};
