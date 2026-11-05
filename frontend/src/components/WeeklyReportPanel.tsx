import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Coins, Trophy, Zap } from 'lucide-react';
import { userApi } from '@api';
import { WeeklyReport } from '../api/user';
import { currentActivityWeek, shiftActivityDate } from '../utils/activityDates';

export const WeeklyReportPanel = ({ serverBacked }: { serverBacked: boolean }) => {
  const [start, setStart] = useState(currentActivityWeek());
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!serverBacked) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    void userApi.getWeeklyReport(start).then((response) => {
      if (!response.success || !response.data) throw new Error('Report unavailable');
      if (!cancelled) setReport(response.data);
    }).catch(() => { if (!cancelled) setError('주간 리포트를 불러오지 못했어요. 서버 연결을 확인해 주세요.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [start, serverBacked]);
  const maximum = Math.max(1, ...(report?.days.map((day) => day.completedQuests) || []));
  return <section className="hq-weekly-report" aria-label="주간 리포트"><div className="hq-period-heading"><h3>{start.slice(5)} ~ {shiftActivityDate(start, 6).slice(5)}</h3><div><button className="hq-icon-button" title="이전 주" aria-label="이전 주" onClick={() => setStart((current) => shiftActivityDate(current, -7))}><ChevronLeft size={18} /></button><button className="hq-text-button" onClick={() => setStart(currentActivityWeek())}>이번 주</button><button className="hq-icon-button" title="다음 주" aria-label="다음 주" disabled={start >= currentActivityWeek()} onClick={() => setStart((current) => shiftActivityDate(current, 7))}><ChevronRight size={18} /></button></div></div>
    {!serverBacked ? <p className="hq-session-notice">서버 세션에서 주간 리포트를 확인할 수 있어요.</p> : loading ? <p role="status" className="hq-activity-loading">주간 기록을 집계하고 있어요.</p> : error ? <p role="alert" className="hq-verification-error">{error}</p> : report && <>
      <div className="hq-progress-metrics"><div><span>퀘스트 완료</span><strong>{report.totals.completedQuests}<small>/ {report.totals.totalQuests}</small></strong></div><div><span>달성한 날</span><strong>{report.totals.achievedDays}<small>일</small></strong></div><div><span>퀘스트 달성률</span><strong>{report.totals.completionRate}%</strong></div></div>
      <p className="hq-activity-caption">{report.through}까지의 기록 · {report.previous.totalQuests ? `지난주 같은 기간 대비 완료 ${report.totals.completedQuests - report.previous.completedQuests >= 0 ? '+' : ''}${report.totals.completedQuests - report.previous.completedQuests}개` : '지난주 비교 기록 없음'}</p>
      <section className="hq-week-chart" aria-label="요일별 완료 퀘스트"><h4>이번 주의 실천</h4><div className="hq-week-bars">{report.days.map((day, index) => <div key={day.date} className={day.future ? 'future' : ''}><span>{day.future ? '-' : day.completedQuests}</span><div className="hq-week-bar-track"><div style={{ height: `${day.completedQuests / maximum * 100}%` }} /></div><strong>{['월', '화', '수', '목', '금', '토', '일'][index]}</strong><small>{day.date.slice(5)}</small></div>)}</div></section>
      <div className="hq-week-income"><span><Zap size={18} /> {report.totals.exp} XP</span><span><Coins size={18} /> {report.totals.gold} G</span><span><Trophy size={18} /> {report.totals.points} PT</span></div>
      <section className="hq-week-insights"><h4>한 주 돌아보기</h4>{report.notes.map((note) => <p key={note}>{note}</p>)}</section>
      <section className="hq-week-categories"><h4>습관별 달성</h4>{report.categories.length ? report.categories.map((category) => <div key={category.name}><span>{category.name}</span><progress max={100} value={category.completionRate} aria-label={`${category.name} 달성률`} /><strong>{category.completedQuests}/{category.totalQuests}</strong></div>) : <p>이번 주에 생성된 습관 기록이 없습니다.</p>}</section>
    </>}
  </section>;
};