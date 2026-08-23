/**
 * 페르소나 선택 페이지
 */
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonaSelector } from '@components';
import { useSessionStore } from '@store';
import { aiApi } from '@api';
import { useQuestStore } from '@store';
import { TestPersona, UserSession } from '@types';

export const PersonaSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const setQuests = useQuestStore((state) => state.setQuests);
  const [selectedPersona, setSelectedPersona] = useState<TestPersona | null>(null);
  const [habits, setHabits] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [isGenerating, setIsGenerating] = useState(false);

  const habitOptions = ['운동과 건강', '독서와 학습', '집중력과 생산성', '마음 챙김', '수면 습관', '정리와 생활'];

  const toggleHabit = (habit: string) => {
    setHabits((current) => current.includes(habit) ? current.filter((item) => item !== habit) : [...current, habit]);
  };

  const handlePersonaSelected = useCallback((persona: TestPersona) => {
    setSelectedPersona(persona);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedPersona || habits.length === 0 || isGenerating) return;
    setIsGenerating(true);
    try {
      try {
        const response = await aiApi.generateQuests({
          personaName: selectedPersona.name,
          habits,
          note,
          difficulty,
        });
        if (response.success && response.data?.length) setQuests(response.data);
      } catch (error) {
        console.error('AI quest generation failed; HomePage fallback will be used:', error);
      }

        // Mock 세션 생성 (백엔드 없이 테스트)
      const mockSession: UserSession = {
          sessionId: `session_${Date.now()}`,
          personaId: selectedPersona.id,
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          personaData: {
            userId: `user_${Date.now()}`,
            persona: selectedPersona,
            level: selectedPersona.initialLevel,
            totalExp: 0,
            gold: selectedPersona.initialGold,
            streak: {
              currentStreak: selectedPersona.initialStreak,
              bestStreak: selectedPersona.initialStats.bestStreak,
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
                quantity: selectedPersona.protectionTickets,
                name: '방지권',
              },
              {
                itemType: 'cosmetic',
                rarity: 'common',
                quantity: 1,
                name: selectedPersona.equippedTitle || '없음',
              },
              {
                itemType: 'cosmetic',
                rarity: 'common',
                quantity: 1,
                name: selectedPersona.equippedBorder || '없음',
              },
            ],
            stats: {
              totalQuestsCompleted: selectedPersona.initialStats.totalQuestsCompleted,
              monthlySuccessRate: selectedPersona.initialStats.monthlySuccessRate,
              averageStreakLength: 0,
              thisMonthQuestsCompleted: selectedPersona.initialStats.totalQuestsCompleted,
            },
            equippedTitle: selectedPersona.equippedTitle,
            equippedBorder: selectedPersona.equippedBorder,
            avatarIndex: selectedPersona.avatarIndex,
          },
        };
        
      setSession(mockSession);
      navigate('/home');
    } finally {
      setIsGenerating(false);
    }
  }, [difficulty, habits, isGenerating, navigate, note, selectedPersona, setQuests, setSession]);

  if (!selectedPersona) return <PersonaSelector onPersonaSelected={handlePersonaSelected} />;

  return (
    <div className="h-screen overflow-y-scroll overscroll-y-contain bg-gray-50 dark:bg-gray-950 text-black dark:text-white px-6 py-10">
      <div className="max-w-md mx-auto space-y-6 pb-8">
        <button onClick={() => setSelectedPersona(null)} className="text-sm text-gray-500 hover:text-blue-500">← 페르소나 다시 선택</button>
        <div>
          <p className="text-sm text-blue-500 font-semibold mb-2">{selectedPersona.name}와 함께 시작하기</p>
          <h1 className="text-3xl font-bold">어떤 습관을 만들까요?</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">선택한 목표와 답변을 바탕으로 오늘의 퀘스트를 다르게 만들어요.</p>
        </div>

        <section className="space-y-3">
          <h2 className="font-semibold">관심 있는 습관을 모두 골라주세요</h2>
          <div className="grid grid-cols-2 gap-3">
            {habitOptions.map((habit) => (
              <button key={habit} onClick={() => toggleHabit(habit)} className={`p-3 rounded-xl border text-sm text-left transition-all ${habits.includes(habit) ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
                {habits.includes(habit) ? '✓ ' : ''}{habit}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <label htmlFor="habit-note" className="font-semibold block">오늘 특히 이루고 싶은 것은?</label>
          <textarea id="habit-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="예: 퇴근 후 20분만 운동하고 싶어요" className="w-full min-h-24 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">오늘의 난이도</h2>
          <div className="grid grid-cols-3 gap-2">
            {([['easy', '가볍게'], ['normal', '적당히'], ['hard', '도전적으로']] as const).map(([value, label]) => (
              <button key={value} onClick={() => setDifficulty(value)} className={`py-2 rounded-xl border text-sm ${difficulty === value ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-gray-200 dark:border-gray-800'}`}>{label}</button>
            ))}
          </div>
        </section>

        <div className="sticky bottom-0 -mx-2 px-2 pt-4 pb-2 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm">
          {habits.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
              {habits.length}개 습관 선택됨{note.trim() ? ' • 맞춤 요청 입력됨' : ' • 자유 요청은 선택 사항'}
            </p>
          )}
          <button
            onClick={handleGenerate}
            disabled={habits.length === 0 || isGenerating}
            className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 text-white py-3.5 font-bold shadow-lg transition-all active:scale-[0.99]"
          >
            {isGenerating ? 'AI가 맞춤 퀘스트를 만드는 중...' : '선택 완료하고 메인 화면으로 이동'}
          </button>
          {habits.length === 0 && (
            <p className="text-xs text-center text-gray-400 mt-2">먼저 습관을 하나 이상 선택하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
};
