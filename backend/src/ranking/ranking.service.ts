import { Injectable } from '@nestjs/common';
import { getRankingPointReward } from '@/common/ranking-points';
import { PrismaService } from '@/prisma/prisma.service';
import { seasonDates } from './season-dates';
import { getCosmetic } from '@/common/game-catalog';
import { Prisma } from '@prisma/client';

@Injectable()
export class RankingService {
  constructor(private prisma: PrismaService) {}

  async getCurrentSeasonRanking() {
    const season = await this.ensureCurrentSeason();
    const totals = await this.prisma.rankingPointLog.groupBy({
      by: ['userId'],
      where: { seasonId: season.id },
      _sum: { finalPoint: true },
      orderBy: [{ _sum: { finalPoint: 'desc' } }, { userId: 'asc' }],
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: totals.map((entry) => entry.userId) } },
      select: { id: true, personaId: true, level: true, avatarIndex: true, specialAvatarId: true, equippedTitle: true, equippedBorder: true, equippedDecoration: true },
    });
    const personas = await this.prisma.testPersona.findMany({
      where: { id: { in: users.map((user) => user.personaId) } },
    });
    const userById = new Map(users.map((user) => [user.id, user]));
    const personaById = new Map(personas.map((persona) => [persona.id, persona]));

    const entries = totals.map((entry, index) => {
      const user = userById.get(entry.userId);
      const persona = user ? personaById.get(user.personaId) : undefined;
      return {
        userId: entry.userId,
        personaId: user?.personaId,
        name: persona?.name || '퀘스터',
        level: user?.level || 1,
        points: entry._sum.finalPoint || 0,
        avatarIndex: user?.avatarIndex ?? 0,
        specialAvatarId: user?.specialAvatarId,
        equippedTitle: user?.equippedTitle,
        equippedBorder: user?.equippedBorder,
        equippedDecoration: user?.equippedDecoration,
        rank: index + 1,
      };
    });
    return { entries, season: { yearMonth: season.yearMonth, startAt: season.startAtKst, endAt: season.endAtKst } };
  }

  async ensureCurrentSeason(tx: PrismaService | Prisma.TransactionClient = this.prisma, now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const yearMonth = `${values.year}-${values.month}`;
    const { startAtKst, endAtKst } = seasonDates(yearMonth);
    const existing = await tx.rankingSeason.findUnique({ where: { yearMonth } });
    if (existing?.endAtKst.getTime() === endAtKst.getTime()) return existing;

    return tx.rankingSeason.upsert({
      where: { yearMonth },
      update: { endAtKst },
      create: {
        yearMonth,
        startAtKst,
        endAtKst,
        status: 'active',
      },
    });
  }

  async getSeasonRewards(userId: string) {
    const rewards = await this.prisma.seasonRewardLog.findMany({
      where: { userId },
      orderBy: [{ grantedAt: 'desc' }, { id: 'desc' }],
      take: 24,
      include: { season: { select: { yearMonth: true } } },
    });
    return rewards.map((reward) => ({
      id: reward.id,
      month: reward.season.yearMonth,
      band: reward.percentileBand,
      label: reward.rewardType === 'gold' ? `${reward.rewardValue} G` : getCosmetic(reward.rewardValue)?.name ?? reward.rewardValue,
    }));
  }

  async getSeasonResults(userId: string, now = new Date()) {
    const seasons = await this.prisma.rankingSeason.findMany({ orderBy: { yearMonth: 'desc' }, take: 12 });
    return Promise.all(seasons.map(async season => {
      const { startAtKst, endAtKst } = seasonDates(season.yearMonth);
      const [totals, rewards] = await Promise.all([
        this.prisma.rankingPointLog.groupBy({ by: ['userId'], where: { seasonId: season.id }, _sum: { finalPoint: true }, orderBy: [{ _sum: { finalPoint: 'desc' } }, { userId: 'asc' }] }),
        this.prisma.seasonRewardLog.findMany({ where: { seasonId: season.id, userId }, orderBy: { grantedAt: 'asc' } }),
      ]);
      const participants = totals.filter(row => (row._sum.finalPoint ?? 0) > 0);
      const index = participants.findIndex(row => row.userId === userId);
      const ended = now >= endAtKst;
      const settled = season.status === 'archived';
      return { yearMonth: season.yearMonth, startAt: startAtKst, endAt: endAtKst,
        state: !ended ? 'active' : !settled ? 'pending' : index < 0 ? 'no_participation' : rewards.length ? 'rewarded' : 'not_rewarded',
        rank: index < 0 ? null : index + 1, points: index < 0 ? 0 : participants[index]._sum.finalPoint,
        rewards: rewards.map(reward => ({ id: reward.id, label: reward.rewardType === 'gold' ? reward.rewardValue + ' G' : getCosmetic(reward.rewardValue)?.name ?? reward.rewardValue, grantedAt: reward.grantedAt })) };
    }));
  }

  calculatePoint(difficulty: string, repeatedCategoryCount: number, pointsEarnedToday: number) {
    const penaltyRate = repeatedCategoryCount >= 2 ? 0.2 : 0;
    const basePoint = Math.round(getRankingPointReward(difficulty) * (1 - penaltyRate));
    return {
      penaltyRate,
      finalPoint: Math.max(0, Math.min(basePoint, 60 - pointsEarnedToday)),
    };
  }
}
