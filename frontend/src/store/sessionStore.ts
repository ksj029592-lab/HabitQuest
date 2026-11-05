/**
 * 페르소나/세션 상태 관리
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TestPersona, UserSession, PersonaGameState, DailyQuest } from '@types';

interface SessionStore {
  session: UserSession | null;
  isSessionActive: boolean;

  setSession: (session: UserSession) => void;
  clearSession: () => void;
  updateGameState: (state: Partial<PersonaGameState>) => void;

  // 빠른 액세스
  currentPersona: () => TestPersona | null;
  currentGameState: () => PersonaGameState | null;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
  session: null,
  isSessionActive: false,

  setSession: (session: UserSession) =>
    set({
      session,
      isSessionActive: true,
    }),

  clearSession: () =>
    set({
      session: null,
      isSessionActive: false,
    }),

  updateGameState: (newState: Partial<PersonaGameState>) =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          personaData: {
            ...state.session.personaData,
            ...newState,
          },
        },
      };
    }),

  currentPersona: () => get().session?.personaData.persona || null,
  currentGameState: () => get().session?.personaData || null,
    }),
    {
      name: 'habitquest-session',
      partialize: (state) => ({ session: state.session, isSessionActive: state.isSessionActive }),
    },
  ),
);
