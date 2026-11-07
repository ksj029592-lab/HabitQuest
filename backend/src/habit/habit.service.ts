import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { dailySchedule, effectiveDate, isDue, kstDate, Schedule, ScheduleVersion, scheduleAt, shiftDate, streaks, weekStart, weekday } from './schedule';

export type HabitInput = Schedule & { name: string; description: string; note: string };
export const historyOf = (value: Prisma.JsonValue) => value as unknown as ScheduleVersion[];
export async function createInitialHabits(tx: Prisma.TransactionClient, userId: string, names: string[], date: string) {
  const result = [];
  for (const name of names) result.push(await tx.userHabit.create({ data: {
    userId, name, scheduleHistory: [dailySchedule(date)] as unknown as Prisma.InputJsonValue,
  } }));
  return result;
}

@Injectable()
export class HabitService {
  constructor(private readonly prisma: PrismaService) {}

  private validate(input: HabitInput) {
    if (!input.name.trim()) throw new BadRequestException('습관 이름을 입력해 주세요.');
    if (input.mode === 'weekdays' && (!input.weekdays.length || new Set(input.weekdays).size !== input.weekdays.length)) throw new BadRequestException('중복 없이 실천 요일을 선택해 주세요.');
    if (input.mode !== 'weekdays' && input.weekdays.length) throw new BadRequestException('요일 지정 방식에서만 실천 요일을 선택할 수 있어요.');
    if (input.mode !== 'weekly' && input.weeklyTarget !== (input.mode === 'daily' ? 7 : input.weekdays.length)) throw new BadRequestException('주간 목표가 반복 일정과 일치하지 않아요.');
  }

  async save(userId: string, input: HabitInput, id?: string) {
    this.validate(input);
    const today = kstDate();
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
      const habits = await tx.userHabit.findMany({ where: { userId } });
      const existing = id ? habits.find((habit) => habit.id === id && !habit.archived) : undefined;
      if (id && !existing) throw new BadRequestException('수정할 습관을 찾을 수 없어요.');
      if (habits.some((habit) => !habit.archived && habit.id !== id && habit.name.toLowerCase() === input.name.trim().toLowerCase())) throw new BadRequestException('같은 이름의 습관이 있어요.');
      if (!id && (habits.filter((habit) => !habit.archived).length >= 8 || habits.length >= 64)) throw new BadRequestException('습관은 8개까지 관리할 수 있어요.');
      const history = existing ? historyOf(existing.scheduleHistory) : [];
      const next = { active: input.active, mode: input.mode, weekdays: [...input.weekdays].sort(), weeklyTarget: input.weeklyTarget };
      const previous = history.at(-1);
      const same = previous && JSON.stringify({ active: previous.active, mode: previous.mode, weekdays: previous.weekdays, weeklyTarget: previous.weeklyTarget }) === JSON.stringify(next);
      const from = !existing ? today : same ? previous.from : effectiveDate(history, next, today);
      const versions = same ? history : [...history.filter((version) => version.from < from), { from, ...next }];
      const data = { name: input.name.trim(), description: input.description.trim(), note: input.note.trim(), scheduleHistory: versions as unknown as Prisma.InputJsonValue };
      const saved = existing ? await tx.userHabit.update({ where: { id }, data }) : await tx.userHabit.create({ data: { ...data, userId } });
      // Legacy clients keep the same preference shape; managed habits remain the source of truth.
      await tx.user.update({ where: { id: userId }, data: { habits: [...habits.filter((habit) => !habit.archived && habit.id !== id).map((habit) => habit.name), saved.name] } });
      return { id: saved.id, effectiveFrom: from };
    });
  }

  async archive(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
      const habit = await tx.userHabit.findFirst({ where: { id, userId, archived: false } });
      if (!habit) throw new BadRequestException('보관할 습관을 찾을 수 없어요.');
      const history = historyOf(habit.scheduleHistory), tomorrow = shiftDate(kstDate(), 1);
      const policy = scheduleAt(history, kstDate()) ?? dailySchedule(kstDate());
      const versions = [...history.filter((version) => version.from < tomorrow), { ...policy, active: false, from: tomorrow }];
      const changed = await tx.userHabit.updateMany({ where: { id, userId, archived: false }, data: { archived: true, scheduleHistory: versions as unknown as Prisma.InputJsonValue } });
      if (!changed.count) throw new BadRequestException('보관할 습관을 찾을 수 없어요.');
      const remaining = await tx.userHabit.findMany({ where: { userId, archived: false } });
      await tx.user.update({ where: { id: userId }, data: { habits: remaining.map((habit) => habit.name) } });
      return { archived: true };
    });
  }

  async candidates(userId: string, now = new Date()) {
    const today = kstDate(now);
    const [habits, completed, recent] = await Promise.all([
      this.prisma.userHabit.findMany({ where: { userId, archived: false }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      this.prisma.dailyQuest.findMany({ where: { userId, status: 'completed', questDateKst: { gte: weekStart(today), lte: today } }, select: { habitId: true, questDateKst: true } }),
      this.prisma.dailyQuest.findMany({ where: { userId, questDateKst: { gte: shiftDate(today, -7), lte: today } }, select: { title: true, habitId: true, questDateKst: true }, orderBy: { questDateKst: 'desc' }, take: 30 }),
    ]);
    return habits.filter((habit) => isDue(scheduleAt(historyOf(habit.scheduleHistory), today), today, new Set(completed.filter((quest) => quest.habitId === habit.id).map((quest) => quest.questDateKst))))
      .sort((a, b) => {
        const last = (id: string) => recent.find((quest) => quest.habitId === id)?.questDateKst ?? '';
        return last(a.id).localeCompare(last(b.id)) || a.id.localeCompare(b.id);
      }).map((habit) => ({ ...habit, schedule: scheduleAt(historyOf(habit.scheduleHistory), today)!, recentTitles: recent.filter((quest) => quest.habitId === habit.id).map((quest) => quest.title) }));
  }

  async overview(userId: string, habitId?: string, now = new Date()) {
    const today = kstDate(now), start = shiftDate(today, -29), monday = weekStart(today);
    const [habits, quests] = await Promise.all([
      this.prisma.userHabit.findMany({ where: { userId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      this.prisma.dailyQuest.findMany({ where: { userId, habitId: { not: null }, questDateKst: { lte: today } }, select: { id: true, habitId: true, habitSnapshot: true, title: true, status: true, questDateKst: true } }),
    ]);
    if (habitId && !habits.some((habit) => habit.id === habitId)) throw new BadRequestException('습관을 찾을 수 없어요.');
    const items = habits.map((habit) => {
      const history = historyOf(habit.scheduleHistory), current = scheduleAt(history, today);
      const records = quests.filter((quest) => quest.habitId === habit.id && quest.status === 'completed');
      const dates = new Set(records.map((quest) => quest.questDateKst));
      const weeklyDates = [...dates].filter((date) => date >= monday);
      const target = current?.mode === 'weekly' ? current.active ? current.weeklyTarget : 0 : Array.from({ length: 7 }, (_, index) => shiftDate(monday, index)).filter((date) => {
        const policy = scheduleAt(history, date);
        return policy?.active && (policy.mode === 'daily' || policy.mode === 'weekdays' && policy.weekdays.includes(weekday(date)));
      }).length;
      const eligibleWeekDates = current?.mode === 'weekly' ? weeklyDates : weeklyDates.filter((date) => {
        const policy = scheduleAt(history, date);
        return policy?.active && (policy.mode === 'daily' || policy.mode === 'weekdays' && policy.weekdays.includes(weekday(date)));
      });
      return { id: habit.id, name: habit.name, description: habit.description, note: habit.note, archived: habit.archived, schedule: current ?? history[0], planned: history.find((version) => version.from > today) ?? null,
        stats: { last7: records.filter((quest) => quest.questDateKst >= shiftDate(today, -6)).length, last30: records.filter((quest) => quest.questDateKst >= start).length, practiceDays30: [...dates].filter((date) => date >= start).length, total: records.length, lastDate: [...dates].sort().at(-1) ?? null, weeklyCompleted: eligibleWeekDates.length, weeklyTarget: target, weeklyRate: target ? Math.min(100, Math.round(eligibleWeekDates.length / target * 100)) : null, streak: streaks(history, dates, today) } };
    });
    const filtered = quests.filter((quest) => !habitId || quest.habitId === habitId);
    const days = Array.from({ length: 30 }, (_, index) => {
      const date = shiftDate(start, index), entries = filtered.filter((quest) => quest.questDateKst === date);
      return { date, total: entries.length, completed: entries.filter((quest) => quest.status === 'completed').length, quests: entries.map(({ id, habitId, title, status }) => ({ id, habitId, title, status })) };
    });
    return { today, habits: items, days, mostConsistent: [...items].filter((habit) => habit.stats.practiceDays30 > 0).sort((a, b) => b.stats.practiceDays30 - a.stats.practiceDays30 || a.name.localeCompare(b.name, 'ko'))[0]?.id ?? null };
  }
}
