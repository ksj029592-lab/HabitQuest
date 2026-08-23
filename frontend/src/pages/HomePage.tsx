/**
 * HabitQuest - HomePage (100배 개선 Premium Glassmorphism UI)
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, TabBar, QuestCard, Button } from '@components';
import { useSessionStore, useQuestStore } from '@store';
import { questApi } from '@api';

type TabId = 'quests' | 'stats' | 'shop' | 'profile' | 'ranking';

// ============= 상수 및 테스트 데이터 =============
const PERSONAS = [
  {
    id: 'beginner',
    name: '초심자',
    avatarIndex: 0,
    initialLevel: 1,
    initialGold: 500,
    baseScore: 120,
  },
  {
    id: 'active',
    name: '활발한 사용자',
    avatarIndex: 1,
    initialLevel: 5,
    initialGold: 1000,
    baseScore: 340,
  },
  {
    id: 'advanced',
    name: '고도화된 사용자',
    avatarIndex: 2,
    initialLevel: 10,
    initialGold: 2000,
    baseScore: 580,
  },
];

const AVATARS = ['🧑‍💻', '👨‍💼', '👩‍🎨', '🧔', '👩‍🚀', '👨‍🎓', '🦸‍♂️', '🧙‍♀️'];

const PROFILE_DECORATIONS = [
  { id: 'aura', name: '신성한 후광', price: 300, rarity: 'rare' as const, emoji: '✨' },
  { id: 'crown', name: '왕관', price: 500, rarity: 'epic' as const, emoji: '👑' },
  { id: 'wings', name: '천사의 날개', price: 400, rarity: 'rare' as const, emoji: '🪽' },
  { id: 'flame', name: '전설의 불꽃', price: 350, rarity: 'rare' as const, emoji: '🔥' },
];

const MOCK_DAILY_QUESTS = [
  {
    id: 'quest_1',
    userId: 'demo-user',
    categoryId: 'health',
    questDateKst: '2026-08-23',
    slotNo: 0 as const,
    title: '💧 아침 물 한 잔 마시기',
    description: '기상 후 깨끗한 물 한 잔으로 활력을 찾으세요.',
    category: 'health',
    difficulty: 'easy' as const,
    expReward: 100,
    goldReward: 50,
    status: 'pending' as const,
  },
  {
    id: 'quest_2',
    userId: 'demo-user',
    categoryId: 'fitness',
    questDateKst: '2026-08-23',
    slotNo: 1 as const,
    title: '🏃 30분 유산소 운동하기',
    description: '가벼운 조깅이나 산책으로 몸을 움직여보세요.',
    category: 'fitness',
    difficulty: 'normal' as const,
    expReward: 150,
    goldReward: 100,
    status: 'pending' as const,
  },
  {
    id: 'quest_3',
    userId: 'demo-user',
    categoryId: 'learning',
    questDateKst: '2026-08-23',
    slotNo: 2 as const,
    title: '📚 책 15페이지 읽기',
    description: '매일 조금씩 지식을 쌓고 마음의 양식을 키우세요.',
    category: 'learning',
    difficulty: 'normal' as const,
    expReward: 150,
    goldReward: 100,
    status: 'pending' as const,
  },
];

// 🎲 리롤용 전체 퀘스트 풀
const ALL_QUEST_POOL = [
  { id: 'q_water', title: '💧 아침 물 한 잔 마시기', description: '기상 후 깨끗한 물 한 잔으로 활력을 찾으세요.', category: 'health', difficulty: 'easy' as const, expReward: 100, goldReward: 50, status: 'pending' as const },
  { id: 'q_run', title: '🏃 30분 유산소 운동하기', description: '가벼운 조깅이나 산책으로 몸을 움직여보세요.', category: 'fitness', difficulty: 'normal' as const, expReward: 150, goldReward: 100, status: 'pending' as const },
  { id: 'q_read', title: '📚 책 15페이지 읽기', description: '매일 조금씩 지식을 쌓고 마음의 양식을 키우세요.', category: 'learning', difficulty: 'normal' as const, expReward: 150, goldReward: 100, status: 'pending' as const },
  { id: 'q_meditate', title: '🧘 10분 마음 명상하기', description: '지친 마음을 달래는 조용한 나만의 시간을 가져보세요.', category: 'mindset', difficulty: 'easy' as const, expReward: 100, goldReward: 50, status: 'pending' as const },
  { id: 'q_clean', title: '🧹 책상/방 깨끗이 정돈하기', description: '주변 환경을 깔끔하게 정리해 집중력을 높이세요.', category: 'lifestyle', difficulty: 'easy' as const, expReward: 100, goldReward: 50, status: 'pending' as const },
  { id: 'q_stretch', title: '🤸 전신 스트레칭 수행하기', description: '굳은 몸을 가볍게 풀고 스트레스를 완화하세요.', category: 'health', difficulty: 'easy' as const, expReward: 100, goldReward: 50, status: 'pending' as const },
  { id: 'q_journal', title: '✍️ 감사 일기 3줄 작성하기', description: '오늘 하루 감사했던 일들을 기록하며 긍정 에너지를 채우세요.', category: 'mindset', difficulty: 'easy' as const, expReward: 120, goldReward: 60, status: 'pending' as const },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const session = useSessionStore((state) => state.session);
  const updateGameState = useSessionStore((state) => state.updateGameState);
  const clearSession = useSessionStore((state) => state.clearSession);

  const { quests, setQuests } = useQuestStore((state) => ({
    quests: state.quests,
    setQuests: state.setQuests,
  }));

  // Local State
  const [activeTab, setActiveTab] = useState<TabId>('quests');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [completingQuestId, setCompletingQuestId] = useState<string | null>(null);
  const [modalAlert, setModalAlert] = useState<{ title: string; message: string; emoji?: string } | null>(null);

  // 세션 체크
  useEffect(() => {
    if (!session) {
      navigate('/');
    }
  }, [session, navigate]);

  // Daily Quests 불러오기
  useEffect(() => {
    let isMounted = true;
    const loadQuests = async () => {
      try {
        setLoading(true);
        const response = await questApi.getDailyQuests();
        if (isMounted && response.success && response.data && response.data.length > 0) {
          setQuests(response.data);
        } else if (isMounted) {
          setQuests(MOCK_DAILY_QUESTS);
        }
      } catch (err) {
        if (isMounted) {
          setQuests(MOCK_DAILY_QUESTS);
          setError(null);
        }
        console.error('Quest loading error, falling back to mock quests:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadQuests();
    return () => {
      isMounted = false;
    };
  }, [setQuests]);

  if (!session) {
    return null;
  }

  const personaData = session.personaData;
  const pendingQuests = quests.filter((q) => q.status === 'pending');
  const completedQuests = quests.filter((q) => q.status === 'completed');
  const completedCount = completedQuests.length;

  // 퀘스트 완료 처리 핸들러 (Bug #1 & #2 해결)
  const handleCompleteQuest = useCallback(
    (questId: string) => {
      try {
        setCompletingQuestId(questId);

        // 1. Quests 상태 즉시 업데이트
        const updatedQuests = quests.map((q) =>
          q.id === questId ? { ...q, status: 'completed' as const } : q
        );
        setQuests(updatedQuests);

        const newCompletedCount = updatedQuests.filter((q) => q.status === 'completed').length;

        // 2. 최신 Zustand 상태 가져오기
        const currentSession = useSessionStore.getState().session;
        if (!currentSession) return;

        const currentPersonaData = currentSession.personaData;

        // 3. 보상 및 경험치 계산
        const questExp = 100;
        const questGold = 50;
        const currentExp = currentPersonaData.totalExp || 0;
        const newExp = currentExp + questExp;
        const expPerLevel = 500;
        const newLevel = Math.floor(newExp / expPerLevel) + 1;

        const stateUpdate: any = {
          totalExp: newExp,
          gold: (currentPersonaData.gold || 0) + questGold,
          stats: {
            ...currentPersonaData.stats,
            totalQuestsCompleted: (currentPersonaData.stats?.totalQuestsCompleted || 0) + 1,
            monthlySuccessRate: Math.min(
              100,
              Math.round(((newCompletedCount / (updatedQuests.length || 1)) * 100))
            ),
          },
          seasonRankingPoints: (currentPersonaData.seasonRankingPoints || 0) + 15,
        };

        if (newLevel > (currentPersonaData.level || 1)) {
          stateUpdate.level = newLevel;
          setModalAlert({
            title: '레벨 업!',
            message: `축하합니다! 레벨 ${newLevel}(이)가 되었습니다! 🎉`,
            emoji: '⭐',
          });
        }

        // Bug #2: 3번째 퀘스트 완료 시 연속(Streak) 증가
        if (newCompletedCount >= 3) {
          const currentStreakVal = currentPersonaData.streak?.currentStreak || 0;
          const newCurrentStreak = currentStreakVal + 1;
          const newBestStreak = Math.max(
            currentPersonaData.streak?.bestStreak || 0,
            newCurrentStreak
          );

          stateUpdate.streak = {
            currentStreak: newCurrentStreak,
            bestStreak: newBestStreak,
            lastAttendanceDateKst: new Date().toISOString().split('T')[0],
          };

          setModalAlert({
            title: '오늘의 모든 퀘스트 완료!',
            message: `3개의 퀘스트를 모두 마쳤습니다! 연속 ${newCurrentStreak}일 달성! 🔥`,
            emoji: '🏆',
          });
        }

        updateGameState(stateUpdate);

        setTimeout(() => setCompletingQuestId(null), 1200);
      } catch (err) {
        console.error('Quest completion error:', err);
        setCompletingQuestId(null);
      }
    },
    [quests, setQuests, updateGameState]
  );

  // 상점 장식 구매 핸들러
  const handleBuyDecoration = useCallback(
    (decorationId: string) => {
      const decoration = PROFILE_DECORATIONS.find((d) => d.id === decorationId);
      if (!decoration) return;

      const currentSession = useSessionStore.getState().session;
      if (!currentSession) return;

      const currentPersonaData = currentSession.personaData;
      const currentGold = currentPersonaData.gold || 0;

      if (currentGold < decoration.price) {
        setModalAlert({
          title: '골드 부족',
          message: `${decoration.name}을(를) 구매하려면 ${decoration.price} 💰가 필요합니다.`,
          emoji: '💸',
        });
        return;
      }

      const currentInventory = currentPersonaData.inventory || [];
      const existingItem = currentInventory.find(
        (i) => i.itemType === 'cosmetic' && i.name === decoration.id
      );

      const newInventory = existingItem
        ? currentInventory.map((i) =>
            i.itemType === 'cosmetic' && i.name === decoration.id
              ? { ...i, quantity: (i.quantity || 1) + 1 }
              : i
          )
        : [
            ...currentInventory,
            {
              itemType: 'cosmetic' as const,
              name: decoration.id,
              rarity: decoration.rarity,
              quantity: 1,
            },
          ];

      updateGameState({
        gold: currentGold - decoration.price,
        inventory: newInventory,
        equippedDecoration: decoration.id,
      });

      setModalAlert({
        title: '구매 & 장착 완료!',
        message: `${decoration.emoji} ${decoration.name}을(를) 구매하고 프로필에 장착했습니다!`,
        emoji: '✨',
      });
    },
    [updateGameState]
  );

  // 방지권 구매
  const handleBuyProtectionTicket = useCallback(() => {
    const currentSession = useSessionStore.getState().session;
    if (!currentSession) return;

    const currentPersonaData = currentSession.personaData;
    const currentGold = currentPersonaData.gold || 0;
    const ticketPrice = 500;

    if (currentGold < ticketPrice) {
      setModalAlert({
        title: '골드 부족',
        message: `방지권을 구매하려면 ${ticketPrice} 💰가 필요합니다.`,
        emoji: '🛡️',
      });
      return;
    }

    const currentInventory = currentPersonaData.inventory || [];
    const ticketItem = currentInventory.find((i) => i.itemType === 'protection_ticket');
    const currentQty = ticketItem?.quantity || 0;

    if (currentQty >= 3) {
      setModalAlert({
        title: '보유 수량 초과',
        message: '방지권은 최대 3개까지 보유할 수 있습니다.',
        emoji: '⚠️',
      });
      return;
    }

    const newInventory = ticketItem
      ? currentInventory.map((i) =>
          i.itemType === 'protection_ticket' ? { ...i, quantity: (i.quantity || 0) + 1 } : i
        )
      : [
          ...currentInventory,
          {
            itemType: 'protection_ticket' as const,
            name: '방지권',
            rarity: 'common' as const,
            quantity: 1,
          },
        ];

    updateGameState({
      gold: currentGold - ticketPrice,
      inventory: newInventory,
    });

    setModalAlert({
      title: '방지권 구매 완료!',
      message: '퀘스트 실패 시 연속 출석을 1회 보호해줍니다.',
      emoji: '🛡️',
    });
  }, [updateGameState]);

  // 🎲 퀘스트 리롤(리셋) 티켓 구매
  const handleBuyRerollTicket = useCallback(() => {
    const currentSession = useSessionStore.getState().session;
    if (!currentSession) return;

    const currentPersonaData = currentSession.personaData;
    const currentGold = currentPersonaData.gold || 0;
    const ticketPrice = 300;

    if (currentGold < ticketPrice) {
      setModalAlert({
        title: '골드 부족',
        message: `리롤 티켓을 구매하려면 ${ticketPrice} 💰가 필요합니다.`,
        emoji: '💸',
      });
      return;
    }

    const currentInventory = currentPersonaData.inventory || [];
    const ticketItem = currentInventory.find((i) => i.itemType === 'reroll_ticket');
    const currentQty = ticketItem?.quantity || 0;

    if (currentQty >= 3) {
      setModalAlert({
        title: '보유 수량 초과',
        message: '리롤 티켓은 최대 3개까지 보유할 수 있습니다.',
        emoji: '⚠️',
      });
      return;
    }

    const newInventory = ticketItem
      ? currentInventory.map((i) =>
          i.itemType === 'reroll_ticket' ? { ...i, quantity: (i.quantity || 0) + 1 } : i
        )
      : [
          ...currentInventory,
          {
            itemType: 'reroll_ticket' as const,
            name: '리롤 티켓',
            rarity: 'common' as const,
            quantity: 1,
          },
        ];

    updateGameState({
      gold: currentGold - ticketPrice,
      inventory: newInventory,
    });

    setModalAlert({
      title: '리롤 티켓 구매 완료!',
      message: '퀘스트 탭에서 일일 퀘스트를 새로운 3개로 무작위 재구성할 수 있습니다.',
      emoji: '🎲',
    });
  }, [updateGameState]);

  // 🎲 퀘스트 리롤 티켓 사용
  const handleUseRerollTicket = useCallback(() => {
    const currentSession = useSessionStore.getState().session;
    if (!currentSession) return;

    const currentPersonaData = currentSession.personaData;
    const currentInventory = currentPersonaData.inventory || [];
    const ticketItem = currentInventory.find((i) => i.itemType === 'reroll_ticket');
    const currentQty = ticketItem?.quantity || 0;

    if (currentQty <= 0) {
      setModalAlert({
        title: '티켓 부족',
        message: '보유 중인 퀘스트 리롤 티켓이 없습니다. 상점에서 구매해주세요!',
        emoji: '🛒',
      });
      return;
    }

    // 티켓 1개 차감
    const newInventory = currentInventory.map((i) =>
      i.itemType === 'reroll_ticket' ? { ...i, quantity: (i.quantity || 1) - 1 } : i
    ).filter((i) => i.quantity > 0);

    updateGameState({
      inventory: newInventory,
    });

    // 퀘스트 풀에서 무작위 3개 선별
    const shuffled = [...ALL_QUEST_POOL].sort(() => 0.5 - Math.random());
    const selectedQuests = shuffled.slice(0, 3).map((q, idx) => ({
      ...q,
      id: `reroll_${Date.now()}_${idx}`,
      status: 'pending' as const,
    }));

    setQuests(selectedQuests as any);

    setModalAlert({
      title: '퀘스트 리롤 완료!',
      message: '새로운 일일 퀘스트 3개가 지급되었습니다! 🎲',
      emoji: '✨',
    });
  }, [setQuests, updateGameState]);

  // 프로필 장식 장착/해제 핸들러
  const handleEquipDecoration = useCallback(
    (decorationId: string | null) => {
      updateGameState({
        equippedDecoration: decorationId,
      });
    },
    [updateGameState]
  );

  // 로그아웃
  const handleLogout = useCallback(() => {
    clearSession();
    navigate('/');
  }, [clearSession, navigate]);

  // 계산된 값들
  const currentLevel = personaData.level || 1;
  const currentExp = personaData.totalExp || 0;
  const expProgress = Math.min(100, Math.round(((currentExp % 500) / 500) * 100));
  const equippedDecorationObj = PROFILE_DECORATIONS.find(
    (d) => d.id === personaData.equippedDecoration
  );

  // 🏆 실시간 점수 순 정렬된 페르소나 랭킹 목록
  const rankedPersonas = PERSONAS.map((persona) => {
    const isCurrent = personaData.persona?.id === persona.id;
    const score = isCurrent
      ? persona.baseScore + (personaData.seasonRankingPoints || 0)
      : persona.baseScore;
    const level = isCurrent ? currentLevel : persona.initialLevel;
    return {
      ...persona,
      score,
      level,
      isCurrent,
    };
  }).sort((a, b) => b.score - a.score);

  // 상단 스탯 배지 리스트
  const headerStats = [
    {
      icon: '🔥',
      label: '연속 출석',
      value: `${personaData.streak?.currentStreak || 0}일`,
      color: 'from-orange-500/20 via-amber-500/20 to-red-500/20 border-orange-400/40 text-orange-200',
    },
    {
      icon: '💰',
      label: '보유 골드',
      value: `${personaData.gold || 0}`,
      color: 'from-yellow-500/20 via-amber-500/20 to-yellow-600/20 border-yellow-400/40 text-yellow-200',
    },
    {
      icon: '✨',
      label: '퀘스트 완료',
      value: `${personaData.stats?.totalQuestsCompleted || 0}개`,
      color: 'from-purple-500/20 via-pink-500/20 to-indigo-500/20 border-purple-400/40 text-purple-200',
    },
  ];

  return (
    <div className="min-h-screen h-screen overflow-y-auto bg-slate-950 text-white relative font-sans selection:bg-purple-500 selection:text-white">
      {/* 🌟 고도화된 Glassmorphism 배경 그래디언트 오버레이 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-pink-600/25 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-600/25 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* 고정 헤더 */}
      <Header
        title="HabitQuest"
        subtitle={`${personaData.persona?.name || '사용자'} 님의 모험`}
        trailing={
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500/30 to-pink-500/30 hover:from-purple-500/50 hover:to-pink-500/50 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-purple-300/40 backdrop-blur-md shadow-md transition-all active:scale-95"
            title="페르소나 선택창으로 돌아가기"
          >
            <span>👤 선택창으로</span>
          </button>
        }
      />

      <main className="max-w-xl mx-auto px-4 pt-4 pb-36 relative z-10 space-y-4">
        {/* 맨 위로 올린 최상단 종합 대시보드 (닉네임, 레벨, 경험치, 연속 출석, 보유 골드, 완료 횟수) */}
        <div className="bg-gradient-to-r from-purple-900/50 via-indigo-900/40 to-slate-900/60 backdrop-blur-xl p-4 rounded-3xl border border-white/20 shadow-2xl space-y-3">
          {/* 1. 닉네임, 레벨, 아바타, 경험치 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-2xl shadow-lg border border-white/30">
                  {AVATARS[personaData.avatarIndex || 0]}
                </div>
                {equippedDecorationObj && (
                  <span className="absolute -top-2 -right-2 text-lg drop-shadow-md">
                    {equippedDecorationObj.emoji}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-lg text-white">
                    {personaData.persona?.name}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/40 border border-purple-300/50 text-purple-200 font-bold">
                    Lv.{currentLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {equippedDecorationObj?.name ? `${equippedDecorationObj.name} 퀘스터` : `레벨 ${currentLevel} 퀘스터`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-purple-300 font-semibold">{expProgress}% EXP</span>
              <p className="text-[10px] text-slate-400">({currentExp % 500} / 500)</p>
            </div>
          </div>

          {/* 경험치 프로그레스 바 */}
          <div className="w-full bg-slate-950/60 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${expProgress}%` }}
            />
          </div>

          {/* 2. 연속 출석 일수, 보유 골드, 퀘스트 완료 횟수 (3열 배지) */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10">
            {headerStats.map((stat, idx) => (
              <div
                key={idx}
                className={`bg-gradient-to-br ${stat.color} backdrop-blur-md rounded-2xl p-2.5 text-center border shadow-md transition-all duration-300 hover:scale-105`}
              >
                <div className="text-xl mb-0.5">{stat.icon}</div>
                <div className="text-[10px] text-slate-300 font-medium">{stat.label}</div>
                <div className="text-base font-bold text-white mt-0.5">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= 탭 1: 퀘스트 ================= */}
        {activeTab === 'quests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent flex items-center gap-2">
                <span>⚔️ 오늘의 퀘스트</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 font-normal">
                  {completedCount}/{quests.length} 완료
                </span>
              </h2>

              {/* 🎲 자그마한 퀘스트 리롤 버튼 */}
              <button
                onClick={handleUseRerollTicket}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 font-medium transition-all shadow-md active:scale-95"
                title="리롤 티켓 1개를 사용하여 퀘스트 무작위 재구성"
              >
                <span>🎲 리롤 (보유: {(personaData.inventory || []).find((i) => i.itemType === 'reroll_ticket')?.quantity || 0}개)</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
                <div className="inline-block animate-spin text-3xl mb-2">⏳</div>
                <p className="text-sm text-slate-300">퀘스트를 로딩하는 중...</p>
              </div>
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
              <div className="text-center py-10 bg-gradient-to-br from-purple-900/30 to-pink-900/20 backdrop-blur-xl rounded-3xl border border-white/20 p-6">
                <div className="text-5xl mb-3 animate-bounce">🎉</div>
                <h3 className="text-lg font-bold text-white mb-1">모든 오늘의 퀘스트 완료!</h3>
                <p className="text-xs text-slate-300">
                  오늘의 습관을 완수했습니다! 내일 새로운 퀘스트가 찾아옵니다.
                </p>
              </div>
            )}

            {completedQuests.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h3 className="text-xs font-semibold text-slate-400 px-1">
                  완료된 퀘스트 ({completedQuests.length})
                </h3>
                {completedQuests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= 탭 2: 통계 ================= */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent px-1">
              📊 활동 통계
            </h2>
            <div className="grid gap-4">
              {[
                {
                  label: '월간 퀘스트 달성률',
                  value: `${personaData.stats?.monthlySuccessRate || 0}%`,
                  desc: '이번 달 목표 이행 비율',
                  color: 'from-blue-600/30 to-cyan-600/20 border-blue-400/30',
                  gradient: 'from-blue-400 to-cyan-300',
                  progress: personaData.stats?.monthlySuccessRate || 0,
                },
                {
                  label: '최고 연속 달성 기록',
                  value: `${personaData.streak?.bestStreak || 0}일`,
                  desc: '연속 출석 최고 수치',
                  color: 'from-red-600/30 to-pink-600/20 border-red-400/30',
                  gradient: 'from-red-400 to-pink-300',
                },
                {
                  label: '누적 완료 퀘스트 수',
                  value: `${personaData.stats?.totalQuestsCompleted || 0}개`,
                  desc: '지금까지 달성한 총 습관 수',
                  color: 'from-purple-600/30 to-indigo-600/20 border-purple-400/30',
                  gradient: 'from-purple-400 to-indigo-300',
                },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className={`bg-gradient-to-br ${stat.color} backdrop-blur-xl rounded-3xl p-5 border shadow-xl`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs text-slate-300 font-medium">{stat.label}</span>
                      <div className={`text-3xl font-extrabold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mt-1`}>
                        {stat.value}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">{stat.desc}</p>
                  {stat.progress !== undefined && (
                    <div className="mt-3 w-full bg-slate-950/60 rounded-full h-2 overflow-hidden border border-white/10">
                      <div
                        className={`bg-gradient-to-r ${stat.gradient} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${stat.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 탭 3: 상점 ================= */}
        {activeTab === 'shop' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent px-1">
              🛒 아이템 상점
            </h2>

            {/* 기능성 티켓 섹션 (방지권 & 리롤 티켓) */}
            <div className="grid gap-3">
              {/* 🛡️ 스트릭 방지권 */}
              <div className="bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-slate-900/50 backdrop-blur-xl rounded-3xl p-4 border border-blue-400/30 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-2xl shadow-lg">
                      🛡️
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">스트릭 방지권</h3>
                      <p className="text-[11px] text-slate-300">퀘스트 미달성 시 연속 수치를 1회 보호</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="text-xs text-slate-300">
                    보유: <span className="text-blue-300 font-bold">
                      {(personaData.inventory || []).find((i) => i.itemType === 'protection_ticket')?.quantity || 0}개
                    </span> / 3개
                  </div>
                  <Button
                    label="구매 (500 💰)"
                    variant="primary"
                    onClick={handleBuyProtectionTicket}
                  />
                </div>
              </div>

              {/* 🎲 퀘스트 리롤 티켓 */}
              <div className="bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-slate-900/50 backdrop-blur-xl rounded-3xl p-4 border border-purple-400/30 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-2xl shadow-lg">
                      🎲
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">퀘스트 리롤 티켓</h3>
                      <p className="text-[11px] text-slate-300">어려운 퀘스트를 새로운 3개로 무작위 변경</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="text-xs text-slate-300">
                    보유: <span className="text-purple-300 font-bold">
                      {(personaData.inventory || []).find((i) => i.itemType === 'reroll_ticket')?.quantity || 0}개
                    </span> / 3개
                  </div>
                  <Button
                    label="구매 (300 💰)"
                    variant="primary"
                    onClick={handleBuyRerollTicket}
                  />
                </div>
              </div>
            </div>

            {/* 프로필 장식 아이템 섹션 */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 px-1">✨ 프로필 코스메틱 장식</h3>
              <div className="grid grid-cols-2 gap-3">
                {PROFILE_DECORATIONS.map((decoration) => {
                  const hasItem = (personaData.inventory || []).some(
                    (i) => i.itemType === 'cosmetic' && i.name === decoration.id
                  );
                  const isEquipped = personaData.equippedDecoration === decoration.id;

                  return (
                    <div
                      key={decoration.id}
                      className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-3xl mb-2">{decoration.emoji}</div>
                        <h4 className="font-bold text-sm text-white">{decoration.name}</h4>
                        <p className="text-xs text-yellow-300 font-semibold mb-3">
                          {decoration.price} 💰
                        </p>
                      </div>
                      {hasItem ? (
                        <button
                          onClick={() => handleEquipDecoration(isEquipped ? null : decoration.id)}
                          className={`w-full py-2 rounded-xl text-xs font-semibold transition-all border ${
                            isEquipped
                              ? 'bg-purple-500/40 border-purple-400 text-white'
                              : 'bg-white/10 hover:bg-white/20 border-white/20 text-slate-200'
                          }`}
                        >
                          {isEquipped ? '착용 중 ✓' : '장착하기'}
                        </button>
                      ) : (
                        <Button
                          label="구매하기"
                          variant="primary"
                          onClick={() => handleBuyDecoration(decoration.id)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= 탭 4: 프로필 ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent px-1">
              👤 내 프로필
            </h2>

            <div className="bg-gradient-to-br from-purple-900/30 via-slate-900/50 to-slate-950/80 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl text-center space-y-4">
              <div className="relative inline-block mx-auto">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center text-5xl shadow-2xl border-2 border-white/40">
                  {AVATARS[personaData.avatarIndex || 0]}
                </div>
                {equippedDecorationObj && (
                  <span className="absolute -top-3 -right-3 text-3xl drop-shadow-lg">
                    {equippedDecorationObj.emoji}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-white">
                  {personaData.persona?.name}
                </h3>
                <p className="text-xs text-purple-300 font-medium">
                  Lv.{currentLevel} • {equippedDecorationObj?.name || '기본 칭호'}
                </p>
              </div>

              {/* 내 인벤토리 티켓 및 장식 관리 */}
              <div className="pt-4 border-t border-white/10 text-left space-y-3">
                <h4 className="text-xs font-semibold text-slate-300">
                  보유 기능성 티켓
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>스트릭 방지권</span>
                    </span>
                    <span className="text-blue-300 font-bold">
                      {(personaData.inventory || []).find((i) => i.itemType === 'protection_ticket')?.quantity || 0}개
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>🎲</span>
                      <span>리롤 티켓</span>
                    </span>
                    <span className="text-purple-300 font-bold">
                      {(personaData.inventory || []).find((i) => i.itemType === 'reroll_ticket')?.quantity || 0}개
                    </span>
                  </div>
                </div>

                <h4 className="text-xs font-semibold text-slate-300 pt-2">
                  보유 프로필 장식
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={() => handleEquipDecoration(null)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-medium transition-all border flex items-center justify-between ${
                      !personaData.equippedDecoration
                        ? 'bg-purple-500/30 border-purple-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <span>장식 없음</span>
                    {!personaData.equippedDecoration && <span>✓</span>}
                  </button>

                  {PROFILE_DECORATIONS.map((decoration) => {
                    const hasItem = (personaData.inventory || []).some(
                      (i) => i.itemType === 'cosmetic' && i.name === decoration.id
                    );
                    if (!hasItem) return null;

                    const isEquipped = personaData.equippedDecoration === decoration.id;

                    return (
                      <button
                        key={decoration.id}
                        onClick={() => handleEquipDecoration(isEquipped ? null : decoration.id)}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-medium transition-all border flex items-center justify-between ${
                          isEquipped
                            ? 'bg-purple-500/30 border-purple-400 text-white'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{decoration.emoji}</span>
                          <span>{decoration.name}</span>
                        </span>
                        {isEquipped && <span className="text-purple-300 font-bold">착용 중 ✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <Button label="로그아웃" variant="secondary" onClick={handleLogout} />
              </div>
            </div>
          </div>
        )}

        {/* ================= 탭 5: 랭킹 ================= */}
        {activeTab === 'ranking' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent px-1 flex items-center justify-between">
              <span>🏆 실시간 시즌 랭킹</span>
              <span className="text-xs font-normal text-slate-400">실시간 순위 반영 중 ⚡</span>
            </h2>

            <div className="space-y-3">
              {rankedPersonas.map((persona, idx) => {
                const medal = ['🥇 1위', '🥈 2위', '🥉 3위'][idx] || `🏅 ${idx + 1}위`;
                const isCurrentPersona = persona.isCurrent;

                return (
                  <div
                    key={persona.id}
                    className={`bg-gradient-to-br ${
                      isCurrentPersona
                        ? 'from-purple-900/60 via-indigo-900/50 to-slate-900/70 border-purple-400/80 ring-2 ring-purple-400/50 shadow-purple-500/20'
                        : 'from-white/10 to-white/5 border-white/20'
                    } backdrop-blur-xl rounded-2xl p-4 border shadow-xl flex items-center justify-between transition-all`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-black px-2.5 py-1 rounded-xl bg-white/10 border border-white/20 text-yellow-300">
                        {medal}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{persona.name}</span>
                          {isCurrentPersona && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/50 border border-purple-300/60 text-purple-200 font-bold">
                              나 (PLAYING)
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-300">
                          Lv.{persona.level} 퀘스터
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-extrabold text-yellow-300">{persona.score} pt</div>
                      <div className="text-[10px] text-slate-400">시즌 포인트</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 팝업 모달 */}
        {modalAlert && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 backdrop-blur-2xl rounded-3xl p-6 border border-white/20 max-w-xs w-full text-center shadow-2xl space-y-4">
              <div className="text-5xl animate-bounce">{modalAlert.emoji || '🔔'}</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{modalAlert.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{modalAlert.message}</p>
              </div>
              <Button label="확인" variant="primary" onClick={() => setModalAlert(null)} />
            </div>
          </div>
        )}
      </main>

      {/* 탭바 */}
      <TabBar activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as TabId)} />
    </div>
  );
};
