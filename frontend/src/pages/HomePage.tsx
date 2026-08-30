/**
 * HabitQuest - HomePage (AI-IDEA1 반영: 상단 헤더 통합, AvatarFrame 시각화, 사진 업로드, 요구사항 기반 AI 리롤)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, TabBar, QuestCard, Button, AvatarFrame } from '@components';
import { useSessionStore, useQuestStore } from '@store';
import { questApi, aiApi } from '@api';

type TabId = 'quests' | 'stats' | 'shop' | 'profile' | 'ranking';

// ============= 상점 품목 카탈로그 =============
const PROFILE_DECORATIONS = [
  { id: 'aura', name: '신성한 후광', price: 300, rarity: 'rare' as const, emoji: '✨' },
  { id: 'crown', name: '왕관', price: 500, rarity: 'epic' as const, emoji: '👑' },
  { id: 'wings', name: '천사의 날개', price: 400, rarity: 'rare' as const, emoji: '🪽' },
  { id: 'flame', name: '전설의 불꽃', price: 350, rarity: 'rare' as const, emoji: '🔥' },
];

const BORDER_ITEMS = [
  { id: 'gold_ring', name: '황금 링', price: 400, rarity: 'rare' as const, desc: '빛나는 황금 테두리' },
  { id: 'fire_ring', name: '불꽃 링', price: 500, rarity: 'epic' as const, desc: '타오르는 불꽃 테두리' },
  { id: 'cyber_ring', name: '사이버 네온 링', price: 600, rarity: 'epic' as const, desc: '네온 사이버 테두리' },
  { id: 'crystal_ring', name: '크리스탈 링', price: 800, rarity: 'legendary' as const, desc: '신비로운 크리스탈 테두리' },
];

const SPECIAL_AVATAR_ITEMS = [
  { id: 'warrior', name: '🌟 갓생 전사', price: 500, rarity: 'rare' as const },
  { id: 'fox', name: '🦊 럭키 포인터', price: 600, rarity: 'epic' as const },
  { id: 'astronaut', name: '🚀 스페이스 탐험가', price: 700, rarity: 'epic' as const },
  { id: 'dragon', name: '🐉 드래곤 마스터', price: 1000, rarity: 'legendary' as const },
];

const getBorderByInventoryName = (name: string) =>
  BORDER_ITEMS.find((item) => name === `border_${item.id}` || name === item.name) ||
  (/테두리|링/.test(name) ? { id: name, name } : undefined);

const isDecorationInventoryName = (name: string) =>
  PROFILE_DECORATIONS.some((item) => item.id === name);

const isAvatarInventoryName = (name: string) => name.startsWith('avatar_');

const isBorderInventoryName = (name: string) => Boolean(getBorderByInventoryName(name));

const isTitleInventoryName = (name: string) =>
  !isAvatarInventoryName(name) && !isBorderInventoryName(name) && !isDecorationInventoryName(name);

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

const ALL_QUEST_POOL = [
  { id: 'q_water', title: '💧 아침 물 한 잔 마시기', description: '기상 후 깨끗한 물 한 잔으로 활력을 찾으세요.', category: 'health', difficulty: 'easy' as const, expReward: 100, goldReward: 50, status: 'pending' as const },
  { id: 'q_run', title: '🏃 30분 유산소 운동하기', description: '가벼운 조깅이나 산책으로 몸을 움직여보세요.', category: 'fitness', difficulty: 'normal' as const, expReward: 150, goldReward: 100, status: 'pending' as const },
  { id: 'q_read', title: '📚 책 15페이지 읽기', description: '매일 조금씩 지식을 쌓고 마음의 양식을 키우세요.', category: 'learning', difficulty: 'normal' as const, expReward: 150, goldReward: 100, status: 'pending' as const },
  { id: 'q_meditate', title: '🧘 10분 마음 명상하기', description: '지친 마음을 달래는 조용한 나만의 시간을 가져보세요.', category: 'mindset', difficulty: 'easy' as const, expReward: 100, goldReward: 50, status: 'pending' as const },
  { id: 'q_clean', title: '🧹 책상/방 깨끗이 정돈하기', description: '주변 환경을 깔끔하게 정리해 집중력을 높이세요.', category: 'lifestyle', difficulty: 'easy' as const, expReward: 100, goldReward: 50, status: 'pending' as const },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const existingQuests = useQuestStore.getState().quests;
      if (existingQuests && existingQuests.length > 0) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await questApi.getDailyQuests();
        if (isMounted && response.success && Array.isArray(response.data) && response.data.length > 0) {
          setQuests(response.data);
          return;
        }

        const prefs = session?.personaData?.userPreferences;
        const personaName = session?.personaData?.persona?.name || '초심자';
        const aiResponse = await aiApi.generateQuests({
          personaName,
          habits: prefs?.habits?.length ? prefs.habits : ['건강 관리', '독서와 학습', '마음 챙김'],
          note: prefs?.note || '오늘의 맞춤 퀘스트',
          difficulty: prefs?.difficulty || 'normal',
        });

        if (isMounted && aiResponse.success && aiResponse.data && aiResponse.data.length > 0) {
          setQuests(aiResponse.data);
          return;
        }

        if (isMounted) {
          setQuests(MOCK_DAILY_QUESTS);
        }
      } catch (err) {
        if (isMounted) {
          setQuests(MOCK_DAILY_QUESTS);
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
  }, [session, setQuests]);

  if (!session) {
    return null;
  }

  const personaData = session.personaData;
  const pendingQuests = quests.filter((q) => q.status === 'pending');
  const completedQuests = quests.filter((q) => q.status === 'completed');
  const completedCount = completedQuests.length;

  // 퀘스트 완료 처리
  const handleCompleteQuest = useCallback(
    (questId: string) => {
      try {
        setCompletingQuestId(questId);

        const updatedQuests = quests.map((q) =>
          q.id === questId ? { ...q, status: 'completed' as const } : q
        );
        setQuests(updatedQuests);

        const newCompletedCount = updatedQuests.filter((q) => q.status === 'completed').length;
        const currentSession = useSessionStore.getState().session;
        if (!currentSession) return;

        const currentPersonaData = currentSession.personaData;
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
              Math.round((newCompletedCount / (updatedQuests.length || 1)) * 100)
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

  // 📷 사용자가 컴퓨터 파일/카메라 사진을 선택했을 때 실행되는 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalAlert({
        title: '형식 오류',
        message: '이미지 파일만 선택할 수 있습니다.',
        emoji: '⚠️',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateGameState({
        avatarUrl: dataUrl,
        avatarType: 'custom_image',
        specialAvatarId: null,
      });
      setModalAlert({
        title: '프로필 사진 변경 완료!',
        message: '새로운 사진이 아바타에 적용되었습니다. ✨',
        emoji: '📷',
      });
    };
    reader.readAsDataURL(file);
  };

  // 🌟 특별 아바타 구매/장착 핸들러
  const handleBuySpecialAvatar = useCallback(
    (avatarId: string) => {
      const item = SPECIAL_AVATAR_ITEMS.find((a) => a.id === avatarId);
      if (!item) return;

      const currentSession = useSessionStore.getState().session;
      if (!currentSession) return;
      const currentPersonaData = currentSession.personaData;
      const currentGold = currentPersonaData.gold || 0;

      const currentInventory = currentPersonaData.inventory || [];
      const hasItem = currentInventory.some(
        (i) => i.itemType === 'cosmetic' && i.name === `avatar_${avatarId}`
      );

      if (!hasItem) {
        if (currentGold < item.price) {
          setModalAlert({
            title: '골드 부족',
            message: `${item.name}을(를) 구매하려면 ${item.price} 💰가 필요합니다.`,
            emoji: '💸',
          });
          return;
        }

        const newInventory = [
          ...currentInventory,
          {
            itemType: 'cosmetic' as const,
            name: `avatar_${avatarId}`,
            rarity: item.rarity,
            quantity: 1,
          },
        ];

        updateGameState({
          gold: currentGold - item.price,
          inventory: newInventory,
        });

        setModalAlert({
          title: '구매 완료!',
          message: `${item.name} 아바타를 인벤토리에 보관했습니다. 프로필에서 장착할 수 있습니다.`,
          emoji: '✨',
        });
      } else {
        setModalAlert({
          title: '이미 보유 중',
          message: '프로필 탭의 인벤토리에서 장착하거나 해제할 수 있습니다.',
          emoji: '🎒',
        });
      }
    },
    [updateGameState]
  );

  // 🎨 테두리(Border) 구매/장착 핸들러
  const handleBuyBorder = useCallback(
    (borderId: string) => {
      const item = BORDER_ITEMS.find((b) => b.id === borderId);
      if (!item) return;

      const currentSession = useSessionStore.getState().session;
      if (!currentSession) return;
      const currentPersonaData = currentSession.personaData;
      const currentGold = currentPersonaData.gold || 0;

      const currentInventory = currentPersonaData.inventory || [];
      const hasItem = currentInventory.some(
        (i) => i.itemType === 'cosmetic' && i.name === `border_${borderId}`
      );

      if (!hasItem) {
        if (currentGold < item.price) {
          setModalAlert({
            title: '골드 부족',
            message: `${item.name}을(를) 구매하려면 ${item.price} 💰가 필요합니다.`,
            emoji: '💸',
          });
          return;
        }

        const newInventory = [
          ...currentInventory,
          {
            itemType: 'cosmetic' as const,
            name: `border_${borderId}`,
            rarity: item.rarity,
            quantity: 1,
          },
        ];

        updateGameState({
          gold: currentGold - item.price,
          inventory: newInventory,
        });

        setModalAlert({
          title: '구매 완료!',
          message: `${item.name}을(를) 인벤토리에 보관했습니다. 프로필에서 장착할 수 있습니다.`,
          emoji: '🎨',
        });
      } else {
        setModalAlert({
          title: '이미 보유 중',
          message: '프로필 탭의 인벤토리에서 장착하거나 해제할 수 있습니다.',
          emoji: '🎒',
        });
      }
    },
    [updateGameState]
  );

  // 👑 프로필 장식 구매/장착 핸들러
  const handleBuyDecoration = useCallback(
    (decorationId: string) => {
      const decoration = PROFILE_DECORATIONS.find((d) => d.id === decorationId);
      if (!decoration) return;

      const currentSession = useSessionStore.getState().session;
      if (!currentSession) return;

      const currentPersonaData = currentSession.personaData;
      const currentGold = currentPersonaData.gold || 0;
      const currentInventory = currentPersonaData.inventory || [];
      const hasItem = currentInventory.some(
        (i) => i.itemType === 'cosmetic' && i.name === decoration.id
      );

      if (!hasItem) {
        if (currentGold < decoration.price) {
          setModalAlert({
            title: '골드 부족',
            message: `${decoration.name}을(를) 구매하려면 ${decoration.price} 💰가 필요합니다.`,
            emoji: '💸',
          });
          return;
        }

        const newInventory = [
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
        });

        setModalAlert({
          title: '구매 완료!',
          message: `${decoration.emoji} ${decoration.name}을(를) 인벤토리에 보관했습니다. 프로필에서 장착할 수 있습니다.`,
          emoji: '✨',
        });
      } else {
        setModalAlert({
          title: '이미 보유 중',
          message: '프로필 탭의 인벤토리에서 장착하거나 해제할 수 있습니다.',
          emoji: '🎒',
        });
      }
    },
    [updateGameState]
  );

  const handleEquipCosmetic = useCallback(
    (cosmeticName: string) => {
      const currentSession = useSessionStore.getState().session;
      if (!currentSession) return;

      const currentPersonaData = currentSession.personaData;
      const cosmetic = cosmeticName.startsWith('avatar_')
        ? SPECIAL_AVATAR_ITEMS.find((item) => `avatar_${item.id}` === cosmeticName)
        : PROFILE_DECORATIONS.find((item) => item.id === cosmeticName);
      const border = getBorderByInventoryName(cosmeticName);

      if (border) {
        updateGameState({
          equippedBorder: currentPersonaData.equippedBorder === border.id ? null : border.id,
        });
        return;
      }

      if (cosmetic && cosmeticName.startsWith('avatar_')) {
        const avatarId = cosmeticName.replace('avatar_', '');
        const isEquipped = currentPersonaData.specialAvatarId === avatarId;
        updateGameState({
          specialAvatarId: isEquipped ? null : avatarId,
          avatarType: isEquipped ? 'emoji' : 'special_avatar',
          avatarUrl: null,
        });
        return;
      }

      if (cosmetic) {
        updateGameState({
          equippedDecoration: currentPersonaData.equippedDecoration === cosmetic.id ? null : cosmetic.id,
        });
      }
    },
    [updateGameState]
  );

  const handleEquipTitle = useCallback(
    (title: string) => {
      const currentSession = useSessionStore.getState().session;
      if (!currentSession) return;

      const currentTitle = currentSession.personaData.equippedTitle;
      updateGameState({ equippedTitle: currentTitle === title ? null : title });
    },
    [updateGameState]
  );

  // 🛡️ 방지권 구매
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

  // 🎲 퀘스트 리롤 티켓 구매
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
      message: '최초 지정한 습관/요구사항을 기반으로 AI가 퀘스트 3개를 새로 제작해줍니다!',
      emoji: '🎲',
    });
  }, [updateGameState]);

  // 🎲 퀘스트 리롤 티켓 사용 (요구사항 2: 최초 습관/요구사항/난이도 기반 AI 재제작)
  const handleUseRerollTicket = useCallback(async () => {
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

    setLoading(true);

    try {
      const userPrefs = currentPersonaData.userPreferences;
      const personaName = currentPersonaData.persona?.name || '퀘스터';
        const rerollDifficulty = (['easy', 'normal', 'hard'] as const)[Math.floor(Math.random() * 3)];

      const aiResponse = await aiApi.generateQuests({
        personaName,
        habits: userPrefs?.habits?.length ? userPrefs.habits : ['독서와 학습', '집중력과 생산성', '운동과 건강'],
        note: userPrefs?.note || '리롤 티켓을 사용한 맞춤 퀘스트 재제작',
          difficulty: rerollDifficulty,
      });

      const newInventory = currentInventory
        .map((i) => (i.itemType === 'reroll_ticket' ? { ...i, quantity: (i.quantity || 1) - 1 } : i))
        .filter((i) => i.quantity > 0);

      updateGameState({
        inventory: newInventory,
      });

      if (aiResponse.success && aiResponse.data && aiResponse.data.length >= 3) {
        setQuests(aiResponse.data);
      } else {
        const shuffled = [...ALL_QUEST_POOL].sort(() => 0.5 - Math.random());
        const selectedQuests = shuffled.slice(0, 3).map((q, idx) => ({
          ...q,
          difficulty: rerollDifficulty,
          id: `reroll_${Date.now()}_${idx}`,
          status: 'pending' as const,
        }));
        setQuests(selectedQuests as any);
      }

      setModalAlert({
        title: 'AI 퀘스트 재제작 완료!',
        message: '처음 선택하신 요구사항을 바탕으로 AI가 새로운 퀘스트 3개를 맞춤 제작했습니다! 🎲',
        emoji: '✨',
      });
    } catch (error) {
      console.error('AI Reroll failed:', error);
    } finally {
      setLoading(false);
    }
  }, [setQuests, updateGameState]);

  // 로그아웃
  const handleLogout = useCallback(() => {
    clearSession();
    navigate('/');
  }, [clearSession, navigate]);

  // 계산된 스탯 값들
  const currentLevel = personaData.level || 1;
  const currentExp = personaData.totalExp || 0;
  const expProgress = Math.min(100, Math.round(((currentExp % 500) / 500) * 100));
  const totalAttendance = personaData.totalAttendanceDays || (personaData.streak?.currentStreak || 1);
  const rankingPoints = personaData.seasonRankingPoints || 0;

  // Header 상단 콤팩트 스탯 객체 (요구사항 5 완수)
  const headerUserStats = {
    level: currentLevel,
    expProgress,
    currentStreak: personaData.streak?.currentStreak || 0,
    totalAttendanceDays: totalAttendance,
    seasonRankingPoints: rankingPoints,
    gold: personaData.gold || 0,
  };

  return (
    <div className="min-h-screen h-screen overflow-y-auto bg-slate-950 text-white relative font-sans selection:bg-purple-500 selection:text-white">
      {/* 🌟 그래디언트 오버레이 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-pink-600/25 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* 숨겨진 파일 임포트 레퍼런스 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* 고정 헤더: 요구사항 5 (연속 출석, 총 출석, 포인트, 골드, 레벨, XP n% 맨 상단부 압축 명시) */}
      <Header
        title="HabitQuest"
        subtitle={`${personaData.persona?.name || '사용자'} 님의 모험`}
        userStats={headerUserStats}
        trailing={
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 text-[11px] font-semibold px-2.5 py-1 rounded-xl border border-purple-400/30 backdrop-blur-md transition-all active:scale-95"
            title="페르소나 선택창으로 돌아가기"
          >
            <span>👤 선택창으로</span>
          </button>
        }
      />

      {/* 메인 콘텐츠 영역 (상단 거대 대시보드 카드 전면 삭제 완료) */}
      <main className="max-w-xl mx-auto px-4 pt-4 pb-36 relative z-10 space-y-4">
        {/* ================= 탭 1: 퀘스트 ================= */}
        {activeTab === 'quests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent flex items-center gap-2">
                <span>⚔️ 오늘의 AI 맞춤 퀘스트</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 font-normal">
                  {completedCount}/{quests.length} 완료
                </span>
              </h2>

              {/* 🎲 요구사항 2: AI 요구사항 기반 리롤 버튼 */}
              <button
                onClick={handleUseRerollTicket}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 font-medium transition-all shadow-md active:scale-95"
                title="리롤 티켓 1개를 사용하여 최초 요구사항 기반 AI 퀘스트 재제작"
              >
                <span>🎲 AI 리롤 (보유: {(personaData.inventory || []).find((i) => i.itemType === 'reroll_ticket')?.quantity || 0}개)</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
                <div className="inline-block animate-spin text-3xl mb-2">⏳</div>
                <p className="text-sm text-slate-300">AI가 맞춤형 퀘스트를 창작하는 중...</p>
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
                  오늘의 목표를 완수하셨습니다! 내일 새로운 AI 맞춤 퀘스트가 제공됩니다.
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
            <div className="grid gap-3">
              {[
                {
                  label: '월간 퀘스트 달성률',
                  value: `${personaData.stats?.monthlySuccessRate || 0}%`,
                  desc: '이번 달 목표 이행 비율',
                  gradient: 'from-blue-400 to-cyan-300',
                  progress: personaData.stats?.monthlySuccessRate || 0,
                },
                {
                  label: '최고 연속 달성 기록',
                  value: `${personaData.streak?.bestStreak || 0}일`,
                  desc: '연속 출석 최고 수치',
                  gradient: 'from-red-400 to-pink-300',
                },
                {
                  label: '누적 완료 퀘스트 수',
                  value: `${personaData.stats?.totalQuestsCompleted || 0}개`,
                  desc: '지금까지 완수한 습관 수',
                  gradient: 'from-purple-400 to-indigo-300',
                },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-xl">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                      <div className={`text-2xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mt-1`}>
                        {stat.value}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">{stat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 탭 3: 상점 ================= */}
        {activeTab === 'shop' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent px-1">
              🛒 아이템 & 코스메틱 상점
            </h2>

            {/* 티켓 상점 */}
            <div className="grid gap-3">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🛡️</div>
                  <div>
                    <h3 className="font-bold text-sm text-white">스트릭 방지권</h3>
                    <p className="text-[11px] text-slate-400">퀘스트 미달성 시 연속 수치 1회 보호</p>
                  </div>
                </div>
                <Button label="구매 (500 💰)" variant="primary" onClick={handleBuyProtectionTicket} />
              </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🎲</div>
                  <div>
                    <h3 className="font-bold text-sm text-white">AI 퀘스트 리롤 티켓</h3>
                    <p className="text-[11px] text-slate-400">AI가 최초 요구사항 기반으로 3개 새로 생성</p>
                  </div>
                </div>
                <Button label="구매 (300 💰)" variant="primary" onClick={handleBuyRerollTicket} />
              </div>
            </div>

            {/* 🌟 요구사항 1: 특별 프로필 아바타 상점 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300 px-1">🌟 특별 프로필 아바타</h3>
              <div className="grid grid-cols-2 gap-3">
                {SPECIAL_AVATAR_ITEMS.map((item) => {
                  const hasItem = (personaData.inventory || []).some(
                    (i) => i.itemType === 'cosmetic' && i.name === `avatar_${item.id}`
                  );

                  return (
                    <div key={item.id} className="bg-white/5 backdrop-blur-xl rounded-2xl p-3 border border-white/10 flex flex-col justify-between items-center text-center">
                      <AvatarFrame specialAvatarId={item.id} size="lg" className="mb-2" />
                      <h4 className="font-bold text-xs text-white mb-1">{item.name}</h4>
                      <p className="text-[11px] text-yellow-300 font-bold mb-2">{item.price} 💰</p>
                      {hasItem ? (
                        <span className="w-full py-1.5 rounded-xl text-xs font-bold border border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
                          인벤토리 보관됨
                        </span>
                      ) : (
                        <Button label="구매하기" variant="primary" onClick={() => handleBuySpecialAvatar(item.id)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 🎨 요구사항 2: 프로필 테두리 상점 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300 px-1">🎨 프로필 테두리 (Border)</h3>
              <div className="grid grid-cols-2 gap-3">
                {BORDER_ITEMS.map((item) => {
                  const hasItem = (personaData.inventory || []).some(
                    (i) => i.itemType === 'cosmetic' && i.name === `border_${item.id}`
                  );

                  return (
                    <div key={item.id} className="bg-white/5 backdrop-blur-xl rounded-2xl p-3 border border-white/10 flex flex-col justify-between items-center text-center">
                      <AvatarFrame equippedBorder={item.id} avatarIndex={personaData.avatarIndex || 0} size="lg" className="mb-2" />
                      <h4 className="font-bold text-xs text-white mb-0.5">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 mb-1">{item.desc}</p>
                      <p className="text-[11px] text-yellow-300 font-bold mb-2">{item.price} 💰</p>
                      {hasItem ? (
                        <span className="w-full py-1.5 rounded-xl text-xs font-bold border border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
                          인벤토리 보관됨
                        </span>
                      ) : (
                        <Button label="구매하기" variant="primary" onClick={() => handleBuyBorder(item.id)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 👑 요구사항 2: 프로필 장식 아이템 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300 px-1">✨ 프로필 코스메틱 장식</h3>
              <div className="grid grid-cols-2 gap-3">
                {PROFILE_DECORATIONS.map((decoration) => {
                  const hasItem = (personaData.inventory || []).some(
                    (i) => i.itemType === 'cosmetic' && i.name === decoration.id
                  );

                  return (
                    <div key={decoration.id} className="bg-white/5 backdrop-blur-xl rounded-2xl p-3 border border-white/10 flex flex-col justify-between items-center text-center">
                      <AvatarFrame equippedDecoration={decoration.id} avatarIndex={personaData.avatarIndex || 0} size="lg" className="mb-2" />
                      <h4 className="font-bold text-xs text-white mb-0.5">{decoration.name}</h4>
                      <p className="text-[11px] text-yellow-300 font-bold mb-2">{decoration.price} 💰</p>
                      {hasItem ? (
                        <span className="w-full py-1.5 rounded-xl text-xs font-bold border border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
                          인벤토리 보관됨
                        </span>
                      ) : (
                        <Button label="구매하기" variant="primary" onClick={() => handleBuyDecoration(decoration.id)} />
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
              {/* 요구사항 2: 시각적 AvatarFrame 렌더링 */}
              <div className="relative inline-block mx-auto">
                <AvatarFrame
                  avatarIndex={personaData.avatarIndex}
                  avatarUrl={personaData.avatarUrl}
                  specialAvatarId={personaData.specialAvatarId}
                  equippedBorder={personaData.equippedBorder}
                  equippedDecoration={personaData.equippedDecoration}
                  size="xl"
                />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-white">{personaData.persona?.name}</h3>
                <p className="text-xs text-purple-300 font-medium mt-1">
                  Lv.{currentLevel} • {personaData.equippedTitle || '기본 칭호'}
                </p>
              </div>

              {/* 📷 요구사항 1: 아바타 사진 첨부 버튼 */}
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600/40 hover:bg-purple-600/60 border border-purple-400/40 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <span>📷 내 컴퓨터 사진 첨부하기</span>
                </button>
              </div>

              {/* 내 인벤토리 품목 */}
              <div className="pt-4 border-t border-white/10 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-300">코스메틱 인벤토리</h4>
                  <span className="text-[10px] text-slate-500">프로필 꾸미기</span>
                </div>
                {[
                  {
                    label: '칭호',
                    items: (personaData.inventory || []).filter(
                      (item) =>
                        item.itemType === 'cosmetic' &&
                        item.name !== '없음' &&
                        isTitleInventoryName(item.name)
                    ),
                  },
                  {
                    label: '테두리',
                    items: (personaData.inventory || []).filter(
                      (item) =>
                        item.itemType === 'cosmetic' &&
                        isBorderInventoryName(item.name)
                    ),
                  },
                  {
                    label: '장식',
                    items: (personaData.inventory || []).filter(
                      (item) =>
                        item.itemType === 'cosmetic' &&
                        (item.name.startsWith('avatar_') ||
                          PROFILE_DECORATIONS.some((decoration) => decoration.id === item.name))
                    ),
                  },
                ].map((category) => (
                  <div key={category.label} className="space-y-2">
                    <h5 className="text-[11px] font-bold text-purple-200">{category.label}</h5>
                    {category.items.length > 0 ? (
                      category.items.map((item) => {
                        const avatar = item.name.startsWith('avatar_')
                          ? SPECIAL_AVATAR_ITEMS.find((entry) => `avatar_${entry.id}` === item.name)
                          : null;
                        const border = getBorderByInventoryName(item.name);

                        const decoration = !avatar && !border
                          ? PROFILE_DECORATIONS.find((entry) => entry.id === item.name)
                          : null;
                        const isTitle = category.label === '칭호';
                        const label = avatar?.name || border?.name || decoration?.name || item.name;
                        const preview = isTitle ? (
                          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-300/30 flex items-center justify-center text-lg">🏅</div>
                        ) : avatar ? (
                          <AvatarFrame specialAvatarId={avatar.id} size="sm" />
                        ) : border ? (
                          <AvatarFrame equippedBorder={border.id} avatarIndex={personaData.avatarIndex || 0} size="sm" />
                        ) : (
                          <AvatarFrame equippedDecoration={decoration?.id} avatarIndex={personaData.avatarIndex || 0} size="sm" />
                        );
                        const equipped = isTitle
                          ? personaData.equippedTitle === item.name
                          : avatar
                          ? personaData.specialAvatarId === avatar.id
                          : border
                          ? personaData.equippedBorder === border.id
                          : personaData.equippedDecoration === decoration?.id;

                        return (
                          <div key={item.name} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2.5">
                            {preview}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">{label}</p>
                              <p className="text-[10px] text-slate-400">{item.quantity}개 보유</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => isTitle ? handleEquipTitle(item.name) : handleEquipCosmetic(item.name)}
                              className={`shrink-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                                equipped
                                  ? 'border-purple-300 bg-purple-500/30 text-purple-100'
                                  : 'border-white/20 bg-white/10 text-slate-200 hover:bg-white/20'
                              }`}
                            >
                              {equipped ? '장착 해제' : '장착'}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-[10px] text-slate-500">
                        보유한 {category.label}이 없습니다.
                      </p>
                    )}
                  </div>
                ))}

                <h4 className="text-xs font-semibold text-slate-300">보유 기능성 티켓</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>방지권</span>
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
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 모달 알림 */}
      {modalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-purple-400/40 rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl space-y-3">
            <div className="text-4xl">{modalAlert.emoji || '✨'}</div>
            <h3 className="text-lg font-bold text-white">{modalAlert.title}</h3>
            <p className="text-xs text-slate-300">{modalAlert.message}</p>
            <button
              onClick={() => setModalAlert(null)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 하단 고정 탭바 */}
      <TabBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'ranking') {
            navigate('/ranking');
          } else {
            setActiveTab(tab as TabId);
          }
        }}
      />
    </div>
  );
};
