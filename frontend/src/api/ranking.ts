import { apiClient } from './client';
import { ApiResponse } from '@types';

export interface SeasonRankingEntry {
  userId: string;
  personaId?: string;
  name: string;
  level: number;
  points: number;
  rank: number;
}

export const rankingApi = {
  getCurrentSeasonRanking: async (): Promise<ApiResponse<SeasonRankingEntry[]>> => {
    return apiClient.get<SeasonRankingEntry[]>('/ranking/current');
  },
};
