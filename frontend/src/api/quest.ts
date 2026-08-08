/**
 * 퀘스트 API
 */
import { apiClient } from './client';
import { DailyQuest, CompleteQuestRequest, ApiResponse } from '@types';

export const questApi = {
  // 일일 퀘스트 조회
  getDailyQuests: async (): Promise<ApiResponse<DailyQuest[]>> => {
    return apiClient.get<DailyQuest[]>('/quests/daily');
  },

  // 퀘스트 완료
  completeQuest: async (
    questId: string,
    idempotencyKey?: string
  ): Promise<ApiResponse<DailyQuest>> => {
    const config: CompleteQuestRequest = { questId };
    if (idempotencyKey) config.idempotencyKey = idempotencyKey;
    return apiClient.post<DailyQuest>(`/quests/${questId}/complete`, config);
  },

  // 퀘스트 히스토리 조회
  getQuestHistory: async (): Promise<ApiResponse<DailyQuest[]>> => {
    return apiClient.get<DailyQuest[]>('/quests/history');
  },
};
