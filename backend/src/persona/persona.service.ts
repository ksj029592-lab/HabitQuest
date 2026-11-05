/**
 * 페르소나 서비스
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AiService } from '@/ai/ai.service';
import { CreateSessionDto, SessionResponseDto } from './persona.dto';
import { v4 as uuidv4 } from 'uuid';
import { COSMETICS } from '@/common/game-catalog';

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
    const persona = await this.prisma.testPersona.findFirst({
      where: {
        OR: [{ id: input.personaId }, { role: input.personaId }],
      },
    });

    if (!persona) {
      throw new Error('페르소나를 찾을 수 없습니다');
    }

    const generatedQuests = await this.aiService.generateQuests({
      personaName: persona.name,
      habits: input.habits ?? [],
      note: input.note ?? '',
      difficulty: input.difficulty ?? 'normal',
    });

    // 새 사용자 생성 (각 세션마다)
    const userId = uuidv4();
    const user = await this.prisma.user.create({
      data: {
        id: userId,
        personaId: persona.id,
        level: persona.initialLevel,
        totalExp: (persona.initialLevel - 1) * 300,
        gold: persona.initialGold,
        habits: input.habits ?? [],
        note: input.note ?? '',
        preferredDifficulty: input.difficulty ?? 'normal',
        avatarIndex: persona.role === 'advanced' ? 4 : persona.role === 'active' ? 2 : 0,
      },
    });

    // Streak 초기화
    await this.prisma.streak.create({
      data: {
        userId,
        currentStreak: persona.initialStreak,
        bestStreak: persona.bestStreak,
      },
    });

    // Inventory 초기화
    await this.prisma.inventory.create({
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
      await this.prisma.inventory.create({ data: { userId, itemId, itemType: 'cosmetic', rarity: COSMETICS[itemId].rarity, quantity: 1 } });
    }

    // 오늘 퀘스트 생성
    const categories = await this.getOrCreateCategories(input.habits ?? []);

    for (const [index, quest] of generatedQuests.entries()) {
      await this.prisma.dailyQuest.create({
        data: {
          userId,
          categoryId: categories[index % categories.length].id,
          questDateKst: quest.questDateKst,
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
    const today = this.getKstDateString();
    await this.prisma.attendance.upsert({
      where: { userId_dateKst: { userId, dateKst: today } },
      update: { checked: false },
      create: { userId, dateKst: today, checked: false },
    });

    // 세션 생성
    const sessionId = uuidv4();
    await this.prisma.userSession.create({
      data: {
        personaId: input.personaId,
        sessionId,
        userId,
      },
    });

    return {
      sessionId,
      personaId: input.personaId,
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
            quantity: 0,
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

  /**
   * 기본 카테고리 조회 또는 생성
   */
  private async getOrCreateCategories(habits: string[]) {
    const categoryNames = habits.length > 0 ? [...new Set(habits)] : ['독서', '운동', '공부'];
    const categories = [];

    for (const name of categoryNames) {
      const category = await this.prisma.habitCategory.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      categories.push(category);
    }

    return categories;
  }
}
