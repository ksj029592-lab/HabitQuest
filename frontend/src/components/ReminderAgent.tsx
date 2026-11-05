import { useEffect, useRef } from 'react';
import { UserSession } from '@types';
import { userApi } from '@api';

export const ReminderAgent = ({ session, onReminder }: { session: UserSession; onReminder: (pending: number) => void }) => {
  const callback = useRef(onReminder);
  callback.current = onReminder;
  useEffect(() => {
    if (session.sessionId.startsWith('session_') || !session.personaData.reminderEnabled) return;
    let cancelled = false;
    let checking = false;
    const check = async () => {
      if (checking || cancelled) return;
      checking = true;
      try {
        const result = await userApi.checkReminder();
        if (!cancelled && result.success && result.data?.notify) {
          const pending = result.data.pending || 0;
          callback.current(pending);
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try { new Notification('HabitQuest · 오늘의 작은 실천', { body: `오늘 아직 ${pending}개의 퀘스트가 남아 있어요.`, tag: `habitquest-${result.data.date}` }); } catch { console.warn('Browser notification unavailable; in-app reminder is active'); }
          }
        }
      } catch {
        return;
      } finally {
        checking = false;
      }
    };
    void check();
    const timer = setInterval(() => void check(), 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [session.sessionId, session.personaData.reminderEnabled, session.personaData.reminderTime]);
  return null;
};