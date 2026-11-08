import type { Prisma, PrismaClient } from '@prisma/client';
import { getCosmetic } from '@/common/game-catalog';
import { seasonDates } from './season-dates';

async function plan(tx: Prisma.TransactionClient, seasonId: string, yearMonth: string) {
  const totals = await tx.rankingPointLog.groupBy({
    by: ['userId'],
    where: { seasonId },
    _sum: { finalPoint: true },
    orderBy: [{ _sum: { finalPoint: 'desc' } }, { userId: 'asc' }],
    having: { finalPoint: { _sum: { gt: 0 } } },
  });
  const previous = await tx.seasonRewardLog.findMany({ where: { seasonId }, select: { userId: true } });
  const alreadyRewarded = new Set(previous.map(({ userId }) => userId));
  const count = totals.length;
  return totals.map(({ userId }, index) => {
    const rank = index + 1;
    const percentileBand = rank <= Math.ceil(count * .01) ? 'top1' : rank <= Math.ceil(count * .10) ? 'top10' : rank <= Math.ceil(count * .30) ? 'top30' : 'participation';
    const rewardValue = { top1: 'border_season_laurel', top10: `season_top10_${yearMonth}`, top30: 'season_grove', participation: '600' }[percentileBand];
    const rewardType = percentileBand === 'participation' ? 'gold' : percentileBand === 'top10' ? 'title' : 'cosmetic';
    return { userId, seasonId, percentileBand, rewardType, rewardValue };
  }).filter(({ userId }) => !alreadyRewarded.has(userId));
}

export async function settleSeason(db: PrismaClient, yearMonth: string, apply: boolean, now = new Date()) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new Error('Use a season in YYYY-MM format.');
  const { endAtKst } = seasonDates(yearMonth);
  if (now < endAtKst) throw new Error('The selected KST season has not ended.');

  return db.$transaction(async (tx) => {
    const season = await tx.rankingSeason.findUnique({ where: { yearMonth } });
    if (!season) throw new Error('The selected season does not exist.');
    if (season.status === 'archived') return { yearMonth, pending: 0, granted: 0, archived: true };

    if (apply) {
      const claimed = await tx.rankingSeason.updateMany({
        where: { id: season.id, status: { in: ['active', 'closed'] } },
        data: { status: 'archived', endAtKst },
      });
      if (!claimed.count) return { yearMonth, pending: 0, granted: 0, archived: true };
    }

    const rewards = await plan(tx, season.id, yearMonth);
    if (apply) {
      for (const reward of rewards.sort((a, b) => a.userId.localeCompare(b.userId))) {
        const { userId, rewardValue, rewardType } = reward;
        await tx.user.update({
          where: { id: userId },
          data: rewardType === 'gold' ? { gold: { increment: Number(rewardValue) } } : { updatedAt: new Date() },
        });
        if (rewardType !== 'gold') {
          const cosmetic = getCosmetic(rewardValue);
          if (!cosmetic) throw new Error('Unknown season cosmetic.');
          const item = { userId, itemType: 'cosmetic', itemId: rewardValue };
          await tx.inventory.upsert({
            where: { userId_itemType_itemId: item },
            update: { quantity: 1 },
            create: { ...item, quantity: 1, rarity: cosmetic.rarity },
          });
        }
        await tx.seasonRewardLog.create({ data: reward });
      }
    }
    return { yearMonth, pending: apply ? 0 : rewards.length, granted: apply ? rewards.length : 0, archived: apply };
  }, { timeout: 60_000 });
}
