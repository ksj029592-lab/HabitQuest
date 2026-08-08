/**
 * 퀘스트 서비스
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { QuestResponseDto } from './quest.dto';

@Injectable()
export class QuestService {
  constructor(private prisma: PrismaService) {}

  /**
   * 퀘스트 완료 처리
   */
  async completeQuest(questId: string): Promise<QuestResponseDto> {
    // 퀘스트 조회
    const quest = await this.prisma.dailyQuest.findUnique({
      where: { id: questId },
    });

    if (!quest) {
      throw new Error('퀨스트를 찾을 수 없습니다');
    }

    if (quest.status === 'completed') {
      throw new Error('이미 완료된 퀘스트입니다');
    }

    // 퀘스트 완료 처리
    const updatedQuest = await this.prisma.dailyQuest.update({
      where: { id: questId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // 완료 로그 기록
    await this.prisma.questCompletionLog.create({
      data: {
        userId: quest.userId,
        questId,
        expReward: quest.expReward,
        goldReward: quest.goldReward,
        rankingPointAwarded: this.calculateRankingPoints(quest.difficulty),
      },
    });

    // 사용자 보상 업데이트
    const user = await this.prisma.user.findUnique({
      where: { id: quest.userId },
    });

    const newGold = Math.min(user.gold + quest.goldReward, 300); // 일일 상한 300
    const newExp = user.totalExp + quest.expReward;
    const levelUpThreshold = (user.level + 1) * 300; // 레벨당 300 exp 필요

    let newLevel = user.level;
    if (newExp >= levelUpThreshold) {
      newLevel = user.level + 1;
    }

    await this.prisma.user.update({
      where: { id: quest.userId },
      data: {
        gold: newGold,
        totalExp: newExp,
        level: newLevel,
      },
    });

    // 출석 처리
    const today = this.getKstDateString();
    await this.prisma.attendance.upsert({
      where: { userId_dateKst: { userId: quest.userId, dateKst: today } },
      update: { checked: true },
      create: { userId: quest.userId, dateKst: today, checked: true },
    });

    return {
      id: updatedQuest.id,
      userId: updatedQuest.userId,
      categoryId: updatedQuest.categoryId,
      questDateKst: updatedQuest.questDateKst,
      difficulty: updatedQuest.difficulty,
      title: updatedQuest.title,
      description: updatedQuest.description,
      status: updatedQuest.status,
      expReward: updatedQuest.expReward,
      goldReward: updatedQuest.goldReward,
      completedAt: updatedQuest.completedAt?.toISOString(),
      slotNo: updatedQuest.slotNo,
    };
  }

  /**
   * 난이도별 랭킹 포인트 계산
   */
  private calculateRankingPoints(difficulty: string): number {
    const multipliers = {
      easy: 1.0,
      normal: 1.3,
      hard: 1.6,
    };
    return Math.round(10 * (multipliers[difficulty as keyof typeof multipliers] || 1.0));
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
}
