import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { Archive, Pencil, Plus, Sprout, X } from 'lucide-react';
import { habitApi, HabitInput, HabitOverview, HabitSchedule, ManagedHabit } from '../api/habits';
import { Button } from './Button';
import { DayHeatmap } from './ActivityOverviewPanel';

const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
const blank: HabitInput = { name: '', description: '', note: '', active: true, mode: 'daily', weekdays: [], weeklyTarget: 7 };
export const scheduleLabel = (schedule: HabitSchedule) => !schedule.active ? '비활성' : schedule.mode === 'daily' ? '매일' : schedule.mode === 'weekly' ? `주 ${schedule.weeklyTarget}회` : schedule.weekdays.map((day) => weekdays[day]).join('·');

export function HabitPanel({ editable = false, onRefresh }: { editable?: boolean; onRefresh?: () => Promise<void> }) {
  const [data, setData] = useState<HabitOverview>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState<HabitInput | null>(null);
  const [editing, setEditing] = useState<string>();
  const [archiving, setArchiving] = useState<string>();
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let ignore = false;
    setStatus('loading');
    void habitApi.list().then((response) => {
      if (!response.success || !response.data) throw new Error('습관 조회 실패');
      if (!ignore) { setData(response.data); setStatus('ready'); }
    }).catch(() => { if (!ignore) setStatus('error'); });
    return () => { ignore = true; };
  }, [attempt]);
  const edit = (habit?: ManagedHabit) => {
    setEditing(habit?.id); setError(''); setMessage('');
    const schedule = habit?.planned ?? habit?.schedule;
    setForm(habit && schedule ? { name: habit.name, description: habit.description, note: habit.note, active: schedule.active, mode: schedule.mode, weekdays: schedule.weekdays, weeklyTarget: schedule.weeklyTarget } : { ...blank });
    requestAnimationFrame(() => document.querySelector('.hq-habit-editor')?.scrollIntoView({ block: 'start' }));
  };
  const mutate = async (action: 'save' | 'archive') => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError(''); setMessage('');
    try {
      if (action === 'save' && form) {
        const result = await habitApi.save(form, editing);
        if (!result.success || !result.data) throw new Error('저장하지 못했어요.');
        setMessage(`저장했어요. 서버에서 확인한 일정 적용일 (KST): ${result.data.effectiveFrom}. 오늘 생성된 퀘스트는 그대로 유지됩니다.`);
        setForm(null);
      } else if (archiving) {
        const result = await habitApi.archive(archiving);
        if (!result.success) throw new Error('보관하지 못했어요.');
        setArchiving(undefined); setMessage('습관을 보관했어요. 과거 기록과 오늘의 퀘스트는 유지됩니다.');
      }
      setAttempt((value) => value + 1);
      try { await onRefresh?.(); } catch { setMessage('습관은 저장됐어요. 프로필의 잔여 정보는 다시 열면 갱신됩니다.'); }
    } catch (failure) {
      const detail = isAxiosError(failure) ? failure.response?.data?.message : failure instanceof Error ? failure.message : '';
      setError(typeof detail === 'string' ? detail : '입력값과 연결 상태를 확인해 주세요. 작성 내용은 유지됩니다.');
    } finally { busy.current = false; setSaving(false); }
  };
  const changeMode = (mode: HabitInput['mode']) => setForm((value) => value && ({ ...value, mode, weekdays: mode === 'weekdays' ? [0, 2, 4] : [], weeklyTarget: mode === 'daily' ? 7 : 3 }));
  const visible = data?.habits.filter((habit) => !editable || showArchived || !habit.archived) ?? [];
  const days = data?.days.map((day) => {
    const quests = day.quests.filter((quest) => !filter || quest.habitId === filter);
    return { ...day, quests, total: quests.length, completed: quests.filter((quest) => quest.status === 'completed').length };
  });
  return <section className="hq-habit-panel" aria-labelledby={editable ? 'habit-manager-title' : 'habit-insights-title'}>
    <div className="hq-settings-heading"><h3 id={editable ? 'habit-manager-title' : 'habit-insights-title'}><Sprout size={20} aria-hidden="true" />{editable ? '나의 습관 관리' : '습관별 실천 기록'}</h3>{editable && <Button size="small" onClick={() => edit()} disabled={saving || status !== 'ready' || (data?.counts?.registered ?? data?.habits.filter(h => !h.archived).length ?? 0) >= 8}><Plus size={16} />습관 추가</Button>}</div>
    <p className="hq-activity-caption">{editable ? '최대 8개 · 요일과 목표는 한국시간 기준입니다. 일정 변경은 다음 날, 주간 목표 변경은 다음 주 월요일부터 적용됩니다.' : '실제 퀘스트 완료 기록입니다. 주간 목표는 완료한 날짜를 한 번씩 세며, 아직 끝나지 않은 주는 실패로 계산하지 않아요.'}</p>
    {editable && data?.counts && <div className="hq-activity-caption" role="status"><p>전체 {data.counts.total}개 (보관 포함) · 활성 {data.counts.active}개 · 오늘 실천 가능 {data.counts.eligible}개 · 하루 최대 {data.counts.maxQuests}개</p><p>{data.counts.eligible > 3 ? `오늘 실천 가능한 습관이 ${data.counts.eligible}개 있습니다. 하루 최대 3개의 퀘스트가 생성되며, 나머지 습관은 순환 배정됩니다.` : '실천 가능한 습관 수만큼 생성됩니다. 3개보다 적어도 정상입니다.'} 오늘 이미 생성한 퀘스트는 바뀌지 않으며, 오늘 완료했거나 주간 목표를 채운 습관은 후보에서 제외됩니다.</p></div>}
    {editable && <label className="hq-habit-switch"><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} /> 보관된 습관 표시</label>}
    {message && <p role="status" className="hq-progress-message">{message}</p>}
    {error && <p role="alert" className="hq-verification-error">{error}</p>}
    {form && <form className="hq-habit-editor" onSubmit={(event) => { event.preventDefault(); void mutate('save'); }} aria-label={editing ? '습관 수정' : '새 습관'}>
      <div className="hq-settings-heading"><h4>{editing ? '습관 수정' : '새 습관'}</h4><button type="button" className="hq-icon-button" aria-label="습관 편집 닫기" disabled={saving} onClick={() => setForm(null)}><X size={18} /></button></div>
      <label>습관 이름<input autoFocus required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={saving} placeholder="예: 영어 공부" /></label>
      <label>실천 목표와 설명<textarea maxLength={500} rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} disabled={saving} placeholder="예: 짧은 영어 문장을 소리 내어 읽기" /></label>
      <label>AI에게 전할 메모<textarea maxLength={500} rows={2} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} disabled={saving} placeholder="예: 퇴근 후 10분, 초급 난이도로" /></label>
      <fieldset disabled={saving}><legend>반복 방식</legend><div className="hq-habit-modes">{([['daily','매일'],['weekdays','요일 지정'],['weekly','주 N회']] as const).map(([value,label]) => <label key={value}><input type="radio" name="habit-repeat" checked={form.mode === value} onChange={() => changeMode(value)} />{label}</label>)}</div></fieldset>
      {form.mode === 'weekdays' && <fieldset disabled={saving}><legend>실천 요일</legend><div className="hq-weekday-picker">{weekdays.map((day,index) => <button type="button" key={day} className="hq-choice-chip" aria-pressed={form.weekdays.includes(index)} onClick={() => { const selected = form.weekdays.includes(index) ? form.weekdays.filter((value) => value !== index) : [...form.weekdays,index].sort(); setForm({ ...form, weekdays: selected, weeklyTarget: selected.length }); }}>{day}</button>)}</div></fieldset>}
      {form.mode === 'weekly' && <label>주간 목표 횟수<select value={form.weeklyTarget} disabled={saving} onChange={(event) => setForm({ ...form, weeklyTarget: Number(event.target.value) })}>{[1,2,3,4,5,6,7].map((value) => <option key={value} value={value}>주 {value}회</option>)}</select><small>월요일~일요일 중 원하는 날에 실천해요.</small></label>}
      <label className="hq-habit-switch"><input type="checkbox" checked={form.active} disabled={saving} onChange={(event) => setForm({ ...form, active: event.target.checked })} />활성화</label>
      <Button type="submit" disabled={saving || !form.name.trim() || form.mode === 'weekdays' && !form.weekdays.length}>{saving ? '저장 중…' : '습관 저장'}</Button>
    </form>}
    {status === 'loading' && <p role="status" className="hq-activity-loading">습관 기록을 불러오고 있어요.</p>}
    {status === 'error' && <div role="alert" className="hq-empty-state"><p>습관 기록을 불러오지 못했어요.</p><Button size="small" onClick={() => setAttempt((value) => value + 1)}>습관 다시 불러오기</Button></div>}
    {status === 'ready' && <>
      {!visible.length && <p className="hq-empty-state">등록한 습관이 없어요. 습관을 추가하면 다음 퀘스트 생성에 반영돼요.</p>}
      <div className="hq-habit-list">{visible.map((habit) => <article key={habit.id} className="hq-habit-card">
        <div className="hq-settings-heading"><h4>{habit.name}{habit.archived && <small> · 보관됨</small>}</h4><span>{scheduleLabel(habit.schedule)}</span></div>
        {habit.description && <p>{habit.description}</p>}
        {habit.planned && <p className="hq-habit-planned">{habit.planned.from}부터 {scheduleLabel(habit.planned)}</p>}
        <div className="hq-habit-goal"><span>이번 주 {habit.stats.weeklyCompleted} / {habit.stats.weeklyTarget}일</span><strong>{habit.stats.weeklyRate === null ? '목표 없음' : `${habit.stats.weeklyRate}%`}</strong></div>
        <progress max={100} value={habit.stats.weeklyRate ?? 0} aria-label={`${habit.name} 주간 목표 달성률`} />
        <dl className="hq-habit-stats"><div><dt>최근 7일</dt><dd>{habit.stats.last7}회</dd></div><div><dt>최근 30일</dt><dd>{habit.stats.last30}회</dd></div><div><dt>누적</dt><dd>{habit.stats.total}회</dd></div><div><dt>연속 / 최고</dt><dd>{habit.stats.streak.current} / {habit.stats.streak.best}{habit.stats.streak.unit}</dd></div></dl>
        <p className="hq-activity-caption">최근 실천: {habit.stats.lastDate ?? '아직 기록 없음'}</p>
        {editable && !habit.archived && <div className="hq-habit-actions"><Button variant="secondary" size="small" onClick={() => edit(habit)} disabled={saving}><Pencil size={14} />수정</Button><button type="button" className="hq-text-button" onClick={() => setArchiving(habit.id)} disabled={saving}><Archive size={14} />보관</button>{archiving === habit.id && <div className="hq-habit-archive"><p>앞으로의 생성에서 제외합니다. 기존 완료 기록은 남아요.</p><Button size="small" onClick={() => void mutate('archive')} disabled={saving}>보관 확정</Button><button type="button" className="hq-text-button" onClick={() => setArchiving(undefined)} disabled={saving}>취소</button></div>}</div>}
      </article>)}</div>
      {!editable && data && days && <><label className="hq-habit-filter">히트맵 습관 필터<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">전체 습관 (보관 기록 포함)</option>{data.habits.map((habit) => <option key={habit.id} value={habit.id}>{habit.name}{habit.archived ? ' · 보관됨' : ''}</option>)}</select></label><DayHeatmap today={data.today} days={days} />{data.mostConsistent && <p className="hq-activity-highlight">최근 30일 가장 꾸준한 습관: {data.habits.find((habit) => habit.id === data.mostConsistent)?.name}</p>}</>}
    </>}
  </section>;
}
