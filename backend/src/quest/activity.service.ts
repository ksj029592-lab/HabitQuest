import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { COSMETICS, DAY_MILESTONES } from '@/common/game-catalog';

type ReportQuest = Prisma.DailyQuestGetPayload<{ include: { category: true; completionLog: true } }>;

const kstDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const shiftDate = (date: string, amount: number) => {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + amount);
  return next.toISOString().slice(0, 10);
};

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  updatePreferences(userId: string, input: { habits: string[]; note: string; difficulty: string }) {
    return this.prisma.user.update({ where: { id: userId }, data: { habits: [...new Set(input.habits.map((habit) => habit.trim()).filter(Boolean))], note: input.note.trim(), preferredDifficulty: input.difficulty } });
  }

  updateReminder(userId: string, input: { enabled: boolean; time: string }) {
    return this.prisma.user.update({ where: { id: userId }, data: { reminderEnabled: input.enabled, reminderTime: input.time } });
  }

  private achievedDates(userId: string, db: PrismaService | Prisma.TransactionClient = this.prisma) {
    return db.dailyQuest.groupBy({ by: ['questDateKst'], where: { userId, status: 'completed', questDateKst: { lte: kstDate() } } });
  }

  async getCalendar(userId: string, month: string) {
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('올바른 연월이 필요합니다.');
    const [year, monthNumber] = month.split('-').map(Number);
    const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const first = `${month}-01`;
    const last = `${month}-${String(dayCount).padStart(2, '0')}`;
    const [quests, achieved, claims] = await Promise.all([
      this.prisma.dailyQuest.findMany({ where: { userId, questDateKst: { gte: first, lte: last } }, orderBy: [{ questDateKst: 'asc' }, { slotNo: 'asc' }] }),
      this.achievedDates(userId),
      this.prisma.dayRewardClaim.findMany({ where: { userId } }),
    ]);
    const today = kstDate();
    const claimed = new Set(claims.map((entry) => entry.days));
    return {
      month,
      today,
      achievedDays: achieved.length,
      days: Array.from({ length: dayCount }, (_, index) => {
        const date = `${month}-${String(index + 1).padStart(2, '0')}`;
        const dayQuests = quests.filter((quest) => quest.questDateKst === date);
        const completed = dayQuests.filter((quest) => quest.status === 'completed').length;
        const status = date > today ? 'future' : completed > 0 ? 'achieved' : dayQuests.length === 0 ? 'empty' : date === today ? 'pending' : 'missed';
        return { date, completed, total: dayQuests.length, status, quests: dayQuests };
      }),
      rewards: DAY_MILESTONES.map((reward) => ({ ...reward, items: reward.itemIds.map((id) => ({ id, ...COSMETICS[id] })), status: claimed.has(reward.days) ? 'claimed' as const : achieved.length >= reward.days ? 'available' as const : 'locked' as const })),
    };
  }

  async claimDayReward(userId: string, days: number) {
    const reward = DAY_MILESTONES.find((entry) => entry.days === days);
    if (!reward) throw new BadRequestException('존재하지 않는 달성일 보상입니다.');
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
      const achieved = await this.achievedDates(userId, tx);
      if (achieved.length < days) throw new BadRequestException(`${days}일을 달성하면 받을 수 있어요.`);
      if (await tx.dayRewardClaim.findUnique({ where: { userId_days: { userId, days } } })) throw new BadRequestException('이미 받은 달성일 보상입니다.');
      await tx.dayRewardClaim.create({ data: { userId, days } });
      for (const itemId of reward.itemIds) {
        await tx.inventory.upsert({ where: { userId_itemType_itemId: { userId, itemType: 'cosmetic', itemId } }, create: { userId, itemType: 'cosmetic', itemId, rarity: COSMETICS[itemId].rarity, quantity: 1 }, update: { quantity: 1 } });
      }
      const user = await tx.user.update({ where: { id: userId }, data: { gold: { increment: reward.gold } } });
      return { days, gold: user.gold, message: `누적 ${days}일 달성 보상을 받았어요!` };
    });
  }

  async checkReminder(userId: string) {
    const today = kstDate();
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (!user.reminderEnabled || user.reminderTime > time || user.reminderLastDateKst === today) return { notify: false };
      const pending = await tx.dailyQuest.count({ where: { userId, questDateKst: today, status: 'pending' } });
      if (!pending) return { notify: false };
      const claimed = await tx.user.updateMany({ where: { id: userId, reminderEnabled: true, reminderTime: user.reminderTime, OR: [{ reminderLastDateKst: null }, { reminderLastDateKst: { not: today } }] }, data: { reminderLastDateKst: today } });
      return claimed.count === 1 ? { notify: true, pending, date: today } : { notify: false };
    });
  }

  async getWeeklyReport(userId: string, start?: string) {
    const today = kstDate();
    const anchor = new Date(`${today}T00:00:00Z`);
    const monday = shiftDate(today, -((anchor.getUTCDay() + 6) % 7));
    const weekStart = start || monday;
    if (!/^20\d{2}-\d{2}-\d{2}$/.test(weekStart) || Number.isNaN(new Date(`${weekStart}T00:00:00Z`).getTime()) || new Date(`${weekStart}T00:00:00Z`).toISOString().slice(0, 10) !== weekStart || weekStart > today || new Date(`${weekStart}T00:00:00Z`).getUTCDay() !== 1) {
      throw new BadRequestException('이번 주 또는 과거 주의 월요일을 선택해 주세요.');
    }
    const end = shiftDate(weekStart, 6);
    const through = end < today ? end : today;
    const elapsed = Math.round((new Date(`${through}T00:00:00Z`).getTime() - new Date(`${weekStart}T00:00:00Z`).getTime()) / 86400000);
    const previousStart = shiftDate(weekStart, -7);
    const previousThrough = shiftDate(previousStart, elapsed);
    const quests = await this.prisma.dailyQuest.findMany({ where: { userId, questDateKst: { gte: previousStart, lte: through } }, include: { category: true, completionLog: true } });
    const current = quests.filter((quest) => quest.questDateKst >= weekStart);
    const previous = quests.filter((quest) => quest.questDateKst >= previousStart && quest.questDateKst <= previousThrough);
    const summarize = (entries: ReportQuest[]) => {
      const completed = entries.filter((quest) => quest.status === 'completed');
      const logs = completed.flatMap((quest) => quest.completionLog);
      return { totalQuests: entries.length, completedQuests: completed.length, achievedDays: new Set(completed.map((quest) => quest.questDateKst)).size, completionRate: entries.length ? Math.round(completed.length / entries.length * 100) : 0, exp: logs.reduce((sum, log) => sum + log.expReward, 0), gold: logs.reduce((sum, log) => sum + log.goldReward, 0), points: logs.reduce((sum, log) => sum + log.rankingPointAwarded, 0) };
    };
    const totals = summarize(current);
    const previousTotals = summarize(previous);
    const categories = [...new Set(current.map((quest) => quest.category.name))].map((name) => ({ name, ...summarize(current.filter((quest) => quest.category.name === name)) }));
    const notes = totals.totalQuests === 0 ? ['이번 주에는 아직 생성된 퀘스트 기록이 없어요.'] : [`${elapsed + 1}일 동안 ${totals.achievedDays}일을 달성하고 ${totals.completedQuests}개의 퀘스트를 마쳤어요.`, previousTotals.totalQuests === 0 ? '지난주 같은 기간의 기록이 없어 직접 비교하지 않았어요.' : totals.completedQuests >= previousTotals.completedQuests ? '지난주 같은 기간만큼 또는 더 많이 실천했어요. 작은 흐름을 이어가 보세요.' : '지난주 같은 기간보다 완료한 퀘스트가 적어요. 부담 없는 습관 한 가지부터 다시 시작해 보세요.'];
    return { start: weekStart, end, through, today, totals, previous: previousTotals, categories, notes, days: Array.from({ length: 7 }, (_, index) => { const date = shiftDate(weekStart, index); return { date, future: date > today, ...summarize(current.filter((quest) => quest.questDateKst === date)) }; }) };
  }
}