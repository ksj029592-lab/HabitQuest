/**
 * 퀘스트 DTO
 */
import { IsString, IsNumber, IsEnum, IsArray, IsIn, IsOptional, MinLength, MaxLength, ArrayMaxSize } from 'class-validator';

export class CompleteQuestDto {
  @IsString()
  questId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  answer: string;
}

export class RerollQuestsDto {
  @IsString()
  @MaxLength(80)
  personaName: string;

  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  habits: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class EnsureDailyQuestsDto extends RerollQuestsDto {
  @IsOptional()
  @IsIn(['easy', 'normal', 'hard'])
  difficulty?: 'easy' | 'normal' | 'hard';
}

export class QuestResponseDto {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string;
  questDateKst: string;
  difficulty: string;
  title: string;
  description: string;
  status: string;
  expReward: number;
  goldReward: number;
  rankingPointReward: number;
  rankingPointAwarded?: number;
  rewardAdjustments?: Array<'daily_gold_cap' | 'daily_point_cap' | 'repeated_category'>;
  levelUp?: number;
  verificationQuestion?: string;
  verificationAnswer?: string;
  verificationFeedback?: string;
  completedAt?: string;
  slotNo: number;
}

export class DailyQuestListResponseDto {
  quests: QuestResponseDto[];
  totalPending: number;
  totalCompleted: number;
}
