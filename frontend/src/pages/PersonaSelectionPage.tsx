/**
 * 페르소나 선택 페이지
 */
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonaSelector } from '@components';
import { useSessionStore } from '@store';
import { personaApi } from '@api';
import { useQuestStore } from '@store';
import { TestPersona } from '@types';
import { isAxiosError } from 'axios';

export const PersonaSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const setQuests = useQuestStore((state) => state.setQuests);
  const [selectedPersona, setSelectedPersona] = useState<TestPersona | null>(null);
  const [habits, setHabits] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [customHabit, setCustomHabit] = useState('');
  const [extraHabits, setExtraHabits] = useState<string[]>([]);

  const habitOptions = ['운동과 건강', '독서와 학습', '집중력과 생산성', '마음 챙김', '수면 습관', '정리와 생활', ...extraHabits];

  const toggleHabit = (habit: string) => {
    setHabits((current) => current.includes(habit) ? current.filter((item) => item !== habit) : current.length < 8 ? [...current, habit] : current);
  };

  const handlePersonaSelected = useCallback((persona: TestPersona) => {
    setSelectedPersona(persona);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedPersona || habits.length === 0 || isGenerating) return;
    setIsGenerating(true);
    setSessionError('');
    try {
      const response = await personaApi.selectPersona(selectedPersona.id, { habits, note, difficulty });
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || '서버 세션 생성에 실패했습니다.');
      }
      setQuests([]);
      setSession({
        ...response.data,
        lastActivityAt: new Date().toISOString(),
        personaData: {
          ...response.data.personaData,
          userPreferences: { habits, note, difficulty },
        },
      });
      navigate('/home');
    } catch (error) {
      if (isAxiosError(error)) {
        setSessionError(error.response?.status === 429
          ? '지금 시작 요청이 많아요. 잠시 후 다시 시도해 주세요.'
          : '서버 세션을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
      } else {
        setSessionError(error instanceof Error ? error.message : '세션 생성에 실패했습니다.');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [difficulty, habits, isGenerating, navigate, note, selectedPersona, setQuests, setSession]);

  if (!selectedPersona) return <PersonaSelector onPersonaSelected={handlePersonaSelected} />;

  return (
    <div className="hq-onboarding hq-preferences min-h-screen px-5 py-9 pb-32">
      <div className="max-w-md mx-auto space-y-6 pb-8">
        <button onClick={() => setSelectedPersona(null)} className="hq-text-button">← 페르소나 다시 선택</button>
        <div>
          <p className="hq-eyebrow">{selectedPersona.name}와 함께 시작하기</p>
          <h1 className="text-3xl font-bold">어떤 습관을 만들까요?</h1>
          <p className="hq-activity-caption mt-2">선택한 목표와 답변을 바탕으로 오늘의 퀘스트를 다르게 만들어요.</p>
        </div>

        <section className="space-y-3">
          <h2 className="font-semibold">관심 있는 습관을 모두 골라주세요</h2>
          <div className="grid grid-cols-2 gap-3">
            {habitOptions.map((habit) => (
              <button key={habit} disabled={isGenerating || !habits.includes(habit) && habits.length >= 8} onClick={() => toggleHabit(habit)} className="hq-choice-chip text-left" aria-pressed={habits.includes(habit)}>
                {habits.includes(habit) ? '✓ ' : ''}{habit}
              </button>
            ))}
          </div>
          <form className="hq-custom-habit" onSubmit={(event) => { event.preventDefault(); const name = customHabit.trim(); if (!name || habits.length >= 8 || habitOptions.some((habit) => habit.toLowerCase() === name.toLowerCase())) return; setExtraHabits((current) => [...current, name]); setHabits((current) => [...current, name]); setCustomHabit(''); }}>
            <label htmlFor="custom-habit-name">직접 습관 추가</label><div><input id="custom-habit-name" maxLength={80} value={customHabit} disabled={isGenerating} onChange={(event) => setCustomHabit(event.target.value)} placeholder="예: 영어 공부" /><button type="submit" className="hq-choice-chip" disabled={isGenerating || !customHabit.trim() || habits.length >= 8 || habitOptions.some((habit) => habit.toLowerCase() === customHabit.trim().toLowerCase())}>추가</button></div>
          </form>
          <p className="hq-activity-caption">최대 8개 · 처음에는 매일 실천으로 시작해요. 시작 후 내 프로필에서 요일과 주간 목표를 바꿀 수 있어요.</p>
        </section>

        <section className="space-y-3">
          <label htmlFor="habit-note" className="font-semibold block">오늘 특히 이루고 싶은 것은?</label>
          <textarea id="habit-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="예: 퇴근 후 20분만 운동하고 싶어요" className="w-full min-h-24 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">오늘의 난이도</h2>
          <div className="grid grid-cols-3 gap-2">
            {([['easy', '가볍게'], ['normal', '적당히'], ['hard', '도전적으로']] as const).map(([value, label]) => (
              <button key={value} onClick={() => setDifficulty(value)} className="hq-choice-chip" aria-pressed={difficulty === value}>{label}</button>
            ))}
          </div>
        </section>

        <div className="hq-preferences-footer fixed bottom-0 left-0 right-0 z-50 border-t px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <div className="max-w-md mx-auto">
          {sessionError && <p role="alert" className="text-sm text-red-600 mb-3">{sessionError}</p>}
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
            {isGenerating ? 'AI가 맞춤 퀘스트를 만드는 중...' : '페르소나로 시작'}
          </button>
          {habits.length === 0 && (
            <p className="text-xs text-center text-gray-400 mt-2">먼저 습관을 하나 이상 선택하세요.</p>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
