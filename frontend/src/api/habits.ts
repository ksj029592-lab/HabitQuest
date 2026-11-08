import { apiClient } from './client';
export type HabitSchedule = { mode: 'daily' | 'weekdays' | 'weekly'; active: boolean; weekdays: number[]; weeklyTarget: number; from?: string };
export type HabitInput = HabitSchedule & { name: string; description: string; note: string };
export type ManagedHabit = {
  id: string; name: string; description: string; note: string; archived: boolean;
  schedule: HabitSchedule; planned: (HabitSchedule & { from: string }) | null;
  stats: { last7: number; last30: number; total: number; lastDate: string | null; weeklyCompleted: number; weeklyTarget: number; weeklyRate: number | null; streak: { current: number; best: number; unit: string } };
};
export type HabitOverview = {
  today: string; counts?: { total: number; registered: number; active: number; eligible: number; maxQuests: number }; habits: ManagedHabit[]; mostConsistent: string | null;
  days: { date: string; total: number; completed: number; quests: { id: string; habitId: string; title: string; status: string }[] }[];
};
export const habitApi = {
  list: () => apiClient.get<HabitOverview>('/habits'),
  save: (input: HabitInput, id?: string) => apiClient.post<{ id: string; effectiveFrom: string }>(id ? `/habits/${encodeURIComponent(id)}` : '/habits', input),
  archive: (id: string) => apiClient.post<{ archived: boolean }>(`/habits/${encodeURIComponent(id)}/archive`),
};
