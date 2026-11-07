export type Schedule = { mode: 'daily' | 'weekdays' | 'weekly'; weekdays: number[]; weeklyTarget: number; active: boolean };
export type ScheduleVersion = Schedule & { from: string };
export const kstDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export const shiftDate = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const weekday = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday=0
export const weekStart = (date: string) => shiftDate(date, -weekday(date));
export const dailySchedule = (from: string): ScheduleVersion => ({ from, active: true, mode: 'daily', weekdays: [], weeklyTarget: 7 });
export function scheduleAt(history: ScheduleVersion[], date: string) {
  return [...history].reverse().find((entry) => entry.from <= date);
}
export function effectiveDate(history: ScheduleVersion[], next: Schedule, today: string) {
  const previous = scheduleAt(history, today);
  return previous?.mode === 'weekly' || next.mode === 'weekly' ? shiftDate(weekStart(today), 7) : shiftDate(today, 1);
}
export function isDue(schedule: Schedule | undefined, date: string, completedDates: Set<string>) {
  if (!schedule?.active || completedDates.has(date)) return false;
  if (schedule.mode === 'weekdays') return schedule.weekdays.includes(weekday(date));
  if (schedule.mode === 'weekly') return [...completedDates].filter((day) => day >= weekStart(date) && day <= date).length < schedule.weeklyTarget;
  return true;
}
export function streaks(history: ScheduleVersion[], completed: Set<string>, today: string) {
  if (!history.length) return { current: 0, best: 0, unit: '일' };
  let run = 0, best = 0;
  let previousUnit = '';
  const weekly = scheduleAt(history, today)?.mode === 'weekly';
  // Open periods are never failures. Weekly periods are evaluated only after Sunday.
  for (let date = history[0].from; date <= today; date = shiftDate(date, 1)) {
    const schedule = scheduleAt(history, date);
    if (!schedule?.active) continue;
    const unit = schedule.mode === 'weekly' ? 'week' : 'day';
    if (previousUnit && previousUnit !== unit) { run = 0; best = 0; }
    previousUnit = unit;
    if (schedule.mode === 'weekly') {
      if (weekday(date) !== 6 || date >= today) continue;
      const start = weekStart(date);
      const policy = scheduleAt(history, start);
      if (!policy || policy.mode !== 'weekly') continue;
      const count = [...completed].filter((day) => day >= start && day <= date).length;
      run = count >= policy.weeklyTarget ? run + 1 : 0;
    } else {
      if (schedule.mode === 'weekdays' && !schedule.weekdays.includes(weekday(date))) continue;
      if (date === today && !completed.has(date)) continue;
      run = completed.has(date) ? run + 1 : 0;
    }
    best = Math.max(best, run);
  }
  return { current: run, best, unit: weekly ? '주' : '회' };
}
