/**
 * 퀘스트 상태 관리
 */
import { create } from 'zustand';
import { DailyQuest } from '@types';

interface QuestStore {
  quests: DailyQuest[];
  loading: boolean;
  error: string | null;

  setQuests: (quests: DailyQuest[]) => void;
  updateQuest: (quest: DailyQuest) => void;
  completeQuest: (questId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useQuestStore = create<QuestStore>((set) => ({
  quests: [],
  loading: false,
  error: null,

  setQuests: (quests: DailyQuest[]) => set({ quests }),

  updateQuest: (quest: DailyQuest) =>
    set((state) => ({
      quests: state.quests.map((q) => (q.id === quest.id ? quest : q)),
    })),

  completeQuest: (questId: string) =>
    set((state) => ({
      quests: state.quests.map((q) =>
        q.id === questId
          ? { ...q, status: 'completed' }
          : q
      ),
    })),

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}));
