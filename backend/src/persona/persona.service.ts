/**
 * 페르소나 서비스
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AiService } from '@/ai/ai.service';
import { CreateSessionDto, SessionResponseDto } from './persona.dto';
import { randomUUID } from 'node:crypto';
import { questCategoryIds } from '@/common/habit-categories';
import { COSMETICS } from '@/common/game-catalog';
import { habitChoices } from '@/common/habit-categories';
import { createInitialHabits } from '@/habit/habit.service';
import { dailySchedule } from '@/habit/schedule';

@Injectable()
export class PersonaService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  /**
   * 모든 테스트 페르소나 조회
   */
  async getAllPersonas() {
    return this.prisma.testPersona.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * 페르소나별 세션 생성
   */
  async createSession(input: CreateSessionDto): Promise<SessionResponseDto> {
    // 페르소나 조회
    const personaId = input.personaId.trim();
    const habits = habitChoices(input.habits ?? []);
    const note = input.note?.trim() ?? '';
    const difficulty = input.difficulty ?? 'normal';
    const persona = await this.prisma.testPersona.findFirst({
      where: {
        OR: [{ id: personaId }, { role: personaId }],
      },
    });

    if (!persona) {
      throw new BadRequestException('페르소나를 찾을 수 없습니다');
    }

    const generatedQuests = await this.aiService.generateQuests({
      personaName: persona.name,
      habits: habits.slice(0, 3),
      count: Math.min(3, habits.length),
      note,
      difficulty,
    });

    const userId = randomUUID();
    const sessionId = randomUUID();
    const today = this.getKstDateString();
    const user = await this.prisma.$transaction(async (tx) => {
      // 새 사용자 생성 (각 세션마다)
      const user = await tx.user.create({
        data: {
          id: userId,
          personaId: persona.id,
          level: persona.initialLevel,
          totalExp: (persona.initialLevel - 1) * 300,
          gold: persona.initialGold,
          habits,
          note,
          preferredDifficulty: difficulty,
          avatarIndex: persona.role === 'advanced' ? 4 : persona.role === 'active' ? 2 : 0,
        },
      });

      // Streak 초기화
      await tx.streak.create({
        data: {
          userId,
          currentStreak: persona.initialStreak,
          bestStreak: persona.bestStreak,
        },
      });

      // Inventory 초기화
      await tx.inventory.create({
        data: {
          userId,
          itemType: 'protection_ticket',
          itemId: 'default',
          rarity: 'common',
          quantity: persona.role === 'advanced' ? 3 : persona.role === 'active' ? 2 : 0,
        },
      });

      const initialItems = persona.role === 'advanced' ? ['border_rainbow_ring', '전설의'] : persona.role === 'active' ? ['border_gold_frame', '부지런한'] : [];
      for (const itemId of initialItems) {
        await tx.inventory.create({ data: { userId, itemId, itemType: 'cosmetic', rarity: COSMETICS[itemId].rarity, quantity: 1 } });
      }

      // 오늘 퀘스트 생성
      const managed = await createInitialHabits(tx, userId, habits, today);
      const categoryIds = await questCategoryIds(tx, habits, generatedQuests);

      for (const [index, quest] of generatedQuests.entries()) {
        const habit = managed.find((entry) => entry.name === quest.categoryId);
        if (!habit) throw new BadRequestException('등록된 습관과 퀘스트가 일치하지 않습니다.');
        await tx.dailyQuest.create({
          data: {
            userId,
            categoryId: categoryIds[index],
            habitId: habit.id,
            habitSnapshot: { name: quest.categoryId, schedule: dailySchedule(today) },
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

      // 출석 기록
      await tx.attendance.upsert({
        where: { userId_dateKst: { userId, dateKst: today } },
        update: { checked: false },
        create: { userId, dateKst: today, checked: false },
      });

      // 세션 생성
      await tx.userSession.create({
        data: {
          personaId: persona.id,
          sessionId,
          userId,
        },
      });
      return user;
    });

    return {
      sessionId,
      personaId: persona.id,
      startedAt: new Date().toISOString(),
      personaData: {
        userId,
        persona: {
          id: persona.id,
          name: persona.name,
          role: persona.role,
          initialLevel: persona.initialLevel,
          initialGold: persona.initialGold,
          initialStreak: persona.initialStreak,
          bestStreak: persona.bestStreak,
          totalQuestCompleted: persona.totalQuestCompleted,
          monthlySuccessRate: persona.monthlySuccessRate,
        },
        level: user.level,
        totalExp: user.totalExp,
        gold: user.gold,
        streak: {
          currentStreak: persona.initialStreak,
          bestStreak: persona.bestStreak,
          lastAttendanceDateKst: null,
        },
        attendance: {
          todayChecked: false,
          lastSevenDaysKst: [],
        },
        inventory: [
          {
            itemType: 'protection_ticket',
            quantity: persona.role === 'advanced' ? 3 : persona.role === 'active' ? 2 : 0,
            name: '방지권',
          },
        ],
        stats: {
          monthlySuccessRate: persona.monthlySuccessRate,
          totalQuestsCompleted: persona.totalQuestCompleted,
          averageStreakLength: persona.bestStreak > 0 ? Math.floor(persona.bestStreak / 2) : 0,
          thisMonthQuestsCompleted: 0,
        },
      },
    };
  }

  getCurrentSession(sessionId: string) {
    return this.prisma.userSession.findUnique({ where: { sessionId }, select: { sessionId: true, userId: true, personaId: true, startedAt: true, lastActivityAt: true } });
  }

  endSession(sessionId: string) {
    return this.prisma.userSession.deleteMany({ where: { sessionId } });
  }

  /**
   * KST 날짜 문자열 생성 (YYYY-MM-DD)
   */
  private getKstDateString(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

}
