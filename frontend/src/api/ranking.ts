import { apiClient } from './client';
import { ApiResponse } from '@types';

export interface SeasonRankingEntry {
  userId: string;
  personaId?: string;
  name: string;
  level: number;
  points: number;
  rank: number;
  avatarIndex?: number;
  specialAvatarId?: string | null;
  equippedTitle?: string | null;
  equippedBorder?: string | null;
  equippedDecoration?: string | null;
}

export interface SeasonPeriod {
  yearMonth: string;
  startAt: string;
  endAt: string;
}

export type SeasonRankingResponse = ApiResponse<SeasonRankingEntry[]> & { season?: SeasonPeriod };

export interface SeasonReward { id: string; month: string; band: string; label: string }

export interface SeasonResult { yearMonth: string; startAt: string; endAt: string; state: 'active'|'pending'|'rewarded'|'not_rewarded'|'no_participation'; rank: number|null; points: number; rewards: {id:string;label:string;grantedAt:string}[] }
export const rankingApi = {
  getResults: () => apiClient.get<SeasonResult[]>('/ranking/results'),
  getRewards: () => apiClient.get<SeasonReward[]>('/ranking/rewards'),
  getCurrentSeasonRanking: async (): Promise<SeasonRankingResponse> => {
    return apiClient.get<SeasonRankingEntry[]>('/ranking/current');
  },
};
