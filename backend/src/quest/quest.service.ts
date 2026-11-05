/**
 * 퀘스트 서비스
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { QuestResponseDto } from './quest.dto';
import { RankingService } from '@/ranking/ranking.service';
import { AiService } from '@/ai/ai.service';
import { getRankingPointReward } from '@/common/ranking-points';

interface RerollInput {
  personaName: string;
  habits: string[];
  note?: string;
}

interface EnsureInput extends RerollInput {
  difficulty?: 'easy' | 'normal' | 'hard';
}

@Injectable()
export class QuestService {
  private readonly difficulties = ['easy', 'normal', 'hard'] as const;

  constructor(
    private prisma: PrismaService,
    private rankingService: RankingService,
    private aiService: AiService,
  ) {}

  private toDto(
    quest: {
      id: string;
      userId: string;
      categoryId: string;
      questDateKst: string;
      difficulty: string;
      title: string;
      description: string;
      status: string;
      expReward: number;
      goldReward: number;
      completedAt: Date | null;
      slotNo: number;
      verificationQuestion?: string | null;
      verificationAnswer?: string | null;
      verificationFeedback?: string | null;
    },
    overrides: { goldReward?: number; rankingPointAwarded?: number } = {},
  ): QuestResponseDto {
    return {
      id: quest.id,
      userId: quest.userId,
      categoryId: quest.categoryId,
      questDateKst: quest.questDateKst,
      difficulty: quest.difficulty,
      title: quest.title,
      description: quest.description,
      status: quest.status,
      expReward: quest.expReward,
      goldReward: overrides.goldReward ?? quest.goldReward,
      rankingPointReward: getRankingPointReward(quest.difficulty),
      rankingPointAwarded: overrides.rankingPointAwarded,
      verificationQuestion: quest.verificationQuestion ?? undefined,
      verificationAnswer: quest.verificationAnswer ?? undefined,
      verificationFeedback: quest.verificationFeedback ?? undefined,
      completedAt: quest.completedAt?.toISOString(),
      slotNo: quest.slotNo as 0 | 1 | 2,
    };
  }

  async getDailyQuests(userId: string): Promise<QuestResponseDto[]> {
    const today = this.getKstDateString();
    const quests = await this.prisma.dailyQuest.findMany({
      where: { userId, questDateKst: today },
      orderBy: { slotNo: 'asc' },
      include: { completionLog: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    return quests.map((quest) => this.toDto(quest, { goldReward: quest.completionLog?.[0]?.goldReward, rankingPointAwarded: quest.completionLog?.[0]?.rankingPointAwarded }));
  }

  async getQuestHistory(userId: string) {
    const quests = await this.prisma.dailyQuest.findMany({
      where: { userId, status: 'completed' },
      orderBy: [{ questDateKst: 'desc' }, { slotNo: 'asc' }],
      take: 90,
      include: { completionLog: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return quests.map((quest) => this.toDto(quest, { goldReward: quest.completionLog[0]?.goldReward, rankingPointAwarded: quest.completionLog[0]?.rankingPointAwarded }));
  }

  /**
   * 오늘 퀘스트가 없으면(자정 이후 첫 접속) 새로 생성하고 스트릭 끊김/방지권을 처리
   */
  async ensureDailyQuests(userId: string, input: EnsureInput) {
    const today = this.getKstDateString();
    const existing = await this.getDailyQuests(userId);
    if (existing.length > 0) {
      return { created: false, streakReset: false, protectionUsed: false, quests: existing };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('사용자를 찾을 수 없습니다');

    input = { personaName: input.personaName, habits: user.habits, note: user.note, difficulty: user.preferredDifficulty as EnsureInput['difficulty'] };
    const generated = await this.aiService.generateQuests({
      personaName: input.personaName,
      habits: input.habits,
      note: input.note,
      difficulty: input.difficulty ?? 'normal',
    });
    const categoryNames = input.habits.length > 0 ? [...new Set(input.habits)] : ['독서', '운동', '공부'];
    const categories = [];
    for (const name of categoryNames) {
      categories.push(await this.prisma.habitCategory.upsert({ where: { name }, update: {}, create: { name } }));
    }

    return this.prisma.$transaction(async (tx) => {
      const already = await tx.dailyQuest.count({ where: { userId, questDateKst: today } });
      if (already > 0) {
        const quests = await tx.dailyQuest.findMany({
          where: { userId, questDateKst: today },
          orderBy: { slotNo: 'asc' },
        });
        return { created: false, streakReset: false, protectionUsed: false, quests: quests.map((q) => this.toDto(q)) };
      }

      let streakReset = false;
      let protectionUsed = false;
      const streak = await tx.streak.findUnique({ where: { userId } });
      const yesterday = this.getPreviousKstDateString(today);
      const last = streak?.lastAttendanceDateKst;
      if (streak && last && last < yesterday && streak.currentStreak > 0) {
        const ticket = await tx.inventory.findFirst({
          where: { userId, itemType: 'protection_ticket', quantity: { gt: 0 } },
        });
        if (ticket) {
          await tx.inventory.update({ where: { id: ticket.id }, data: { quantity: { decrement: 1 } } });
          await tx.streak.update({ where: { userId }, data: { lastAttendanceDateKst: yesterday } });
          protectionUsed = true;
        } else {
          await tx.streak.update({ where: { userId }, data: { currentStreak: 0 } });
          streakReset = true;
        }
      }

      for (const [index, quest] of generated.entries()) {
        await tx.dailyQuest.create({
          data: {
            userId,
            categoryId: categories[index % categories.length].id,
            questDateKst: today,
            difficulty: quest.difficulty,
            title: quest.title,
            description: quest.description,
            status: 'pending',
            expReward: quest.expReward,
            goldReward: quest.goldReward,
            slotNo: index,
          },
        });
      }

      const quests = await tx.dailyQuest.findMany({
        where: { userId, questDateKst: today },
        orderBy: { slotNo: 'asc' },
      });
      return { created: true, streakReset, protectionUsed, quests: quests.map((q) => this.toDto(q)) };
    });
  }

  /**
   * 서버 기준 사용자 상태 (골드/경험치/레벨/스트릭/인벤토리/시즌 포인트)
   */
  async getUserState(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('사용자를 찾을 수 없습니다');

    const today = this.getKstDateString();
    const monthStart = `${today.slice(0, 7)}-01`;
    const season = await this.rankingService.ensureCurrentSeason();
    const [streak, inventory, points, attendance] = await Promise.all([
      this.prisma.streak.findUnique({ where: { userId } }),
      this.prisma.inventory.findMany({ where: { userId } }),
      this.prisma.rankingPointLog.aggregate({
        _sum: { finalPoint: true },
        where: { userId, seasonId: season.id },
      }),
      this.prisma.attendance.findUnique({ where: { userId_dateKst: { userId, dateKst: today } } }),
    ]);

    const monthFilter = { userId, questDateKst: { gte: monthStart, lte: today } };
    const [totalCompleted, monthCompleted, monthTotal, attended] = await Promise.all([
      this.prisma.dailyQuest.count({ where: { userId, status: 'completed' } }),
      this.prisma.dailyQuest.count({ where: { ...monthFilter, status: 'completed' } }),
      this.prisma.dailyQuest.count({ where: monthFilter }),
      this.prisma.attendance.findMany({ where: { userId, checked: true }, orderBy: { dateKst: 'asc' } }),
    ]);
    let runs = 0;
    let previousDate = '';
    for (const attendance of attended) {
      if (!previousDate || this.getPreviousKstDateString(attendance.dateKst) !== previousDate) runs += 1;
      previousDate = attendance.dateKst;
    }
    return {
      userId,
      level: user.level,
      totalExp: user.totalExp,
      gold: user.gold,
      avatarIndex: user.avatarIndex,
      equippedTitle: user.equippedTitle,
      equippedBorder: user.equippedBorder,
      equippedDecoration: user.equippedDecoration,
      specialAvatarId: user.specialAvatarId,
      reminderEnabled: user.reminderEnabled,
      reminderTime: user.reminderTime,
      userPreferences: { habits: user.habits, note: user.note, difficulty: user.preferredDifficulty },
      expPerLevel: 300,
      stats: { totalQuestsCompleted: totalCompleted, thisMonthQuestsCompleted: monthCompleted, monthlySuccessRate: monthTotal ? Math.round(monthCompleted / monthTotal * 100) : 0, averageStreakLength: runs ? Math.round(attended.length / runs * 10) / 10 : 0 },
      totalAttendanceDays: attended.length,
      streak: {
        currentStreak: streak?.currentStreak ?? 0,
        bestStreak: streak?.bestStreak ?? 0,
        lastAttendanceDateKst: streak?.lastAttendanceDateKst ?? null,
      },
      inventory: inventory.map((item) => ({
        itemId: item.itemId,
        name: item.itemType === 'cosmetic' ? item.itemId : item.itemType === 'reroll_ticket' ? '리롤 티켓' : '방지권',
        itemType: item.itemType,
        rarity: item.rarity,
        quantity: item.quantity,
      })),
      seasonRankingPoints: points._sum.finalPoint ?? 0,
      todayChecked: attendance?.checked ?? false,
    };
  }

  /**
   * 리롤 티켓 1개를 소모하여 오늘의 진행 중 퀘스트를 랜덤 난이도로 재생성 (완료된 퀘스트는 유지)
   */
  async rerollQuests(userId: string, input: RerollInput) {
    const owner = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    input = { personaName: input.personaName, habits: owner.habits, note: owner.note };
    const today = this.getKstDateString();
    const pending = await this.prisma.dailyQuest.findMany({
      where: { userId, questDateKst: today, status: 'pending' },
      orderBy: { slotNo: 'asc' },
    });
    if (pending.length === 0) {
      throw new Error('리롤할 수 있는 진행 중 퀘스트가 없습니다');
    }

    const ticket = await this.prisma.inventory.findFirst({
      where: { userId, itemType: 'reroll_ticket' },
    });
    if (!ticket || ticket.quantity < 1) {
      throw new Error('리롤 티켓이 없습니다');
    }

    const difficulty = this.difficulties[Math.floor(Math.random() * this.difficulties.length)];
    const generated = await this.aiService.generateQuests({
      personaName: input.personaName,
      habits: input.habits,
      note: input.note,
      difficulty,
    });

    return this.prisma.$transaction(async (tx) => {
      const used = await tx.inventory.updateMany({
        where: { id: ticket.id, quantity: { gte: 1 } },
        data: { quantity: { decrement: 1 } },
      });
      if (used.count !== 1) {
        throw new Error('리롤 티켓이 없습니다');
      }

      const removed = await tx.dailyQuest.deleteMany({
        where: { id: { in: pending.map((quest) => quest.id) }, status: 'pending' },
      });
      if (removed.count !== pending.length) {
        throw new Error('퀘스트 상태가 변경되어 리롤할 수 없습니다');
      }

      for (const [index, old] of pending.entries()) {
        const next = generated[index % generated.length];
        await tx.dailyQuest.create({
          data: {
            userId,
            categoryId: old.categoryId,
            questDateKst: today,
            difficulty: next.difficulty,
            title: next.title,
            description: next.description,
            status: 'pending',
            expReward: next.expReward,
            goldReward: next.goldReward,
            slotNo: old.slotNo,
          },
        });
      }

      const quests = await tx.dailyQuest.findMany({
        where: { userId, questDateKst: today },
        orderBy: { slotNo: 'asc' },
      });
      const updatedTicket = await tx.inventory.findUniqueOrThrow({ where: { id: ticket.id } });

      return {
        difficulty,
        rerollTickets: updatedTicket.quantity,
        quests: quests.map((quest) => this.toDto(quest)),
      };
    });
  }

  /**
   * 퀘스트 완료 처리
   */
  async getVerificationQuestion(questId: string, userId?: string) {
    const quest = await this.getVerifiableQuest(questId, userId);
    if (quest.verificationQuestion) return { question: quest.verificationQuestion };
    const generated = await this.aiService.createReflectionQuestion(quest);
    await this.prisma.dailyQuest.updateMany({
      where: { id: questId, userId, status: 'pending', verificationQuestion: null, questDateKst: this.getKstDateString() },
      data: { verificationQuestion: generated.question },
    });
    const saved = await this.getVerifiableQuest(questId, userId);
    if (!saved.verificationQuestion) throw new BadRequestException('질문을 다시 요청해 주세요.');
    return { question: saved.verificationQuestion };
  }

  private async getVerifiableQuest(questId: string, userId?: string) {
    if (!userId) throw new BadRequestException('사용자 세션이 필요합니다');
    const quest = await this.prisma.dailyQuest.findUnique({ where: { id: questId } });
    if (!quest || quest.userId !== userId) throw new BadRequestException('이 퀘스트에 접근할 수 없습니다');
    if (quest.status !== 'pending') throw new BadRequestException('이미 완료된 퀘스트입니다');
    if (quest.questDateKst !== this.getKstDateString()) throw new BadRequestException('오늘의 퀘스트만 완료할 수 있어요.');
    return quest;
  }

  async completeQuest(questId: string, userId?: string, answer?: string): Promise<QuestResponseDto> {
    const trimmedAnswer = answer?.trim();
    if (!trimmedAnswer || trimmedAnswer.length > 2000) throw new BadRequestException('활동에 대한 답변을 2,000자 이내로 남겨 주세요.');
    const snapshot = await this.getVerifiableQuest(questId, userId);
    if (!snapshot.verificationQuestion) throw new BadRequestException('먼저 퀘스트 질문을 열어 주세요.');
    const review = await this.aiService.reviewReflection({
      title: snapshot.title,
      description: snapshot.description,
      question: snapshot.verificationQuestion,
      answer: trimmedAnswer,
    });
    if (!review.approved) throw new BadRequestException(review.feedback);
    return this.prisma.$transaction(async (tx) => {
      const quest = await tx.dailyQuest.findUnique({ where: { id: questId } });

      if (!quest) {
        throw new Error('퀘스트를 찾을 수 없습니다');
      }

      if (userId && quest.userId !== userId) {
        throw new Error('이 퀘스트에 접근할 수 없습니다');
      }

      const claimed = await tx.dailyQuest.updateMany({
        where: { id: questId, userId, status: 'pending', questDateKst: this.getKstDateString(), verificationQuestion: snapshot.verificationQuestion },
        data: { status: 'completed', completedAt: new Date(), verificationAnswer: trimmedAnswer, verificationFeedback: review.feedback },
      });
      if (claimed.count !== 1) {
        throw new Error('이미 완료된 퀘스트입니다');
      }

      const now = new Date();
      const today = this.getKstDateString(now);
      const todayStart = new Date(`${today}T00:00:00+09:00`);
      const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      const earnedToday = await tx.questCompletionLog.aggregate({
        _sum: { goldReward: true },
        where: {
          userId: quest.userId,
          createdAt: { gte: todayStart, lt: tomorrowStart },
        },
      });
      const remainingGold = Math.max(0, 300 - (earnedToday._sum.goldReward || 0));
      const awardedGold = Math.min(quest.goldReward, remainingGold);
      const season = await this.rankingService.ensureCurrentSeason(tx);
      const repeatedCategoryCount = await tx.questCompletionLog.count({
        where: {
          userId: quest.userId,
          quest: { categoryId: quest.categoryId, questDateKst: today },
        },
      });
      const pointsToday = await tx.rankingPointLog.aggregate({
        _sum: { finalPoint: true },
        where: {
          userId: quest.userId,
          seasonId: season.id,
          createdAt: { gte: todayStart, lt: tomorrowStart },
        },
      });
      const rankingPoint = this.rankingService.calculatePoint(
        quest.difficulty,
        repeatedCategoryCount,
        pointsToday._sum.finalPoint || 0,
      );

      await tx.questCompletionLog.create({
        data: {
          userId: quest.userId,
          questId,
          expReward: quest.expReward,
          goldReward: awardedGold,
          rankingPointAwarded: rankingPoint.finalPoint,
        },
      });
      await tx.rankingPointLog.create({
        data: {
          userId: quest.userId,
          seasonId: season.id,
          questId,
          basePoint: getRankingPointReward(quest.difficulty),
          multiplier: 1,
          penaltyRate: rankingPoint.penaltyRate,
          finalPoint: rankingPoint.finalPoint,
        },
      });

      const user = await tx.user.findUnique({ where: { id: quest.userId } });
      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다');
      }

      const newExp = user.totalExp + quest.expReward;
      const newLevel = Math.max(user.level, Math.floor(newExp / 300) + 1);
      await tx.user.update({
        where: { id: quest.userId },
        data: { gold: user.gold + awardedGold, totalExp: newExp, level: newLevel },
      });

      const attendance = await tx.attendance.findUnique({
        where: { userId_dateKst: { userId: quest.userId, dateKst: today } },
      });
      if (!attendance?.checked) {
        await tx.attendance.upsert({
          where: { userId_dateKst: { userId: quest.userId, dateKst: today } },
          update: { checked: true },
          create: { userId: quest.userId, dateKst: today, checked: true },
        });

        const streak = await tx.streak.findUnique({ where: { userId: quest.userId } });
        if (streak) {
          const yesterday = this.getPreviousKstDateString(today);
          const nextStreak = streak.lastAttendanceDateKst === yesterday || !streak.lastAttendanceDateKst
            ? streak.currentStreak + 1
            : 1;
          await tx.streak.update({
            where: { userId: quest.userId },
            data: {
              currentStreak: nextStreak,
              bestStreak: Math.max(streak.bestStreak, nextStreak),
              lastAttendanceDateKst: today,
            },
          });

          if (nextStreak > 0 && nextStreak % 30 === 0) {
            const ticket = await tx.inventory.findFirst({
              where: { userId: quest.userId, itemType: 'protection_ticket' },
            });
            if (ticket && ticket.quantity < 3) {
              await tx.inventory.update({
                where: { id: ticket.id },
                data: { quantity: ticket.quantity + 1 },
              });
            }
          }
        }
      }

      const updatedQuest = await tx.dailyQuest.findUniqueOrThrow({ where: { id: questId } });
      return this.toDto(updatedQuest, {
        goldReward: awardedGold,
        rankingPointAwarded: rankingPoint.finalPoint,
      });
    });
  }

  /**
   * KST 날짜 문자열 생성 (YYYY-MM-DD)
   */
  private getKstDateString(date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  private getPreviousKstDateString(dateKst: string): string {
    const date = new Date(`${dateKst}T00:00:00+09:00`);
    date.setTime(date.getTime() - 24 * 60 * 60 * 1000);
    return this.getKstDateString(date);
  }
}
