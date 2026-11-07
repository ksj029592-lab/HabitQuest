/**
 * 페르소나 DTO
 */
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @MaxLength(80)
  @Matches(/\S/)
  personaId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @Matches(/\S/, { each: true })
  habits?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
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
