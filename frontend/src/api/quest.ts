/**
 * 퀘스트 API
 */
import { AI_REQUEST_TIMEOUT, apiClient } from './client';
import { DailyQuest, CompleteQuestRequest, ApiResponse } from '@types';

export const questApi = {
  getVerificationQuestion: async (questId: string, userId: string): Promise<ApiResponse<{ question: string }>> => {
    return apiClient.post(`/quests/${questId}/verification`, undefined, { headers: { 'x-user-id': userId }, timeout: AI_REQUEST_TIMEOUT });
  },
  // 일일 퀘스트 조회
  getDailyQuests: async (userId?: string): Promise<ApiResponse<DailyQuest[]>> => {
    return apiClient.get<DailyQuest[]>('/quests/daily', userId ? { headers: { 'x-user-id': userId } } : undefined);
  },

  // 퀘스트 완료
  completeQuest: async (
    questId: string,
    idempotencyKey?: string,
    userId?: string,
    answer = '',
  ): Promise<ApiResponse<DailyQuest>> => {
    const config: CompleteQuestRequest = { questId, answer };
    if (idempotencyKey) config.idempotencyKey = idempotencyKey;
    return apiClient.post<DailyQuest>(`/quests/${questId}/complete`, config, { timeout: AI_REQUEST_TIMEOUT, ...(userId ? { headers: { 'x-user-id': userId } } : {}) });
  },

  // 자정 이후 첫 접속: 오늘 퀘스트 생성 + 스트릭 끊김/방지권 처리
  ensureDailyQuests: async (
    userId: string,
    body: { personaName: string; habits: string[]; note?: string; difficulty?: 'easy' | 'normal' | 'hard' },
  ): Promise<ApiResponse<{ created: boolean; streakReset: boolean; protectionUsed: boolean; quests: DailyQuest[] }>> => {
    return apiClient.post('/quests/daily/ensure', body, { headers: { 'x-user-id': userId }, timeout: AI_REQUEST_TIMEOUT });
  },

  // 리롤 티켓 사용 (서버 저장)
  rerollQuests: async (
    userId: string,
    body: { personaName: string; habits: string[]; note?: string },
  ): Promise<ApiResponse<{ quests: DailyQuest[]; rerollTickets: number; difficulty: 'easy' | 'normal' | 'hard' }>> => {
    return apiClient.post('/quests/reroll', body, { headers: { 'x-user-id': userId }, timeout: AI_REQUEST_TIMEOUT });
  },

  // 퀘스트 히스토리 조회
  getQuestHistory: async (): Promise<ApiResponse<DailyQuest[]>> => {
    return apiClient.get<DailyQuest[]>('/quests/history');
  },
};
