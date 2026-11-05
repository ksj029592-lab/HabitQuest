/**
 * 페르소나 DTO
 */
import { IsString, IsNumber, IsArray, IsOptional, IsIn } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  personaId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  habits?: string[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsIn(['easy', 'normal', 'hard'])
  difficulty?: 'easy' | 'normal' | 'hard';
}

export class PersonaResponseDto {
  id: string;
  name: string;
  role: string;
  initialLevel: number;
  initialGold: number;
  initialStreak: number;
  bestStreak: number;
  totalQuestCompleted: number;
  monthlySuccessRate: number;
}

export class SessionResponseDto {
  sessionId: string;
  personaId: string;
  startedAt: string;
  personaData: {
    userId: string;
    persona: PersonaResponseDto;
    level: number;
    totalExp: number;
    gold: number;
    streak: {
      currentStreak: number;
      bestStreak: number;
      lastAttendanceDateKst: string | null;
    };
    attendance: {
      todayChecked: boolean;
      lastSevenDaysKst: Array<{ date: string; checked: boolean }>;
    };
    inventory: Array<{
      itemType: string;
      rarity?: string;
      quantity: number;
      name: string;
    }>;
    stats: {
      monthlySuccessRate: number;
      totalQuestsCompleted: number;
      averageStreakLength: number;
      thisMonthQuestsCompleted: number;
    };
  };
}
