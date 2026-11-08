import { useEffect, useState } from 'react';
import { CalendarDays, ChartNoAxesCombined, Flame, Sprout, Target } from 'lucide-react';
import { ActivityDay, ActivityOverview, userApi } from '../api/user';
import { Button } from './Button';

const weekdays = ['월', '화', '수', '목', '금', '토', '일'];

export function DayHeatmap({ days, today }: { days: (ActivityDay & { quests?: { id: string; title: string; status: string }[] })[]; today: string }) {
  const [selected, setSelected] = useState(today);
  const [preview, setPreview] = useState<string | null>(null);
  const offset = (new Date(days[0].date + 'T00:00:00Z').getUTCDay() + 6) % 7;
  const current = days.find((day) => day.date === (preview ?? selected)) ?? days[days.length - 1];
  const level = (day: ActivityDay) => day.total === 0 ? 'empty' : Math.min(day.completed, 3);
  const label = (day: ActivityDay) => day.total ? `${day.completed}개 완료 · ${day.total}개 생성` : '기록 없음';
  return (
    <section className="hq-heatmap-card" aria-labelledby="heatmap-title">
      <div className="hq-section-heading"><div><p className="hq-eyebrow">ACTIVITY MAP · KST</p><h3 id="heatmap-title">최근 30일 활동</h3></div><CalendarDays size={22} aria-hidden="true" /></div>
      <p className="hq-activity-caption">날짜를 선택하면 완료 횟수를 확인할 수 있어요. 진한 색일수록 더 많이 완료한 날이에요.</p>
      <div className="hq-heatmap-grid" aria-label="날짜별 활동">
        {weekdays.map((day) => <span key={day} className="hq-heatmap-weekday" aria-hidden="true">{day}</span>)}
        {Array.from({ length: offset }, (_, index) => <span key={index} aria-hidden="true" />)}
        {days.map((day) => <button type="button" key={day.date} className={`hq-heatmap-day hq-heatmap-${level(day)}`}
          aria-pressed={selected === day.date} aria-current={day.date === today ? 'date' : undefined}
          aria-label={`${day.date} · ${label(day)}`} title={`${day.date} · ${label(day)}`}
          onPointerEnter={() => setPreview(day.date)} onPointerLeave={() => setPreview(null)}
          onFocus={() => setPreview(day.date)} onBlur={() => setPreview(null)}
          onClick={() => setSelected(day.date)}>
          <span>{Number(day.date.slice(-2))}</span><small>{day.total ? day.completed : '–'}</small>
        </button>)}
      </div>
      <div className="hq-heatmap-legend" aria-label="달성 수준">
        {(['기록 없음', '미완료', '1개', '2개', '3개 이상']).map((item, index) => <span key={item}><i className={`hq-heatmap-${index === 0 ? 'empty' : index - 1}`} aria-hidden="true" />{item}</span>)}
      </div>
      <div className="hq-heatmap-detail" aria-live={preview ? 'off' : 'polite'}>
        <time dateTime={current.date}>{current.date}</time><strong>{label(current)}</strong>
      </div>
      {current.quests && <ul className="hq-heatmap-quests">{current.quests.map((quest) => <li key={quest.id}>{quest.status === 'completed' ? '완료' : '미완료'} · {quest.title}</li>)}{!current.quests.length && <li>이 날짜에는 생성된 퀘스트가 없어요.</li>}</ul>}
    </section>
  );
}

export function ActivityOverviewPanel({ totalCompleted, currentStreak }: { totalCompleted: number; currentStreak: number }) {
  const [data, setData] = useState<ActivityOverview>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    setStatus('loading');
    void userApi.getActivityOverview().then((response) => {
      if (!response.success || !response.data) throw new Error('Activity unavailable');
      if (!ignore) { setData(response.data); setStatus('ready'); }
    }).catch(() => { if (!ignore) setStatus('error'); });
    return () => { ignore = true; };
  }, [attempt]);

  if (status === 'loading') return <p className="hq-activity-loading" role="status">활동 기록을 불러오고 있어요.</p>;
  if (status === 'error' || !data) return <div className="hq-empty-state" role="alert"><h3>활동 기록을 불러오지 못했어요.</h3><Button size="small" onClick={() => setAttempt((value) => value + 1)}>다시 불러오기</Button></div>;

  return (
    <div className="hq-activity-overview">
      <div className="hq-activity-metrics">
        {([['최근 7일 달성률', data.last7], ['최근 30일 달성률', data.last30]] as const).map(([name, period]) => (
          <div className="hq-journey-card" key={name}><Target size={18} aria-hidden="true" /><span>{name}</span><strong>{period.rate === null ? '—' : `${period.rate}%`}</strong><small>{period.total ? `${period.completed} / ${period.total}개 완료` : '기록 없음'}</small></div>
        ))}
        <div className="hq-journey-card"><ChartNoAxesCombined size={18} aria-hidden="true" /><span>누적 완료</span><strong>{totalCompleted.toLocaleString()}<small>개</small></strong></div>
        <div className="hq-journey-card"><Flame size={18} aria-hidden="true" /><span>연속 달성</span><strong>{currentStreak}<small>일</small></strong></div>
      </div>
      <div className="hq-activity-highlight"><Sprout size={21} aria-hidden="true" /><div><span>최근 30일 가장 많이 완료한 습관</span><strong>{data.topCategory ? `${data.topCategory.name} · ${data.topCategory.completed}개 완료` : '아직 완료한 습관이 없어요.'}</strong></div></div>
    </div>
  );
}
