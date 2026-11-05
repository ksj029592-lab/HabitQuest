/**
 * HabitQuest - HomePage (AI-IDEA1 반영: 상단 헤더 통합, AvatarFrame 시각화, 사진 업로드, 요구사항 기반 AI 리롤)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, TabBar, QuestCard, Button, AvatarFrame } from '@components';
import { QuestVerificationDialog } from '../components/QuestVerificationDialog';
import { BORDER_STYLES, resolveBorderId, SHOP_BORDER_ITEMS } from '../components/AvatarFrame';
import { DailyQuest } from '@types';
import { isAxiosError } from 'axios';
import { applyServerUserState } from '../api/user';
import { ProgressCenter } from '../components/ProgressCenter';
import { ProfileSettings } from '../components/ProfileSettings';
import { ReminderAgent } from '../components/ReminderAgent';
import { connectServerSession } from '../api/connectSession';
import { useSessionStore, useQuestStore } from '@store';
import { questApi, aiApi, shopApi, userApi, personaApi } from '@api';
import { ArrowRight, Award, Backpack, Camera, CheckCheck, Coins, Crown, Flame, Frame, LogOut, RotateCw, ShieldCheck, ShoppingBag, Ticket, TriangleAlert, Trophy, UserRound, Zap, type LucideIcon } from 'lucide-react';

type TabId = 'quests' | 'stats' | 'shop' | 'profile' | 'ranking';

const ALERT_ICONS: Record<string, LucideIcon> = {
  '🛡️': ShieldCheck, '🔄': RotateCw, '⚠️': TriangleAlert, '📷': Camera,
  '💸': Coins, '✨': CheckCheck, '🎒': Backpack, '🎨': Frame, '🎲': RotateCw, '🛒': ShoppingBag,
};

const getKstDateKey = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

// 로컬(목업) 세션은 sessionId가 'session_'로 시작한다
const isServerSession = (s: { sessionId: string }) => !s.sessionId.startsWith('session_');

// ============= 상점 품목 카탈로그 =============
const PROFILE_DECORATIONS = [
  { id: 'aura', name: '신성한 후광', price: 300, rarity: 'rare' as const, emoji: '✨' },
  { id: 'crown', name: '왕관', price: 500, rarity: 'epic' as const, emoji: '👑' },
  { id: 'wings', name: '천사의 날개', price: 400, rarity: 'rare' as const, emoji: '🪽' },
  { id: 'flame', name: '전설의 불꽃', price: 350, rarity: 'rare' as const, emoji: '🔥' },
];

const BORDER_ITEMS = SHOP_BORDER_ITEMS;

const SPECIAL_AVATAR_ITEMS = [
  { id: 'warrior', name: '갓생 전사', price: 500, rarity: 'rare' as const },
  { id: 'fox', name: '럭키 포인터', price: 600, rarity: 'epic' as const },
  { id: 'astronaut', name: '스페이스 탐험가', price: 700, rarity: 'epic' as const },
  { id: 'dragon', name: '드래곤 마스터', price: 1000, rarity: 'legendary' as const },
];

const getBorderByInventoryName = (name: string) => {
  const id = resolveBorderId(name);
  if (!id) return undefined;
  return BORDER_ITEMS.find((item) => item.id === id) || { id, name: BORDER_STYLES[id].name };
};

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
  const [verificationQuest, setVerificationQuest] = useState<DailyQuest | null>(null);
  const [connectionError, setConnectionError] = useState('');
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const cosmeticBusy = useRef(false);
  const [modalAlert, setModalAlert] = useState<{ title: string; message: string; emoji?: string } | null>(null);

  // 세션 체크
  useEffect(() => {
    if (!session) {
      navigate('/');
    }
  }, [session, navigate]);

  // 서버 기준 사용자 상태(골드/경험치/레벨/스트릭/티켓/시즌 포인트)를 세션에 반영
  const syncUserState = useCallback(async (userId: string) => {
    const response = await userApi.getMe(userId);
    if (response.success && response.data) applyServerUserState(response.data);
  }, []);

  // KST 날짜가 바뀔 때 일일 퀘스트를 다시 불러오도록 1분마다 날짜 확인
  const [dayKey, setDayKey] = useState<string>(getKstDateKey());
  useEffect(() => {
    const timer = setInterval(() => setDayKey(getKstDateKey()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const userId = session?.personaData.userId;

  // Daily Quests 불러오기
  useEffect(() => {
    let isMounted = true;
    const loadQuests = async () => {
      const currentSession = useSessionStore.getState().session;
      if (!currentSession) return;
      const prefs = currentSession.personaData.userPreferences;

      if (!isServerSession(currentSession)) {
        setLoading(true);
        setConnectionError('');
        try {
          const connected = await connectServerSession(currentSession);
          if (isMounted && useSessionStore.getState().session?.sessionId === currentSession.sessionId) {
            setQuests([]);
            useSessionStore.getState().setSession(connected);
          }
        } catch (error) {
          if (isMounted) setConnectionError(isAxiosError(error) ? '서버·DB·AI 연결을 확인하고 다시 시도해 주세요.' : error instanceof Error ? error.message : '서버 연결에 실패했습니다.');
        } finally {
          if (isMounted) setLoading(false);
        }
        return;
      }

      // 서버 세션: 오늘 퀘스트가 없으면 서버에서 생성(자정 초기화) 후 사용자 상태 동기화
      if (isServerSession(currentSession)) {
        try {
          setLoading(true);
          const response = await questApi.ensureDailyQuests(currentSession.personaData.userId, {
            personaName: currentSession.personaData.persona?.name || '초심자',
            habits: prefs?.habits?.length ? prefs.habits : ['건강 관리', '독서와 학습', '마음 챙김'],
            note: prefs?.note || '오늘의 맞춤 퀘스트',
            difficulty: prefs?.difficulty || 'normal',
          });
          if (isMounted && response.success && response.data) {
            setQuests(response.data.quests);
            if (response.data.protectionUsed) {
              setModalAlert({
                title: '방지권 사용',
                message: '어제 퀘스트를 놓쳐 방지권 1개로 연속 기록을 지켰습니다.',
                emoji: '🛡️',
              });
            } else if (response.data.streakReset) {
              setModalAlert({
                title: '연속 기록 초기화',
                message: '퀘스트를 건너뛴 날이 있어 연속 기록이 0일로 돌아갔습니다. 오늘의 퀘스트부터 다시 시작하세요.',
                emoji: '🔄',
              });
            }
            await syncUserState(currentSession.personaData.userId);
            return;
          }
        } catch (err) {
          setModalAlert({ title: '서버 기록 확인 실패', message: isAxiosError(err) && err.response?.status === 401 ? '이전 세션이 만료되었어요. 페르소나를 다시 선택해 주세요.' : '서버 기록을 불러오지 못했어요. 연결을 확인해 주세요.' });
        } finally {
          if (isMounted) setLoading(false);
        }
        return;
      }

    };

    loadQuests();
    return () => {
      isMounted = false;
    };
  }, [userId, dayKey, setQuests, syncUserState, connectionAttempt]);

  if (!session) {
    return null;
  }

  const personaData = session.personaData;
  const pendingQuests = quests.filter((q) => q.status === 'pending');
  const completedQuests = quests.filter((q) => q.status === 'completed');
  const completedCount = completedQuests.length;

  // 퀘스트 완료 처리
  const handleVerifiedQuest = useCallback((verified: DailyQuest) => {
    const currentSession = useSessionStore.getState().session;
    const latestQuests = useQuestStore.getState().quests;
    const original = latestQuests.find((quest) => quest.id === verified.id);
    if (!currentSession || !original || original.status !== 'pending') return;
    const updatedQuests = latestQuests.map((quest) => quest.id === verified.id ? verified : quest);
    setQuests(updatedQuests);
    const current = currentSession.personaData;
    const completed = updatedQuests.filter((quest) => quest.status === 'completed').length;
    const stats = {
      ...current.stats,
      totalQuestsCompleted: (current.stats?.totalQuestsCompleted || 0) + 1,
      monthlySuccessRate: Math.round(completed / updatedQuests.length * 100),
    };
    if (isServerSession(currentSession)) {
      void syncUserState(current.userId).catch(() => console.warn('User state sync deferred after quest completion'));
      return;
    }
    const totalExp = (current.totalExp || 0) + verified.expReward;
    const currentStreak = current.streak?.currentStreak || 0;
    updateGameState({
      stats,
      totalExp,
      level: Math.max(current.level || 1, Math.floor(totalExp / 500) + 1),
      gold: (current.gold || 0) + verified.goldReward,
      seasonRankingPoints: (current.seasonRankingPoints || 0) + (verified.rankingPointReward ?? { easy: 10, normal: 20, hard: 30 }[verified.difficulty]),
      ...(completed >= 3 ? { streak: { currentStreak: currentStreak + 1, bestStreak: Math.max(current.streak?.bestStreak || 0, currentStreak + 1), lastAttendanceDateKst: getKstDateKey() } } : {}),
    });
  }, [setQuests, updateGameState, syncUserState]);

  const serverCosmeticAction = useCallback(async (itemId: string, equip = false) => {
    const currentSession = useSessionStore.getState().session;
    if (!currentSession || !isServerSession(currentSession)) return false;
    if (cosmeticBusy.current) return true;
    cosmeticBusy.current = true;
    try {
      const result = equip ? await userApi.equipCosmetic(itemId) : await userApi.purchaseCosmetic(itemId);
      if (!result.success) throw new Error(result.error?.message || '아이템 요청에 실패했습니다.');
      if (equip && itemId.startsWith('avatar_')) updateGameState({ avatarUrl: null });
      await syncUserState(currentSession.personaData.userId);
      if (!equip) setModalAlert({ title: '구매 완료', message: '아이템이 서버 인벤토리에 보관됐습니다.' });
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.message : error instanceof Error ? error.message : '요청에 실패했습니다.';
      setModalAlert({ title: '아이템 처리 실패', message: Array.isArray(message) ? message.join(' ') : message || '서버 연결을 확인해 주세요.' });
    } finally {
      cosmeticBusy.current = false;
    }
    return true;
  }, [syncUserState, updateGameState]);

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
        message: '새로운 사진이 아바타에 적용되었습니다.',
        emoji: '📷',
      });
    };
    reader.readAsDataURL(file);
  };

  // 🌟 특별 아바타 구매/장착 핸들러
  const handleBuySpecialAvatar = useCallback(
    async (avatarId: string) => {
      const item = SPECIAL_AVATAR_ITEMS.find((a) => a.id === avatarId);
      if (!item) return;

      const currentSession = useSessionStore.getState().session;
      if (!currentSession) return;
      if (await serverCosmeticAction(`avatar_${avatarId}`)) return;
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
            message: `${item.name}을(를) 구매하려면 ${item.price} G가 필요합니다.`,
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
    [updateGameState, serverCosmeticAction]
  );

  // 🎨 테두리(Border) 구매/장착 핸들러
  const handleBuyBorder = useCallback(
    async (borderId: string) => {
      const item = BORDER_ITEMS.find((b) => b.id === borderId);
      if (!item) return;

      const currentSession = useSessionStore.getState().session;
      if (!currentSession) return;
      if (await serverCosmeticAction(`border_${borderId}`)) return;
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
            message: `${item.name}을(를) 구매하려면 ${item.price} G가 필요합니다.`,
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
    [updateGameState, serverCosmeticAction]
  );

  // 👑 프로필 장식 구매/장착 핸들러
  const handleBuyDecoration = useCallback(
    async (decorationId: string) => {
      const decoration = PROFILE_DECORATIONS.find((d) => d.id === decorationId);
      if (!decoration) return;

      const currentSession = useSessionStore.getState().session;
      if (!currentSession) return;
      if (await serverCosmeticAction(decorationId)) return;

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
            message: `${decoration.name}을(를) 구매하려면 ${decoration.price} G가 필요합니다.`,
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
          message: `${decoration.name}을(를) 인벤토리에 보관했습니다. 프로필에서 장착할 수 있습니다.`,
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
    [updateGameState, serverCosmeticAction]
  );

  const handleEquipCosmetic = useCallback(
    async (cosmeticName: string) => {
      const currentSession = useSessionStore.getState().session;
      if (!currentSession) return;

      const currentPersonaData = currentSession.personaData;
      const cosmetic = cosmeticName.startsWith('avatar_')
        ? SPECIAL_AVATAR_ITEMS.find((item) => `avatar_${item.id}` === cosmeticName)
        : PROFILE_DECORATIONS.find((item) => item.id === cosmeticName);
      const border = getBorderByInventoryName(cosmeticName);
      const itemId = currentPersonaData.inventory.find((item) => item.name === cosmeticName)?.itemId || (border ? `border_${border.id}` : cosmeticName);
      if (await serverCosmeticAction(itemId, true)) return;

      if (border) {
        updateGameState({
          equippedBorder: resolveBorderId(currentPersonaData.equippedBorder) === border.id ? null : border.id,
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
    [updateGameState, serverCosmeticAction]
  );

  const handleEquipTitle = useCallback(
    async (title: string) => {
      const currentSession = useSessionStore.getState().session;
      if (!currentSession) return;
      if (await serverCosmeticAction(title, true)) return;

      const currentTitle = currentSession.personaData.equippedTitle;
      updateGameState({ equippedTitle: currentTitle === title ? null : title });
    },
    [updateGameState, serverCosmeticAction]
  );

  // 🛡️ 방지권 구매
  const handleBuyProtectionTicket = useCallback(async () => {
    const currentSession = useSessionStore.getState().session;
    if (!currentSession) return;

    const currentPersonaData = currentSession.personaData;
    const currentGold = currentPersonaData.gold || 0;
    const ticketPrice = 1000;

    if (currentGold < ticketPrice) {
      setModalAlert({
        title: '골드 부족',
        message: `방지권을 구매하려면 ${ticketPrice} G가 필요합니다.`,
        emoji: '🛡️',
      });
      return;
    }

    try {
      const response = await shopApi.purchaseProtectionTicket(currentPersonaData.userId);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || '구매에 실패했습니다');
      }

      const currentInventory = currentPersonaData.inventory || [];
      const ticketItem = currentInventory.find((i) => i.itemType === 'protection_ticket');
      const newInventory = ticketItem
        ? currentInventory.map((i) =>
            i.itemType === 'protection_ticket'
              ? { ...i, quantity: response.data!.quantity }
              : i
          )
        : [
            ...currentInventory,
            {
              itemType: 'protection_ticket' as const,
              name: '방지권',
              rarity: 'common' as const,
              quantity: response.data.quantity,
            },
          ];

      updateGameState({ gold: response.data.gold, inventory: newInventory });
      setModalAlert({
        title: '방지권 구매 완료!',
        message: '퀘스트 미달성 시 연속 출석을 1회 보호해줍니다.',
        emoji: '🛡️',
      });
    } catch (error) {
      setModalAlert({
        title: '구매 실패',
        message: error instanceof Error ? error.message : '구매에 실패했습니다.',
        emoji: '⚠️',
      });
    }
  }, [updateGameState]);

  // 🎲 퀘스트 리롤 티켓 구매
  const handleBuyRerollTicket = useCallback(async () => {
    const currentSession = useSessionStore.getState().session;
    if (!currentSession) return;

    const currentPersonaData = currentSession.personaData;
    const currentGold = currentPersonaData.gold || 0;
    const ticketPrice = 300;
    const isServerUser = isServerSession(currentSession);

    if (currentGold < ticketPrice) {
      setModalAlert({
        title: '골드 부족',
        message: `리롤 티켓을 구매하려면 ${ticketPrice} G가 필요합니다.`,
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

    let nextGold = currentGold - ticketPrice;
    let finalInventory = newInventory;
    if (isServerUser) {
      try {
        const response = await shopApi.purchaseRerollTicket(currentPersonaData.userId);
        if (!response.success || !response.data) {
          throw new Error(response.error?.message || '구매에 실패했습니다.');
        }
        const serverQty = response.data.quantity;
        nextGold = response.data.gold;
        finalInventory = ticketItem
          ? currentInventory.map((i) => (i.itemType === 'reroll_ticket' ? { ...i, quantity: serverQty } : i))
          : [...currentInventory, { itemType: 'reroll_ticket' as const, name: '리롤 티켓', rarity: 'common' as const, quantity: serverQty }];
      } catch (error) {
        setModalAlert({
          title: '구매 실패',
          message: error instanceof Error ? error.message : '구매에 실패했습니다.',
          emoji: '⚠️',
        });
        return;
      }
    }

    updateGameState({
      gold: nextGold,
      inventory: finalInventory,
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
      const habits = userPrefs?.habits?.length ? userPrefs.habits : ['독서와 학습', '집중력과 생산성', '운동과 건강'];
      const note = userPrefs?.note || '리롤 티켓을 사용한 맞춤 퀘스트 재제작';
      const isServerUser = isServerSession(currentSession);

      if (isServerUser) {
        const response = await questApi.rerollQuests(currentPersonaData.userId, { personaName, habits, note });
        if (!response.success || !response.data) {
          throw new Error(response.error?.message || '리롤에 실패했습니다.');
        }
        const serverTickets = response.data.rerollTickets;
        updateGameState({
          inventory: currentInventory
            .map((i) => (i.itemType === 'reroll_ticket' ? { ...i, quantity: serverTickets } : i))
            .filter((i) => i.quantity > 0),
        });
        setQuests(response.data.quests);
        setModalAlert({
          title: 'AI 퀘스트 재제작 완료!',
          message: `진행 중인 퀘스트가 새로 만들어졌습니다. (난이도: ${{ easy: '쉬움', normal: '보통', hard: '어려움' }[response.data.difficulty]})`,
          emoji: '✨',
        });
        return;
      }

      const rerollDifficulty = (['easy', 'normal', 'hard'] as const)[Math.floor(Math.random() * 3)];

      const aiResponse = await aiApi.generateQuests({
        personaName,
        habits,
        note,
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
        message: '설정한 습관을 바탕으로 새로운 퀘스트 3개를 만들었습니다.',
        emoji: '✨',
      });
    } catch (error) {
      console.error('AI Reroll failed:', error);
      setModalAlert({
        title: '리롤 실패',
        message: error instanceof Error ? error.message : '리롤에 실패했습니다.',
        emoji: '⚠️',
      });
    } finally {
      setLoading(false);
    }
  }, [setQuests, updateGameState]);

  // 로그아웃
  const handleLogout = useCallback(async () => {
    const currentSession = useSessionStore.getState().session;
    try {
      if (currentSession && isServerSession(currentSession)) await personaApi.endSession();
    } catch {
      console.warn('Session revocation could not be confirmed');
    } finally {
      clearSession();
      setQuests([]);
      navigate('/');
    }
  }, [clearSession, setQuests, navigate]);

  // 계산된 스탯 값들
  const currentLevel = personaData.level || 1;
  const currentExp = personaData.totalExp || 0;
  const expPerLevel = personaData.expPerLevel || (isServerSession(session) ? 300 : 500);
  const expProgress = Math.min(100, Math.round(((currentExp % expPerLevel) / expPerLevel) * 100));
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
    <div className="hq-app">

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
        userStats={headerUserStats}
        trailing={
          <button
            onClick={handleLogout}
            className="hq-icon-button"
            title="페르소나 선택창으로 돌아가기"
            aria-label="페르소나 선택창으로 돌아가기"
          >
            <LogOut size={18} />
          </button>
        }
      />

      {/* 메인 콘텐츠 영역 (상단 거대 대시보드 카드 전면 삭제 완료) */}
      <ReminderAgent session={session} onReminder={(pending) => setModalAlert({ title: '오늘의 퀘스트 리마인더', message: `오늘 아직 ${pending}개의 퀘스트가 남아 있어요. 작은 실천으로 하루를 마무리해 보세요.` })} />
      <main className="hq-main">
        {!isServerSession(session) && <section className="hq-empty-state" role="status"><h2>페르소나를 실제 서버에 연결하고 있어요.</h2><p>서버 레벨과 수령 가능한 보상을 불러옵니다.</p>{connectionError && <><p role="alert" className="hq-verification-error">{connectionError}</p><Button onClick={() => setConnectionAttempt((value) => value + 1)}>서버 연결 다시 시도</Button></>}</section>}
        {/* ================= 탭 1: 퀘스트 ================= */}
        {isServerSession(session) && activeTab === 'quests' && (
          <div className="hq-dashboard">
            <section className="hq-welcome">
              <div>
                <p className="hq-eyebrow">{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Seoul' }).format(new Date())}</p>
                <h2>오늘의 습관 퀘스트</h2>
                <p>오늘의 퀘스트 {quests.length}개 · 실천과 성찰이 경험치로 쌓입니다.</p>
              </div>
              <AvatarFrame avatarIndex={personaData.avatarIndex} avatarUrl={personaData.avatarUrl} specialAvatarId={personaData.specialAvatarId} equippedBorder={personaData.equippedBorder} size="sm" />
            </section>
            <section className="hq-daily-progress" aria-label="오늘의 진행 상황">
              <div className="hq-progress-ring" role="progressbar" aria-label="오늘의 퀘스트 달성률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={quests.length ? Math.round(completedCount / quests.length * 100) : 0} style={{ '--progress': `${quests.length ? completedCount / quests.length * 100 : 0}%` } as React.CSSProperties}>
                <strong>{quests.length ? Math.round(completedCount / quests.length * 100) : 0}<small>%</small></strong>
              </div>
              <div className="hq-progress-copy"><span className="hq-eyebrow">DAILY PROGRESS</span><h3>오늘의 달성 현황</h3><p><strong>{completedCount} / {quests.length}</strong> 퀘스트 완료</p></div>
              <div className="hq-progress-note"><CheckCheck size={20} /><span>{completedCount === quests.length && quests.length > 0 ? '오늘의 퀘스트 완료' : `남은 퀘스트 ${pendingQuests.length}개`}</span></div>
            </section>
            <section className="hq-stat-strip" aria-label="나의 보상 현황">
              <div><span className="hq-stat-icon streak"><Flame size={19} /></span><span>연속 달성<strong>{personaData.streak?.currentStreak || 0}<small>일</small></strong></span></div>
              <div><span className="hq-stat-icon gold"><Coins size={19} /></span><span>보유 골드<strong>{(personaData.gold || 0).toLocaleString()}<small>G</small></strong></span></div>
              <div><span className="hq-stat-icon points"><Trophy size={19} /></span><span>시즌 포인트<strong>{rankingPoints.toLocaleString()}<small>PT</small></strong></span></div>
            </section>
            <section className="hq-quest-section" aria-labelledby="daily-quests-title">
            <div className="hq-section-heading">
              <div><p className="hq-eyebrow">MY QUESTS</p><h2 id="daily-quests-title">오늘의 퀘스트 <span>{quests.length}</span></h2></div>

              {/* 🎲 요구사항 2: AI 요구사항 기반 리롤 버튼 */}
              <button
                onClick={handleUseRerollTicket}
                disabled={loading}
                className="hq-reroll-button"
                title="리롤 티켓 1개를 사용하여 최초 요구사항 기반 AI 퀘스트 재제작"
              >
                <RotateCw size={15} /><span>리롤</span><span className="hq-ticket-count"><Ticket size={13} />{(personaData.inventory || []).find((i) => i.itemType === 'reroll_ticket')?.quantity || 0}</span>
              </button>
            </div>

            {loading ? (
              <div className="hq-empty-state" role="status">
                <RotateCw size={26} className="animate-spin mx-auto mb-3" />
                <p>나에게 맞는 퀘스트를 준비하고 있어요.</p>
              </div>
            ) : pendingQuests.length > 0 ? (
              <div className="space-y-3">
                {pendingQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onComplete={(questId) => setVerificationQuest(quests.find((quest) => quest.id === questId && quest.status === 'pending') || null)}
                  />
                ))}
              </div>
            ) : (
              <div className="hq-empty-state"><CheckCheck size={32} className="mx-auto mb-3" /><h3>오늘의 퀘스트를 모두 마쳤어요!</h3><p>내일 또 새로운 도전으로 만나요.</p>
              </div>
            )}

            {completedQuests.length > 0 && (
              <div className="hq-completed-section space-y-3">
                <h3 className="hq-eyebrow">
                  완료된 퀘스트 ({completedQuests.length})
                </h3>
                {completedQuests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            )}
            </section>
            <aside className="hq-sidebar" aria-label="성장과 보상">
              <section className="hq-growth">
                <p className="hq-eyebrow">YOUR JOURNEY</p><h3>차곡차곡, 레벨 업</h3>
                <div className="hq-level-emblem"><Zap size={31} /><span>LEVEL<strong>{currentLevel}</strong></span></div>
                <div className="hq-level-caption"><span>다음 레벨까지</span><strong>{expProgress}%</strong></div>
                <progress max={100} value={expProgress} aria-label="레벨 경험치 진행률" />
                <p className="hq-growth-total">누적 {currentExp.toLocaleString()} XP</p>
              </section>
              <section className="hq-reward-summary">
                <p className="hq-eyebrow">UP NEXT</p><h3>남은 퀘스트 보상</h3>
                <dl>
                  <div><dt><Zap size={16} /> 경험치</dt><dd>+{pendingQuests.reduce((sum, quest) => sum + quest.expReward, 0)} XP</dd></div>
                  <div><dt><Coins size={16} /> 골드</dt><dd>+{pendingQuests.reduce((sum, quest) => sum + quest.goldReward, 0)} G</dd></div>
                  <div><dt><Trophy size={16} /> 랭킹</dt><dd>+{pendingQuests.reduce((sum, quest) => sum + (quest.rankingPointReward ?? { easy: 10, normal: 20, hard: 30 }[quest.difficulty]), 0)} PT</dd></div>
                </dl>
                <button className="hq-text-button" onClick={() => setActiveTab('shop')}>보상 상점 둘러보기 <ArrowRight size={16} /></button>
              </section>
              <div className="hq-protection-note"><ShieldCheck size={18} /><span>보유 방지권 <strong>{(personaData.inventory || []).find((item) => item.itemType === 'protection_ticket')?.quantity || 0}개</strong></span></div>
            </aside>
          </div>
        )}

        {/* ================= 탭 2: 통계 ================= */}
        {isServerSession(session) && activeTab === 'stats' && (
          <ProgressCenter session={session} onRefresh={() => syncUserState(session.personaData.userId)} />
        )}

        {/* ================= 탭 3: 상점 ================= */}
        {isServerSession(session) && activeTab === 'shop' && (
          <div className="hq-legacy space-y-5">
            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent px-1">
              <ShoppingBag size={20} strokeWidth={1.6} className="inline-block mr-2" aria-hidden="true" />아이템 상점
            </h2>

            {/* 티켓 상점 */}
            <div className="grid gap-3">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={30} strokeWidth={1.6} className="shrink-0 text-teal-700" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-sm text-white">스트릭 방지권</h3>
                    <p className="text-[11px] text-slate-400">퀘스트 미달성 시 연속 수치 1회 보호</p>
                  </div>
                </div>
                <Button variant="primary" onClick={handleBuyProtectionTicket}><Coins size={15} aria-hidden="true" />1,000 G 구매</Button>
              </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RotateCw size={30} strokeWidth={1.6} className="shrink-0 text-sky-700" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-sm text-white">AI 퀘스트 리롤 티켓</h3>
                    <p className="text-[11px] text-slate-400">AI가 최초 요구사항 기반으로 3개 새로 생성</p>
                  </div>
                </div>
                <Button variant="primary" onClick={handleBuyRerollTicket}><Coins size={15} aria-hidden="true" />300 G 구매</Button>
              </div>
            </div>

            {/* 🌟 요구사항 1: 특별 프로필 아바타 상점 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300 px-1 flex items-center gap-2"><UserRound size={17} strokeWidth={1.6} aria-hidden="true" />특별 프로필 아바타</h3>
              <div className="grid grid-cols-2 gap-3">
                {SPECIAL_AVATAR_ITEMS.map((item) => {
                  const hasItem = (personaData.inventory || []).some(
                    (i) => i.itemType === 'cosmetic' && i.name === `avatar_${item.id}`
                  );

                  return (
                    <div key={item.id} className="bg-white/5 backdrop-blur-xl rounded-2xl p-3 border border-white/10 flex flex-col justify-between items-center text-center">
                      <AvatarFrame specialAvatarId={item.id} size="lg" className="mb-2" />
                      <h4 className="font-bold text-xs text-white mb-1">{item.name}</h4>
                      <p className="text-[11px] text-yellow-300 font-bold mb-2">{item.price} G</p>
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
              <h3 className="text-sm font-bold text-slate-300 px-1 flex items-center gap-2"><Frame size={17} strokeWidth={1.6} aria-hidden="true" />프로필 테두리</h3>
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
                      <p className="text-[11px] text-yellow-300 font-bold mb-2">{item.price} G</p>
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
              <h3 className="text-sm font-bold text-slate-300 px-1 flex items-center gap-2"><Crown size={17} strokeWidth={1.6} aria-hidden="true" />프로필 장식</h3>
              <div className="grid grid-cols-2 gap-3">
                {PROFILE_DECORATIONS.map((decoration) => {
                  const hasItem = (personaData.inventory || []).some(
                    (i) => i.itemType === 'cosmetic' && i.name === decoration.id
                  );

                  return (
                    <div key={decoration.id} className="bg-white/5 backdrop-blur-xl rounded-2xl p-3 border border-white/10 flex flex-col justify-between items-center text-center">
                      <AvatarFrame equippedDecoration={decoration.id} avatarIndex={personaData.avatarIndex || 0} size="lg" className="mb-2" />
                      <h4 className="font-bold text-xs text-white mb-0.5">{decoration.name}</h4>
                      <p className="text-[11px] text-yellow-300 font-bold mb-2">{decoration.price} G</p>
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
        {isServerSession(session) && activeTab === 'profile' && (
          <div className="hq-legacy space-y-5">
            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent px-1">
              <UserRound size={20} strokeWidth={1.6} className="inline-block mr-2" aria-hidden="true" />내 프로필
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
                  <Camera size={16} strokeWidth={1.6} aria-hidden="true" /><span>프로필 사진 변경</span>
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
                          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-300/30 flex items-center justify-center text-amber-700"><Award size={23} strokeWidth={1.6} aria-hidden="true" /></div>
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
                          ? resolveBorderId(personaData.equippedBorder) === border.id
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
                      <ShieldCheck size={16} strokeWidth={1.6} aria-hidden="true" />
                      <span>방지권</span>
                    </span>
                    <span className="text-blue-300 font-bold">
                      {(personaData.inventory || []).find((i) => i.itemType === 'protection_ticket')?.quantity || 0}개
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <RotateCw size={16} strokeWidth={1.6} aria-hidden="true" />
                      <span>리롤 티켓</span>
                    </span>
                    <span className="text-purple-300 font-bold">
                      {(personaData.inventory || []).find((i) => i.itemType === 'reroll_ticket')?.quantity || 0}개
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <ProfileSettings key={session.sessionId} session={session} onRefresh={() => syncUserState(session.personaData.userId)} />
          </div>
        )}
      </main>

      {verificationQuest && (
        <QuestVerificationDialog
          key={verificationQuest.id}
          quest={verificationQuest}
          userId={session.personaData.userId}
          serverBacked={isServerSession(session)}
          onVerified={handleVerifiedQuest}
          onClose={() => setVerificationQuest(null)}
        />
      )}

      {/* 모달 알림 */}
      {modalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div role="dialog" aria-modal="true" aria-labelledby="hq-alert-title" className="hq-alert p-6 max-w-xs w-full text-center space-y-3">
            <div className="flex justify-center text-teal-700">{React.createElement(ALERT_ICONS[modalAlert.emoji || ''] || CheckCheck, { size: 32, strokeWidth: 1.6, 'aria-hidden': true })}</div>
            <h3 id="hq-alert-title" className="text-lg font-bold">{modalAlert.title}</h3>
            <p className="text-sm text-gray-600">{modalAlert.message}</p>
            <button
              onClick={() => setModalAlert(null)}
              className="hq-alert-confirm"
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
