/**
 * 페르소나 서비스
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SessionResponseDto } from './persona.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PersonaService {
  constructor(private prisma: PrismaService) {}

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
  async createSession(personaId: string): Promise<SessionResponseDto> {
    // 페르소나 조회
    const persona = await this.prisma.testPersona.findUnique({
      where: { id: personaId },
    });

    if (!persona) {
      throw new Error('페르소나를 찾을 수 없습니다');
    }

    // 새 사용자 생성 (각 세션마다)
    const userId = uuidv4();
    const user = await this.prisma.user.create({
      data: {
        id: userId,
        personaId,
        level: persona.initialLevel,
        totalExp: 0,
        gold: persona.initialGold,
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
        quantity: 0,
      },
    });

    // 오늘 퀘스트 생성
    const today = this.getKstDateString();
    const quests = [];
    const categories = await this.getOrCreateCategories();

    for (let i = 0; i < 3; i++) {
      const difficulty = this.getRandomDifficulty();
      const rewards = this.getQuestRewards(difficulty);

      quests.push(
        await this.prisma.dailyQuest.create({
          data: {
            userId,
            categoryId: categories[i % categories.length].id,
            questDateKst: today,
            difficulty,
            title: `[${difficulty === 'easy' ? '쉬움' : difficulty === 'normal' ? '보통' : '어려움'}] 퀘스트 ${i + 1}`,
            description: `이 ${difficulty === 'easy' ? '쉬운' : difficulty === 'normal' ? '보통' : '어려운'} 퀘스트를 완료하세요`,
            status: 'pending',
            expReward: rewards.exp,
            goldReward: rewards.gold,
            slotNo: i as 0 | 1 | 2,
          },
        })
      );
    }

    // 출석 기록
    await this.prisma.attendance.upsert({
      where: { userId_dateKst: { userId, dateKst: today } },
      update: { checked: false },
      create: { userId, dateKst: today, checked: false },
    });

    // 세션 생성
    const sessionId = uuidv4();
    await this.prisma.userSession.create({
      data: {
        personaId,
        sessionId,
      },
    });

    return {
      sessionId,
      personaId,
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

  /**
   * KST 날짜 문자열 생성 (YYYY-MM-DD)
   */
  private getKstDateString(): string {
    const now = new Date();
    const kstTime = new Date(now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
    const year = kstTime.getFullYear();
    const month = String(kstTime.getMonth() + 1).padStart(2, '0');
    const day = String(kstTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 랜덤 난이도 선택
   */
  private getRandomDifficulty(): string {
    const difficulties = ['easy', 'normal', 'hard'];
    return difficulties[Math.floor(Math.random() * difficulties.length)];
  }

  /**
   * 난이도별 보상
   */
  private getQuestRewards(difficulty: string): { exp: number; gold: number } {
    const rewards = {
      easy: { exp: 50, gold: 25 },
      normal: { exp: 100, gold: 50 },
      hard: { exp: 200, gold: 100 },
    };
    return rewards[difficulty as keyof typeof rewards] || rewards.normal;
  }

  /**
   * 기본 카테고리 조회 또는 생성
   */
  private async getOrCreateCategories() {
    const categoryNames = ['독서', '운동', '공부', '명상', '그림'];
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
