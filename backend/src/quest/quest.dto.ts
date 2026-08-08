/**
 * 퀘스트 DTO
 */
import { IsString, IsNumber, IsEnum } from 'class-validator';

export class CompleteQuestDto {
  @IsString()
  questId: string;
}

export class QuestResponseDto {
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
  completedAt?: string;
  slotNo: number;
}

export class DailyQuestListResponseDto {
  quests: QuestResponseDto[];
  totalPending: number;
  totalCompleted: number;
}
