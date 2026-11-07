/**
 * 페르소나 API
 */
import { AI_REQUEST_TIMEOUT, apiClient } from './client';
import { TestPersona, UserSession, SelectPersonaRequest, ApiResponse } from '@types';

export type PersonaPreset = Pick<TestPersona, 'id' | 'name' | 'role' | 'initialLevel' | 'initialGold' | 'initialStreak'>
  & TestPersona['initialStats'];

export const personaApi = {
  // 페르소나 목록 조회
  getPersonas: async (): Promise<ApiResponse<PersonaPreset[]>> => {
    return apiClient.get<PersonaPreset[]>('/personas');
  },

  // 페르소나 선택 및 세션 시작
  selectPersona: async (personaId: string, preferences?: Omit<SelectPersonaRequest, 'personaId'>): Promise<ApiResponse<UserSession>> => {
    return apiClient.post<UserSession>('/session/start', {
      personaId,
      ...preferences,
    }, { timeout: AI_REQUEST_TIMEOUT });
  },

  // 현재 세션 정보 조회
  getCurrentSession: async (): Promise<ApiResponse<UserSession>> => {
    return apiClient.get<UserSession>('/session/current');
  },

  // 세션 종료
  endSession: async (): Promise<ApiResponse<void>> => {
    return apiClient.post<void>('/session/end');
  },
};
