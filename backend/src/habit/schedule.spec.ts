import { dailySchedule, effectiveDate, isDue, kstDate, scheduleAt, shiftDate, streaks, weekStart } from './schedule';

describe('KST habit schedules', () => {
  const daily = dailySchedule('2026-10-01');
  const weekly = { ...daily, mode: 'weekly' as const, weeklyTarget: 3 };
  it('crosses KST midnight, month and year boundaries', () => {
    expect(kstDate(new Date('2026-12-31T14:59:59Z'))).toBe('2026-12-31');
    expect(kstDate(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01');
    expect(shiftDate('2024-02-28', 1)).toBe('2024-02-29');
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
  });
  it('evaluates Monday Wednesday Friday and excludes unscheduled days', () => {
    const policy = { ...daily, mode: 'weekdays' as const, weekdays: [0, 2, 4], weeklyTarget: 3 };
    expect(isDue(policy, '2026-11-02', new Set())).toBe(true);
    expect(isDue(policy, '2026-11-03', new Set())).toBe(false);
    expect(streaks([policy], new Set(['2026-10-30','2026-11-02','2026-11-04']), '2026-11-05').current).toBe(3);
  });
  it('uses distinct practice dates and stops weekly candidates at the goal', () => {
    expect(isDue(weekly, '2026-11-06', new Set(['2026-11-02','2026-11-03']))).toBe(true);
    expect(isDue(weekly, '2026-11-06', new Set(['2026-11-02','2026-11-03','2026-11-04']))).toBe(false);
    expect(isDue(weekly, '2026-11-06', new Set(['2026-11-06']))).toBe(false);
    expect(isDue({ ...daily, active: false }, '2026-11-06', new Set())).toBe(false);
  });
  it('leaves open weeks and unscheduled dates out of failure streaks', () => {
    const policy = { ...weekly, from: '2026-10-26' };
    const dates = new Set(['2026-10-26','2026-10-27','2026-10-30']);
    expect(streaks([policy], dates, '2026-11-06')).toEqual({ current: 1, best: 1, unit: '주' });
    expect(streaks([policy], dates, '2026-11-09').current).toBe(0);
  });
  it('keeps historical policies after edits and starts weekly changes next Monday', () => {
    const next = { ...weekly, weeklyTarget: 5 };
    expect(effectiveDate([daily], next, '2026-11-04')).toBe('2026-11-09');
    expect(effectiveDate([daily], daily, '2026-11-04')).toBe('2026-11-05');
    const history = [daily, { ...next, from: '2026-11-09' }];
    expect(scheduleAt(history, '2026-11-08').weeklyTarget).toBe(7);
    expect(scheduleAt(history, '2026-11-09').weeklyTarget).toBe(5);
  });
});
