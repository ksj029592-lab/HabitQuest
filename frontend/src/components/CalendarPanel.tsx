import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Coins, Gift, RotateCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import { userApi } from '@api';
import { AchievementCalendar } from '../api/user';
import { getKstDate, shiftActivityMonth } from '../utils/activityDates';
import { Button } from './Button';

export const CalendarPanel = ({ serverBacked, onRefresh }: { serverBacked: boolean; onRefresh: () => Promise<void> }) => {
  const [month, setMonth] = useState(getKstDate().slice(0, 7));
  const [calendar, setCalendar] = useState<AchievementCalendar | null>(null);
  const [selected, setSelected] = useState(getKstDate());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [claiming, setClaiming] = useState<number | null>(null);
  const busy = useRef(false);
  useEffect(() => {
    if (!serverBacked) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setCalendar(null);
    setError('');
    void userApi.getCalendar(month).then((result) => {
      if (!result.success || !result.data) throw new Error(result.error?.message || '캘린더를 불러오지 못했어요.');
      if (!cancelled) {
        const data = result.data;
        setCalendar(data);
        setSelected((current) => data.days.some((day) => day.date === current) ? current : data.month === data.today.slice(0, 7) ? data.today : data.days[0].date);
      }
    }).catch(() => { if (!cancelled) setError('캘린더를 불러오지 못했어요. 서버 연결을 확인해 주세요.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, attempt, serverBacked]);

  const claim = async (days: number) => {
    if (busy.current) return;
    busy.current = true;
    setClaiming(days);
    setError('');
    setMessage('');
    try {
      const result = await userApi.claimDayReward(days);
      if (!result.success || !result.data) throw new Error(result.error?.message || '보상을 받지 못했어요.');
      setCalendar((current) => current && { ...current, rewards: current.rewards.map((reward) => reward.days === days ? { ...reward, status: 'claimed' } : reward) });
      setMessage(result.data.message);
      await onRefresh();
    } catch (failure) {
      setError(isAxiosError(failure) ? failure.response?.data?.message || '보상 수령에 실패했습니다.' : failure instanceof Error ? failure.message : '보상 수령에 실패했습니다.');
    } finally {
      busy.current = false;
      setClaiming(null);
    }
  };
  const day = calendar?.days.find((entry) => entry.date === selected);
  const offset = new Date(`${month}-01T00:00:00Z`).getUTCDay();
  const statusLabel = { achieved: '달성', pending: '진행 중', missed: '미완료', empty: '기록 없음', future: '예정' };

  return <section className="hq-calendar-panel" aria-label="달성 캘린더">
    <div className="hq-period-heading"><h3>{month.replace('-', '년 ')}월</h3><div><button className="hq-icon-button" aria-label="이전 달" title="이전 달" disabled={month === '2000-01'} onClick={() => setMonth((current) => shiftActivityMonth(current, -1))}><ChevronLeft size={18} /></button><button className="hq-text-button" onClick={() => { setMonth(getKstDate().slice(0, 7)); setSelected(getKstDate()); }}>이번 달</button><button className="hq-icon-button" aria-label="다음 달" title="다음 달" disabled={month >= getKstDate().slice(0, 7)} onClick={() => setMonth((current) => shiftActivityMonth(current, 1))}><ChevronRight size={18} /></button></div></div>
    {!serverBacked ? <p className="hq-session-notice">서버 세션에서 달성 캘린더를 확인할 수 있어요.</p> : <>
      {error && <div role="alert" className="hq-verification-error">{error}<button className="hq-text-button" onClick={() => setAttempt((current) => current + 1)}><RotateCw size={14} /> 다시 불러오기</button></div>}
      {message && <p role="status" className="hq-progress-message">{message}</p>}
      {loading ? <p className="hq-activity-loading" role="status">캘린더를 불러오고 있어요.</p> : calendar && <>
        <div className="hq-calendar-layout"><div><div className="hq-calendar-grid hq-weekday-labels">{['일', '월', '화', '수', '목', '금', '토'].map((label) => <span key={label}>{label}</span>)}</div><div className="hq-calendar-grid">
          {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
          {calendar.days.map((entry) => <button key={entry.date} className={`hq-calendar-day ${entry.status} ${entry.date === calendar.today ? 'is-today' : ''}`} aria-pressed={entry.date === selected} aria-label={`${entry.date} ${statusLabel[entry.status]} ${entry.completed}/${entry.total}`} disabled={entry.status === 'future'} onClick={() => setSelected(entry.date)}><strong>{Number(entry.date.slice(-2))}</strong><span>{entry.status === 'achieved' ? <Check size={13} /> : entry.total ? `${entry.completed}/${entry.total}` : ''}</span></button>)}
        </div><div className="hq-calendar-legend"><span><i className="achieved" />달성</span><span><i className="missed" />미완료</span><span><i className="pending" />진행 중</span></div></div>
        <section className="hq-calendar-detail" aria-label="선택한 날짜의 기록"><h4>{selected}</h4><p>{day ? `${statusLabel[day.status]} · ${day.completed}/${day.total} 퀘스트` : '기록 없음'}</p>{day?.quests.length ? day.quests.map((quest) => <article key={quest.id}><h5>{quest.title}</h5><span>{quest.status === 'completed' ? '완료' : '미완료'}</span>{quest.verificationAnswer && <details><summary>성찰 보기</summary><p>{quest.verificationQuestion}</p><p>{quest.verificationAnswer}</p><p className="hq-history-feedback">{quest.verificationFeedback}</p></details>}</article>) : <p className="hq-calendar-empty">이 날짜에는 생성된 퀘스트가 없어요.</p>}</section></div>
        <section className="hq-day-reward-section"><div className="hq-section-heading"><div><p className="hq-eyebrow">CONSISTENCY REWARDS</p><h3>누적 달성일 보상</h3></div><strong>{calendar.achievedDays}일 달성</strong></div><p className="hq-activity-caption">하루 1개 이상 완료한 날 · 같은 날은 한 번만 계산</p><div className="hq-day-reward-grid">{calendar.rewards.map((reward) => <article key={reward.days} className={`hq-day-reward ${reward.status}`}><div><Gift size={18} /><h4>{reward.days}일 달성</h4><span>{reward.status === 'claimed' ? '수령 완료' : reward.status === 'available' ? '수령 가능' : '미달성'}</span></div><p><Coins size={15} /> +{reward.gold} G</p>{reward.items.map((item) => <p key={item.id}>{item.name}</p>)}<progress max={reward.days} value={Math.min(reward.days, calendar.achievedDays)} aria-label={`${reward.days}일 보상 달성 진행률`} /><small>{Math.min(reward.days, calendar.achievedDays)} / {reward.days}일</small><Button size="small" variant={reward.status === 'available' ? 'primary' : 'secondary'} aria-label={`${reward.days}일 달성 보상 받기`} disabled={claiming !== null || reward.status !== 'available'} onClick={() => void claim(reward.days)}>{claiming === reward.days ? '받는 중' : reward.status === 'claimed' ? '받은 보상' : '보상 받기'}</Button></article>)}</div></section>
      </>}
    </>}
  </section>;
};