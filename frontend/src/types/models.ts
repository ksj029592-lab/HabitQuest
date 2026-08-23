/**
 * HabitQuest 데이터 모델 및 API 타입 정의
 */

/** 테스트 페르소나 */
export interface TestPersona {
  id: string;
  name: string;
  initialLevel: number;
  initialGold: number;
  initialStreak: number;
  initialStats: {
    bestStreak: number;
    totalQuestsCompleted: number;
    monthlySuccessRate: number;
  };
  itemsPreset: InventoryItem[];
  role: 'beginner' | 'active' | 'advanced';
  avatarIndex: number;
  equippedTitle: string | null;
  equippedBorder: string | null;
  protectionTickets: number;
}

/** 사용자 세션 */
export interface UserSession {
  sessionId: string;
  personaId: string;
  startedAt: string; // ISO8601
  lastActivityAt: string; // ISO8601
  personaData: PersonaGameState;
}

/** 페르소나의 게임 상태 */
export interface PersonaGameState {
  userId: string;
  persona: TestPersona;
  level: number;
  totalExp: number;
  gold: number;
  streak: StreakData;
  attendance: AttendanceData;
  inventory: InventoryItem[];
  stats: UserStats;
  seasonRankingPoints?: number;
  avatarIndex?: number;
  equippedTitle?: string | null;
  equippedBorder?: string | null;
  equippedDecoration?: string | null;
}

/** 연속 달성 데이터 */
export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastAttendanceDateKst: string; // YYYY-MM-DD
}

/** 출석 데이터 */
export interface AttendanceData {
  todayChecked: boolean;
  lastSevenDaysKst: {
    date: string; // YYYY-MM-DD
    checked: boolean;
  }[];
}

/** 인벤토리 아이템 */
export interface InventoryItem {
  itemType: 'protection_ticket' | 'reroll_ticket' | 'cosmetic';
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  name: string;
}

/** 사용자 통계 */
export interface UserStats {
  monthlySuccessRate: number;
  totalQuestsCompleted: number;
  averageStreakLength: number;
  thisMonthQuestsCompleted: number;
}

/** 일일 퀘스트 */
export interface DailyQuest {
  id: string;
  userId: string;
  categoryId: string;
  questDateKst: string; // YYYY-MM-DD
  difficulty: 'easy' | 'normal' | 'hard';
  title: string;
  description: string;
  status: 'pending' | 'completed';
  expReward: number;
  goldReward: number;
  completedAt?: string; // ISO8601
  slotNo: 0 | 1 | 2;
}

/** 습관 카테고리 */
export interface HabitCategory {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
}

/** 상점 아이템 */
export interface ShopItem {
  id: string;
  name: string;
  itemType: 'protection_ticket' | 'reroll_ticket' | 'cosmetic';
  price: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
}

/** 랭킹 정보 */
export interface RankingInfo {
  userId: string;
  userName: string;
  points: number;
  rank: number;
  percentile: number; // 0-100
  rewardsTier: 'top1' | 'top10' | 'top30' | 'participation' | 'none';
}

/** API 응답 래퍼 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/** 페르소나 선택 요청 */
export interface SelectPersonaRequest {
  personaId: string;
}

/** 퀘스트 완료 요청 */
export interface CompleteQuestRequest {
  questId: string;
  idempotencyKey?: string;
}

/** 상점 구매 요청 */
export interface PurchaseItemRequest {
  itemId: string;
  quantity: number;
  idempotencyKey?: string;
}

/** 방지권 사용 요청 */
export interface UseProtectionTicketRequest {
  idempotencyKey?: string;
}
