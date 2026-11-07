import { apiClient } from './client';
import { ApiResponse, InventoryItem, PersonaGameState, UserStats } from '@types';
import { useSessionStore } from '../store/sessionStore';

export interface ServerUserState {
  userId: string;
  level: number;
  totalExp: number;
  gold: number;
  streak: {
    currentStreak: number;
    bestStreak: number;
    lastAttendanceDateKst: string | null;
  };
  inventory: InventoryItem[];
  stats: UserStats;
  expPerLevel: number;
  totalAttendanceDays: number;
  avatarIndex: number;
  equippedTitle: string | null;
  equippedBorder: string | null;
  equippedDecoration: string | null;
  equippedBackground?: string | null;
  specialAvatarId: string | null;
  userPreferences: NonNullable<PersonaGameState['userPreferences']>;
  seasonRankingPoints: number;
  todayChecked: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
}

export interface ActivityDay {
  date: string;
  completed: number;
  total: number;
}

type ActivityPeriod = { total: number; completed: number; rate: number | null };

export interface ActivityOverview {
  today: string;
  days: ActivityDay[];
  last7: ActivityPeriod;
  last30: ActivityPeriod;
  topCategory: { name: string; completed: number } | null;
}

export interface AchievementCalendar {
  month: string;
  today: string;
  achievedDays: number;
  days: { date: string; completed: number; total: number; status: 'future' | 'achieved' | 'empty' | 'pending' | 'missed'; quests: import('@types').DailyQuest[] }[];
  rewards: { days: number; gold: number; status: 'locked' | 'available' | 'claimed'; items: LevelTree['milestones'][number]['items'] }[];
}

export interface WeeklyTotals {
  totalQuests: number;
  completedQuests: number;
  achievedDays: number;
  completionRate: number;
  exp: number;
  gold: number;
  points: number;
}

export interface WeeklyReport {
  start: string;
  end: string;
  through: string;
  today: string;
  totals: WeeklyTotals;
  previous: WeeklyTotals;
  categories: (WeeklyTotals & { name: string })[];
  notes: string[];
  days: (WeeklyTotals & { date: string; future: boolean })[];
}

export interface LevelTree {
  level: number;
  totalExp: number;
  expPerLevel: number;
  milestones: {
    level: number;
    name: string;
    gold: number;
    items: { id: string; name: string; slot: string; value: string; rarity: string }[];
    status: 'locked' | 'available' | 'claimed';
  }[];
}

export const applyServerUserState = (server: ServerUserState) => {
  const current = useSessionStore.getState().session?.personaData;
  if (!current || current.userId !== server.userId) return;
  const { todayChecked, streak, ...state } = server;
  useSessionStore.getState().updateGameState({
    ...state,
    streak: { ...streak, lastAttendanceDateKst: streak.lastAttendanceDateKst ?? '' },
    attendance: { ...current.attendance, todayChecked },
  });
};

export const userApi = {
  getPhoto: (userId: string) => apiClient.get<{ jpeg: string | null }>('/users/me/avatar', { headers: { 'x-user-id': userId } }),
  savePhoto: (userId: string, jpeg: string) => apiClient.post<{ jpeg: string | null }>('/users/me/avatar', { jpeg }, { headers: { 'x-user-id': userId } }),
  removePhoto: (userId: string) => apiClient.post<{ jpeg: string | null }>('/users/me/avatar/remove', {}, { headers: { 'x-user-id': userId } }),
  updatePreferences: (input: NonNullable<PersonaGameState['userPreferences']>) => apiClient.post<NonNullable<PersonaGameState['userPreferences']>>('/users/me/preferences', { ...input, note: input.note || '' }),
  updateReminder: (input: { enabled: boolean; time: string }) => apiClient.post<{ enabled: boolean; time: string }>('/users/me/reminders', input),
  checkReminder: () => apiClient.post<{ notify: boolean; pending?: number; date?: string }>('/users/me/reminders/check', {}),
  getActivityOverview: () => apiClient.get<ActivityOverview>('/users/me/activity'),
  getCalendar: (month: string) => apiClient.get<AchievementCalendar>(`/users/me/calendar?month=${encodeURIComponent(month)}`),
  getWeeklyReport: (start?: string) => apiClient.get<WeeklyReport>(`/users/me/weekly-report${start ? `?start=${encodeURIComponent(start)}` : ''}`),
  claimDayReward: (days: number) => apiClient.post<{ days: number; gold: number; message: string }>(`/users/me/day-rewards/${days}/claim`),
  getProgression: () => apiClient.get<LevelTree>('/users/me/progression'),
  getRewardCatalog: () => apiClient.get<LevelTree>('/users/progression/catalog'),
  claimLevelReward: (level: number) => apiClient.post<{ claimedLevel: number; gold: number; message: string }>(`/users/me/level-rewards/${level}/claim`),
  purchaseCosmetic: (itemId: string) => apiClient.post<{ itemId: string; gold: number; name: string }>('/users/me/cosmetics/purchase', { itemId }),
  equipCosmetic: (itemId: string) => apiClient.post<{ itemId: string; equipped: boolean }>('/users/me/equipment', { itemId }),
  getMe: async (userId: string): Promise<ApiResponse<ServerUserState>> => {
    return apiClient.get<ServerUserState>('/users/me', { headers: { 'x-user-id': userId } });
  },
};
