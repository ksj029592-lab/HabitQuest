/**
 * 홈 페이지
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, TabBar, QuestCard, Button } from '@components';
import { useSessionStore, useQuestStore } from '@store';
import { questApi } from '@api';
import { DailyQuest } from '@types';

type TabId = 'quests' | 'stats' | 'shop' | 'profile';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const session = useSessionStore((state) => state.session);
  const clearSession = useSessionStore((state) => state.clearSession);
  const { quests, setQuests } = useQuestStore((state) => ({
    quests: state.quests,
    setQuests: state.setQuests,
  }));

  const [activeTab, setActiveTab] = useState<TabId>('quests');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingQuestId, setCompletingQuestId] = useState<string | null>(null);

  // 세션이 없으면 페르소나 선택 페이지로 리다이렉트
  useEffect(() => {
    if (!session) {
      navigate('/');
    }
  }, [session, navigate]);

  // 퀘스트 로드
  useEffect(() => {
    const loadQuests = async () => {
      try {
        setLoading(true);
        const response = await questApi.getDailyQuests();
        if (response.success && response.data) {
          setQuests(response.data);
        }
      } catch (err) {
        setError('퀘스트를 불러올 수 없습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadQuests();
  }, [setQuests]);

  const handleCompleteQuest = useCallback(
    async (questId: string) => {
      try {
        setCompletingQuestId(questId);
        const response = await questApi.completeQuest(questId);
        if (response.success && response.data) {
          // 로컬 상태 업데이트
          setQuests(
            quests.map((q) => (q.id === questId ? { ...q, status: 'completed' } : q))
          );
        }
      } catch (err) {
        console.error('Failed to complete quest:', err);
        setError('퀘스트 완료에 실패했습니다.');
      } finally {
        setCompletingQuestId(null);
      }
    },
    [quests, setQuests]
  );

  const handleLogout = useCallback(async () => {
    clearSession();
    navigate('/');
  }, [clearSession, navigate]);

  if (!session) {
    return null;
  }

  const personaData = session.personaData;
  const pendingQuests = quests.filter((q) => q.status === 'pending');
  const completedQuests = quests.filter((q) => q.status === 'completed');

  const tabItems = [
    { id: 'quests' as TabId, label: '퀘스트', icon: '⚔️' },
    { id: 'stats' as TabId, label: '통계', icon: '📊' },
    { id: 'shop' as TabId, label: '상점', icon: '🛍️' },
    { id: 'profile' as TabId, label: '프로필', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* 헤더 */}
      <Header
        title={`Lv. ${personaData.level}`}
        subtitle={personaData.persona.name}
        trailing={
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 text-lg"
          >
            ⌘
          </button>
        }
      />

      {/* 콘텐츠 */}
      <div className="px-6 py-6 space-y-6">
        {/* 통계 바 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-2">🔥</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">연속</div>
            <div className="text-2xl font-bold text-black dark:text-white">
              {personaData.streak.currentStreak}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">골드</div>
            <div className="text-2xl font-bold text-yellow-500">{personaData.gold}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-2">✨</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">완료</div>
            <div className="text-2xl font-bold text-purple-500">
              {personaData.stats.totalQuestsCompleted}
            </div>
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === 'quests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-black dark:text-white">
                오늘의 퀘스트 ({completedQuests.length}/{quests.length})
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">{error}</div>
            ) : pendingQuests.length > 0 ? (
              <div className="space-y-3">
                {pendingQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onComplete={handleCompleteQuest}
                    isCompleting={completingQuestId === quest.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🎉</div>
                <p className="text-gray-600 dark:text-gray-400">오늘의 퀨스트를 모두 완료했습니다!</p>
              </div>
            )}

            {completedQuests.length > 0 && (
              <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  완료됨 ({completedQuests.length})
                </h3>
                {completedQuests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-black dark:text-white">통계</h2>
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">월간 성공률</div>
                <div className="text-3xl font-bold text-blue-500">
                  {personaData.stats.monthlySuccessRate}%
                </div>
                <div className="mt-4 bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${personaData.stats.monthlySuccessRate}%` }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">최고 연속</div>
                <div className="text-3xl font-bold text-red-500">
                  {personaData.streak.bestStreak}일
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">총 완료 횟수</div>
                <div className="text-3xl font-bold text-purple-500">
                  {personaData.stats.totalQuestsCompleted}개
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-black dark:text-white">상점</h2>
            <div className="text-center py-12 text-gray-500">상점 준비 중...</div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-black dark:text-white">프로필</h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">이름</span>
                <span className="font-semibold text-black dark:text-white">
                  {personaData.persona.name}
                </span>
              </div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">레벨</span>
                <span className="font-semibold text-black dark:text-white">
                  {personaData.level}
                </span>
              </div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">역할</span>
                <span className="font-semibold text-black dark:text-white">
                  {personaData.persona.role === 'beginner' && '초심자'}
                  {personaData.persona.role === 'active' && '활발한 사용자'}
                  {personaData.persona.role === 'advanced' && '고도화된 사용자'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 탭바 */}
      <TabBar items={tabItems} activeTabId={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
