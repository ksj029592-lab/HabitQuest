import { Injectable } from '@nestjs/common';
import { getRankingPointReward } from '@/common/ranking-points';
import { PrismaService } from '@/prisma/prisma.service';
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
      orderBy: { _sum: { finalPoint: 'desc' } },
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: totals.map((entry) => entry.userId) } },
      select: { id: true, personaId: true, level: true },
    });
    const personas = await this.prisma.testPersona.findMany({
      where: { id: { in: users.map((user) => user.personaId) } },
    });
    const userById = new Map(users.map((user) => [user.id, user]));
    const personaById = new Map(personas.map((persona) => [persona.id, persona]));

    return totals.map((entry, index) => {
      const user = userById.get(entry.userId);
      const persona = user ? personaById.get(user.personaId) : undefined;
      return {
        userId: entry.userId,
        personaId: user?.personaId,
        name: persona?.name || '퀘스터',
        level: user?.level || 1,
        points: entry._sum.finalPoint || 0,
        rank: index + 1,
      };
    });
  }

  async ensureCurrentSeason(tx: PrismaService | Prisma.TransactionClient = this.prisma) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const yearMonth = `${values.year}-${values.month}`;
    const startAtKst = new Date(`${yearMonth}-01T00:00:00+09:00`);
    const nextMonth = new Date(startAtKst.getTime());
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

    return tx.rankingSeason.upsert({
      where: { yearMonth },
      update: { status: 'active' },
      create: {
        yearMonth,
        startAtKst,
        endAtKst: nextMonth,
        status: 'active',
      },
    });
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
