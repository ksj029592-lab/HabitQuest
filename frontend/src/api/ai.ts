import { AI_REQUEST_TIMEOUT, apiClient } from './client';
import { ApiResponse, DailyQuest } from '@types';

export interface GenerateQuestRequest {
  personaName: string;
  habits: string[];
  note?: string;
  difficulty?: 'easy' | 'normal' | 'hard';
}

export const aiApi = {
  createReflectionQuestion: async (quest: Pick<DailyQuest, 'title' | 'description'>): Promise<ApiResponse<{ question: string }>> => {
    return apiClient.post('/ai/quests/reflection/question', quest, { timeout: AI_REQUEST_TIMEOUT });
  },
  reviewReflection: async (input: Pick<DailyQuest, 'title' | 'description'> & { question: string; answer: string }): Promise<ApiResponse<{ approved: boolean; feedback: string }>> => {
    return apiClient.post('/ai/quests/reflection/review', input, { timeout: AI_REQUEST_TIMEOUT });
  },
  generateQuests: async (request: GenerateQuestRequest): Promise<ApiResponse<DailyQuest[]>> => {
    return apiClient.post<DailyQuest[]>('/ai/quests/generate', request, { timeout: AI_REQUEST_TIMEOUT });
  },
};
