import { ActivityService } from './activity.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('Habit settings, calendar and reminders', () => {
  const tx = {
    user: { update: jest.fn(), findUniqueOrThrow: jest.fn(), updateMany: jest.fn() },
    dayRewardClaim: { findUnique: jest.fn(), create: jest.fn() },
    dailyQuest: { groupBy: jest.fn(), count: jest.fn() },
    inventory: { upsert: jest.fn() },
  };
  const prisma = { user: { update: jest.fn() }, dailyQuest: { findMany: jest.fn(), groupBy: jest.fn() }, dayRewardClaim: { findMany: jest.fn() }, $transaction: jest.fn() };
  let service: ActivityService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-31T12:30:00Z'));
    jest.resetAllMocks();
    prisma.dailyQuest.groupBy.mockResolvedValue([{ questDateKst: '2026-10-29' }, { questDateKst: '2026-10-30' }, { questDateKst: '2026-10-31' }]);
    prisma.dayRewardClaim.findMany.mockResolvedValue([]);
    prisma.dailyQuest.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    tx.user.update.mockResolvedValue({ id: 'user', gold: 1000 });
    tx.dailyQuest.groupBy.mockResolvedValue([{ questDateKst: '2026-10-29' }, { questDateKst: '2026-10-30' }, { questDateKst: '2026-10-31' }]);
    service = new ActivityService(prisma as unknown as PrismaService);
  });
  afterEach(() => jest.useRealTimers());

  it('saves preferences without replacing existing quests', async () => {
    await service.updatePreferences('user', { habits: ['독서와 학습'], note: '매일 5쪽', difficulty: 'easy' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user' }, data: { habits: ['독서와 학습'], note: '매일 5쪽', preferredDifficulty: 'easy' } });
    expect(prisma.dailyQuest.findMany).not.toHaveBeenCalled();
  });

  it('counts a day once and distinguishes partial, missed and future days', async () => {
    prisma.dailyQuest.findMany.mockResolvedValue([
      { questDateKst: '2026-10-30', status: 'completed', id: 'a' },
      { questDateKst: '2026-10-30', status: 'completed', id: 'b' },
      { questDateKst: '2026-10-30', status: 'pending', id: 'c' },
      { questDateKst: '2026-10-28', status: 'pending', id: 'd' },
    ]);
    const calendar = await service.getCalendar('user', '2026-10');
    expect(calendar.days).toHaveLength(31);
    expect(calendar.days.find((day) => day.date === '2026-10-30')).toEqual(expect.objectContaining({ completed: 2, total: 3, status: 'achieved' }));
    expect(calendar.days.find((day) => day.date === '2026-10-28')?.status).toBe('missed');
    expect(calendar.achievedDays).toBe(3);
    expect(calendar.rewards[0].status).toBe('available');
  });

  it('does not grant a milestone early or twice', async () => {
    await expect(service.claimDayReward('user', 7)).rejects.toThrow();
    tx.dayRewardClaim.findUnique.mockResolvedValue({ days: 3 });
    await expect(service.claimDayReward('user', 3)).rejects.toThrow();
    expect(tx.dayRewardClaim.create).not.toHaveBeenCalled();
  });

  it('records the earned day reward atomically', async () => {
    await service.claimDayReward('user', 3);
    expect(tx.dayRewardClaim.create).toHaveBeenCalledWith({ data: { userId: 'user', days: 3 } });
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { gold: { increment: 100 } } }));
  });

  it('notifies only once per KST day and only for unfinished quests after the configured time', async () => {
    tx.user.findUniqueOrThrow.mockResolvedValue({ reminderEnabled: true, reminderTime: '20:00', reminderLastDateKst: null });
    tx.dailyQuest.count.mockResolvedValue(2);
    tx.user.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.checkReminder('user')).resolves.toEqual({ notify: true, pending: 2, date: '2026-10-31' });
    tx.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.checkReminder('user')).resolves.toEqual({ notify: false });
    tx.user.findUniqueOrThrow.mockResolvedValue({ reminderEnabled: true, reminderTime: '22:00', reminderLastDateKst: null });
    await expect(service.checkReminder('user')).resolves.toEqual({ notify: false });
  });

  it('does not notify when disabled or all daily quests are completed', async () => {
    tx.user.findUniqueOrThrow.mockResolvedValueOnce({ reminderEnabled: false, reminderTime: '20:00' });
    await expect(service.checkReminder('user')).resolves.toEqual({ notify: false });
    tx.user.findUniqueOrThrow.mockResolvedValueOnce({ reminderEnabled: true, reminderTime: '20:00' });
    tx.dailyQuest.count.mockResolvedValue(0);
    await expect(service.checkReminder('user')).resolves.toEqual({ notify: false });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
  });

  it('handles leap years and never marks future dates achieved', async () => {
    await expect(service.getCalendar('user', '2024-02')).resolves.toEqual(expect.objectContaining({ days: expect.any(Array) }));
    expect((await service.getCalendar('user', '2024-02')).days).toHaveLength(29);
    expect((await service.getCalendar('user', '2026-02')).days).toHaveLength(28);
    expect((await service.getCalendar('user', '2026-11')).days.every((day) => day.status === 'future')).toBe(true);
    await expect(service.getCalendar('user', '2026-13')).rejects.toThrow();
  });

  it('compares the same elapsed days and uses recorded quest income in weekly reports', async () => {
    prisma.dailyQuest.findMany.mockResolvedValue([
      { questDateKst: '2026-10-30', status: 'completed', category: { name: '독서' }, completionLog: [{ expReward: 50, goldReward: 25, rankingPointAwarded: 10 }] },
      { questDateKst: '2026-10-31', status: 'pending', category: { name: '독서' }, completionLog: [] },
      { questDateKst: '2026-10-19', status: 'pending', category: { name: '독서' }, completionLog: [] },
      { questDateKst: '2026-10-24', status: 'completed', category: { name: '독서' }, completionLog: [{ expReward: 60, goldReward: 30, rankingPointAwarded: 10 }] },
      { questDateKst: '2026-10-25', status: 'completed', category: { name: '독서' }, completionLog: [{ expReward: 60, goldReward: 30, rankingPointAwarded: 10 }] },
    ]);
    const report = await service.getWeeklyReport('user');
    expect(report.start).toBe('2026-10-26');
    expect(report.totals).toEqual({ totalQuests: 2, completedQuests: 1, achievedDays: 1, completionRate: 50, exp: 50, gold: 25, points: 10 });
    expect(report.previous.completedQuests).toBe(1);
    expect(report.days[6].future).toBe(true);
    expect(report.categories[0].name).toBe('독서');
  });

  it('rejects invalid, future and non-Monday weekly report dates', async () => {
    for (const date of ['2026-10-32', '2026-11-02', '2026-10-30']) await expect(service.getWeeklyReport('user', date)).rejects.toThrow();
  });
});