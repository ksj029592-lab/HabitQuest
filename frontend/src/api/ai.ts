import { apiClient } from './client';
import { ApiResponse, DailyQuest } from '@types';

export interface GenerateQuestRequest {
  personaName: string;
  habits: string[];
  note?: string;
  difficulty?: 'easy' | 'normal' | 'hard';
}

export const aiApi = {
  generateQuests: async (request: GenerateQuestRequest): Promise<ApiResponse<DailyQuest[]>> => {
    return apiClient.post<DailyQuest[]>('/ai/quests/generate', request);
  },
};
