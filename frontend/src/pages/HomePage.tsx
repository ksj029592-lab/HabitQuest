/**
 * HabitQuest - HomePage (AI-IDEA1 반영: 상단 헤더 통합, AvatarFrame 시각화, 사진 업로드, 요구사항 기반 AI 리롤)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Header, TabBar, Button, AvatarFrame } from '@components';
import { getKstDate } from '../utils/activityDates';
import { PROFILE_DECORATIONS, RewardShop, SPECIAL_AVATAR_ITEMS } from '../components/RewardShop';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { NoticeDialog } from '../components/NoticeDialog';
import { QuestDashboard } from '../components/QuestDashboard';
import { QuestVerificationDialog } from '../components/QuestVerificationDialog';
import { BORDER_STYLES, resolveBorderId, SHOP_BORDER_ITEMS } from '../components/AvatarFrame';
import { DailyQuest, UserSession } from '@types';
import { isAxiosError } from 'axios';
import { applyServerUserState } from '../api/user';
import { ProgressCenter } from '../components/ProgressCenter';
import { ProfileSettings } from '../components/ProfileSettings';
import { ReminderAgent } from '../components/ReminderAgent';
import { connectServerSession } from '../api/connectSession';
import { useSessionStore, useQuestStore } from '@store';
import { questApi, shopApi, userApi, personaApi } from '@api';
import { Award, LogOut, RotateCw, ShieldCheck, UserRound } from 'lucide-react';

type TabId = 'quests' | 'stats' | 'shop' | 'profile' | 'ranking';

const getKstDateKey = getKstDate;

// 로컬(목업) 세션은 sessionId가 'session_'로 시작한다
const isServerSession = (s: { sessionId: string }) => !s.sessionId.startsWith('session_');

const BORDER_ITEMS = SHOP_BORDER_ITEMS;

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
  name !== 'season_grove' && !isAvatarInventoryName(name) && !isBorderInventoryName(name) && !isDecorationInventoryName(name);

export const HomePage: React.FC = () => {
  const session = useSessionStore((state) => state.session);
  return session ? <SessionHome key={session.sessionId} session={session} /> : <Navigate to="/" replace />;
};

const SessionHome = ({ session }: { session: UserSession }) => {
  const navigate = useNavigate();
  const updateGameState = useSessionStore((state) => state.updateGameState);
  const clearSession = useSessionStore((state) => state.clearSession);

  const quests = useQuestStore((state) => state.quests);
  const setQuests = useQuestStore((state) => state.setQuests);

  // Local State
  const [activeTab, setActiveTab] = useState<TabId>('quests');
  const [loading, setLoading] = useState(true);
  const [dailyError, setDailyError] = useState('');
  const [expired, setExpired] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const rerollBusy = useRef(false);
  const [verificationQuest, setVerificationQuest] = useState<DailyQuest | null>(null);
  const [connectionError, setConnectionError] = useState('');
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const shopBusy = useRef(false);
  const [shopPending, setShopPending] = useState(false);
  const [modalAlert, setModalAlert] = useState<{ title: string; message: string } | null>(null);

  // 서버 기준 사용자 상태(골드/경험치/레벨/스트릭/티켓/시즌 포인트)를 세션에 반영
  const syncUserState = useCallback(async (userId: string) => {
    const response = await userApi.getMe(userId);
    if (!response.success || !response.data) throw new Error('사용자 정보를 새로 불러오지 못했어요.');
    applyServerUserState(response.data);
  }, []);

  // KST 날짜가 바뀔 때 일일 퀘스트를 다시 불러오도록 1분마다 날짜 확인
  const [dayKey, setDayKey] = useState<string>(getKstDateKey());
  useEffect(() => {
    const timer = setInterval(() => setDayKey(getKstDateKey()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const userId = session.personaData.userId;

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
          setDailyError('');
          setExpired(false);
          const response = await questApi.ensureDailyQuests(currentSession.personaData.userId, {
            personaName: currentSession.personaData.persona?.name || '초심자',
            habits: prefs?.habits?.length ? prefs.habits : ['건강 관리', '독서와 학습', '마음 챙김'],
            note: prefs?.note || '오늘의 맞춤 퀘스트',
            difficulty: prefs?.difficulty || 'normal',
          });
          if (!isMounted) return;
          if (!response.success || !response.data) throw new Error(response.error?.message || '오늘의 퀘스트를 불러오지 못했어요.');
          {
            setQuests(response.data.quests);
            if (response.data.protectionUsed) {
              setModalAlert({
                title: '방지권 사용',
                message: '어제 퀘스트를 놓쳐 방지권 1개로 연속 기록을 지켰습니다.',
              });
            } else if (response.data.streakReset) {
              setModalAlert({
                title: '연속 기록 초기화',
                message: '퀘스트를 건너뛴 날이 있어 연속 기록이 0일로 돌아갔습니다. 오늘의 퀘스트부터 다시 시작하세요.',
              });
            }
            await syncUserState(currentSession.personaData.userId).catch(() => undefined);
            return;
          }
        } catch (err) {
          if (isMounted) {
            const sessionExpired = isAxiosError(err) && err.response?.status === 401;
            setExpired(sessionExpired);
            setDailyError(sessionExpired ? '세션이 만료됐어요. 다시 시작해 주세요.' : '오늘의 퀘스트를 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
          }
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

  const personaData = session.personaData;
  const todayQuests = quests.filter((quest) => quest.userId === userId && quest.questDateKst === dayKey);

  const handleVerifiedQuest = useCallback((verified: DailyQuest) => {
    const currentSession = useSessionStore.getState().session;
    if (!currentSession || !isServerSession(currentSession) || verified.status !== 'completed' || verified.userId !== currentSession.personaData.userId) return;
    useQuestStore.getState().updateQuest(verified);
    void syncUserState(verified.userId).catch(() => setModalAlert({ title: '완료 기록 저장됨', message: '보상은 서버에 기록됐어요. 잔액을 새로 확인하려면 화면을 다시 불러와 주세요.' }));
  }, [syncUserState]);

  const handleShopAction = useCallback(async (id: string, equip = false) => {
    const current = useSessionStore.getState().session;
    if (!current || !isServerSession(current) || shopBusy.current) return;
    shopBusy.current = true;
    setShopPending(true);
    const { userId } = current.personaData;
    const latestSession = () => useSessionStore.getState().session?.sessionId === current.sessionId;
    let confirmed = false;
    try {
      const result = equip
        ? await userApi.equipCosmetic(id)
        : id === 'protection_ticket'
        ? await shopApi.purchaseProtectionTicket(userId)
        : id === 'reroll_ticket'
        ? await shopApi.purchaseRerollTicket(userId)
        : await userApi.purchaseCosmetic(id);
      if (!result.success || !result.data) throw new Error(result.error?.message || '아이템 요청에 실패했어요.');
      confirmed = true;
      if (!latestSession()) return;
      if (equip && id.startsWith('avatar_')) updateGameState({ avatarUrl: null });
      if ('gold' in result.data) updateGameState({ gold: result.data.gold });
      await syncUserState(userId);
      if (latestSession()) setModalAlert({ title: equip ? '프로필 변경 완료' : '구매 완료', message: equip ? '서버에 저장된 프로필을 불러왔어요.' : '구매한 아이템이 인벤토리에 추가됐어요.' });
    } catch (failure) {
      if (!latestSession()) return;
      const message = isAxiosError(failure) ? failure.response?.data?.message : failure instanceof Error ? failure.message : undefined;
      setModalAlert({
        title: confirmed ? '변경 사항이 서버에 저장됐어요' : '아이템 요청을 확인하지 못했어요',
        message: confirmed ? '인벤토리를 불러오지 못했어요. 화면을 새로고침해 최신 상태를 확인해 주세요.'
          : Array.isArray(message) ? message.join(' ') : message || '연결을 확인한 후, 인벤토리를 새로 불러와 주세요.',
      });
      if (!confirmed && isAxiosError(failure) && !failure.response) void syncUserState(userId).catch(() => undefined);
    } finally {
      shopBusy.current = false;
      setShopPending(false);
    }
  }, [syncUserState, updateGameState]);

  const handleEquipCosmetic = (name: string) => {
    const itemId = personaData.inventory.find((item) => item.name === name)?.itemId;
    const border = getBorderByInventoryName(name);
    void handleShopAction(itemId || (border ? `border_${border.id}` : name), true);
  };

  const handleUseRerollTicket = useCallback(async () => {
    const current = useSessionStore.getState().session;
    if (!current || !isServerSession(current) || rerollBusy.current) return;
    rerollBusy.current = true;
    setRerolling(true);
    const { userId, userPreferences, persona } = current.personaData;
    try {
      const response = await questApi.rerollQuests(userId, {
        personaName: persona.name,
        habits: userPreferences?.habits || [],
        note: userPreferences?.note,
      });
      if (!response.success || !response.data) throw new Error(response.error?.message || '리롤에 실패했습니다.');
      if (useSessionStore.getState().session?.sessionId !== current.sessionId) return;
      const ticketCount = response.data.rerollTickets;
      updateGameState({
        inventory: useSessionStore.getState().session!.personaData.inventory.map((item) =>
          item.itemType === 'reroll_ticket' ? { ...item, quantity: ticketCount } : item),
      });
      setQuests(response.data.quests);
    } catch (error) {
      if (useSessionStore.getState().session?.sessionId !== current.sessionId) return;
      setModalAlert({ title: '리롤을 확인하지 못했어요', message: isAxiosError(error)
        ? '서버에서 리롤이 끝났을 수 있어요. 최신 퀘스트와 티켓 수를 확인한 후 다시 시도해 주세요.'
        : error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.' });
      setConnectionAttempt((value) => value + 1);
    } finally {
      rerollBusy.current = false;
      setRerolling(false);
    }
  }, [setQuests, updateGameState]);

  // 페르소나 세션 종료
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
  const totalAttendance = personaData.totalAttendanceDays ?? 0;
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
          <QuestDashboard persona={personaData} quests={todayQuests} loading={loading} rerolling={rerolling}
            error={dailyError} expired={expired} onRetry={() => setConnectionAttempt((value) => value + 1)}
            onRestart={handleLogout} onReroll={handleUseRerollTicket} onComplete={setVerificationQuest}
            onShop={() => setActiveTab('shop')} />
        )}

        {/* ================= 탭 2: 통계 ================= */}
        {isServerSession(session) && activeTab === 'stats' && (
          <ProgressCenter session={session} onRefresh={() => syncUserState(session.personaData.userId)} />
        )}

        {isServerSession(session) && activeTab === 'shop' && (
          <RewardShop persona={personaData} busy={shopPending} onBuy={handleShopAction} />
        )}

        {/* ================= 탭 4: 프로필 ================= */}
        {isServerSession(session) && activeTab === 'profile' && (
          <div className="hq-legacy hq-profile-page space-y-5">
            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent px-1">
              <UserRound size={20} strokeWidth={1.6} className="inline-block mr-2" aria-hidden="true" />내 프로필
            </h2>

            <div className={'hq-profile-card text-center space-y-4' + (personaData.equippedBackground === 'season_grove' ? ' hq-season-grove' : '')}>
              <ProfilePhoto persona={personaData} onSaved={(replaced) => { if (useSessionStore.getState().session?.sessionId === session.sessionId) updateGameState({ avatarUrl: null, ...(replaced ? { specialAvatarId: null } : {}) }); }} />

              <div>
                <h3 className="text-xl font-extrabold text-white">{personaData.persona?.name}</h3>
                <p className="text-xs text-purple-300 font-medium mt-1">
                  Lv.{currentLevel} • {personaData.equippedTitle || '기본 칭호'}
                </p>
              </div>

              {/* 내 인벤토리 품목 */}
              <div className="pt-4 border-t border-white/10 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-300">코스메틱 인벤토리</h4>
                  <span className="text-[10px] text-slate-500">프로필 꾸미기</span>
                </div>
                {[
                  { label: '배경', items: personaData.inventory.filter((item) => item.itemType === 'cosmetic' && item.name === 'season_grove') },
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
                        const title = /^season_top10_(.+)$/.exec(item.name)?.[1];
                        const label = item.name === 'season_grove' ? '시즌의 숲 배경' : title ? `${title} 시즌 Top 10%` : avatar?.name || border?.name || decoration?.name || item.name;
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
                          ? personaData.equippedTitle === label
                          : avatar
                          ? personaData.specialAvatarId === avatar.id
                          : border
                          ? resolveBorderId(personaData.equippedBorder) === border.id
                          : item.name === 'season_grove' ? personaData.equippedBackground === item.name : personaData.equippedDecoration === decoration?.id;

                        return (
                          <div key={item.name} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2.5">
                            {preview}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">{label}</p>
                              <p className="text-[10px] text-slate-400">{item.quantity}개 보유</p>
                            </div>
                            <button
                              type="button"
                              disabled={shopPending}
                              aria-pressed={equipped}
                              onClick={() => handleEquipCosmetic(item.name)}
                              className={`shrink-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                                equipped
                                  ? 'border-purple-300 bg-purple-500/30 text-purple-100'
                                  : 'border-white/20 bg-white/10 text-slate-200 hover:bg-white/20'
                              }`}
                            >
                              {equipped ? '장착 중 · 해제' : '장착'}
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
          key={`${session.personaData.userId}:${verificationQuest.id}`}
          quest={verificationQuest}
          userId={session.personaData.userId}
          onVerified={handleVerifiedQuest}
          onClose={() => setVerificationQuest(null)}
        />
      )}

      {modalAlert && !verificationQuest && (
        <NoticeDialog title={modalAlert.title} message={modalAlert.message} onClose={() => setModalAlert(null)} />
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
