import { UserSession } from '@types';
import { personaApi } from './persona';
import { useQuestStore } from '../store/questStore';

const connections = new Map<string, Promise<UserSession>>();

export const connectServerSession = (session: UserSession): Promise<UserSession> => {
  const existing = connections.get(session.sessionId);
  if (existing) return existing;
  const connection = (async () => {
    localStorage.setItem(`habitquest-legacy-backup-${session.sessionId}`, JSON.stringify({ session, quests: useQuestStore.getState().quests }));
    const preferences = session.personaData.userPreferences;
    const response = await personaApi.selectPersona(session.personaData.persona.role || session.personaId, {
      habits: preferences?.habits?.length ? preferences.habits : ['독서와 학습'],
      note: preferences?.note || '',
      difficulty: preferences?.difficulty || 'normal',
    });
    if (!response.success || !response.data) throw new Error(response.error?.message || '실제 서버 세션 연결에 실패했어요.');
    return { ...response.data, lastActivityAt: new Date().toISOString(), personaData: { ...response.data.personaData, userPreferences: preferences } };
  })();
  connections.set(session.sessionId, connection);
  connection.catch(() => connections.delete(session.sessionId));
  return connection;
};