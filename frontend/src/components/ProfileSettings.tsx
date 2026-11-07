import React, { useRef, useState } from 'react';
import { Bell, Check, Save } from 'lucide-react';
import { isAxiosError } from 'axios';
import { UserSession } from '@types';
import { userApi } from '@api';
import { Button } from './Button';
import { HabitPanel } from './HabitPanel';

export const ProfileSettings: React.FC<{ session: UserSession; onRefresh: () => Promise<void> }> = ({ session, onRefresh }) => {
  const preferences = session.personaData.userPreferences;
  const habits = preferences?.habits || [];
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>(preferences?.difficulty || 'normal');
  const [note, setNote] = useState(preferences?.note || '');
  const [enabled, setEnabled] = useState(session.personaData.reminderEnabled || false);
  const [time, setTime] = useState(session.personaData.reminderTime || '20:00');
  const [saving, setSaving] = useState<'habits' | 'reminder' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const serverBacked = !session.sessionId.startsWith('session_');

  const save = async (event: React.FormEvent, kind: 'habits' | 'reminder') => {
    event.preventDefault();
    if (busy.current || !serverBacked) return;
    busy.current = true;
    setSaving(kind);
    setMessage('');
    setError('');
    try {
      let permission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
      if (kind === 'reminder' && enabled && permission === 'default') permission = await Notification.requestPermission();
      const result = kind === 'habits' ? await userApi.updateQuestPreferences({ note, difficulty }) : await userApi.updateReminder({ enabled, time });
      if (!result.success) throw new Error(result.error?.message || '설정을 저장하지 못했어요.');
      await onRefresh();
      setMessage(kind === 'habits' ? '습관 설정을 저장했어요. 오늘의 퀘스트는 유지되고 이후 생성에 반영됩니다.' : !enabled ? '리마인더를 껐어요.' : permission === 'granted' ? `${time} KST 리마인더를 저장했어요.` : '리마인더를 저장했어요. 브라우저 알림 권한이 없어 앱 내 알림으로 표시됩니다.');
    } catch (failure) {
      const detail = isAxiosError(failure) ? failure.response?.data?.message : failure instanceof Error ? failure.message : '';
      setError(Array.isArray(detail) ? '습관과 알림 시간 입력을 다시 확인해 주세요.' : detail || '서버 연결을 확인해 주세요.');
    } finally {
      busy.current = false;
      setSaving(null);
    }
  };

  return <div className="hq-profile-settings">
    <HabitPanel editable onRefresh={onRefresh} />
    <section aria-labelledby="habit-settings-title"><div className="hq-settings-heading"><h3 id="habit-settings-title">습관 설정</h3><span>다음 퀘스트 생성부터 반영</span></div>
      {!serverBacked && <p className="hq-session-notice">데모 세션 · 서버 설정 저장 불가</p>}
      <form onSubmit={(event) => void save(event, 'habits')}>
        <fieldset><legend>기본 난이도</legend><div className="hq-difficulty-settings">{([['easy', '쉬움'], ['normal', '보통'], ['hard', '어려움']] as const).map(([value, label]) => <label key={value}><input type="radio" name="preferred-difficulty" value={value} checked={difficulty === value} disabled={saving !== null} onChange={() => setDifficulty(value)} />{label}</label>)}</div></fieldset>
        <label htmlFor="profile-habit-note">퀘스트 요청 메모</label><textarea id="profile-habit-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} disabled={saving !== null} placeholder="예: 퇴근 후 10분 정도 운동하고 싶어요" />
        <Button type="submit" disabled={!serverBacked || habits.length > 8 || saving !== null}><Save size={16} />{saving === 'habits' ? '저장 중' : '퀘스트 기본 설정 저장'}</Button>
      </form>
    </section>
    <section aria-labelledby="reminder-settings-title"><div className="hq-settings-heading"><h3 id="reminder-settings-title"><Bell size={18} /> 리마인더</h3><span>앱이 열린 동안 · 한국시간</span></div>
      <form onSubmit={(event) => void save(event, 'reminder')}><label className="hq-reminder-switch"><input type="checkbox" role="switch" checked={enabled} disabled={saving !== null} onChange={(event) => setEnabled(event.target.checked)} />미완료 퀘스트 알림</label><label htmlFor="profile-reminder-time">알림 시간 (KST)</label><input type="time" id="profile-reminder-time" value={time} onChange={(event) => setTime(event.target.value)} disabled={!enabled || saving !== null} required /><Button type="submit" disabled={!serverBacked || saving !== null}><Save size={16} />{saving === 'reminder' ? '저장 중' : '리마인더 저장'}</Button></form>
    </section>
    {message && <p role="status" className="hq-progress-message"><Check size={16} />{message}</p>}{error && <p role="alert" className="hq-verification-error">{error}</p>}
  </div>;
};
