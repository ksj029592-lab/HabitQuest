import { Body, Controller, Post } from '@nestjs/common';
import { IsArray, IsIn, IsOptional, IsString, MinLength, MaxLength, ArrayMaxSize } from 'class-validator';
import { AiService } from './ai.service';

class GenerateQuestsDto {
  @IsString()
  @MaxLength(80)
  personaName!: string;

  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  habits!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsIn(['easy', 'normal', 'hard'])
  difficulty?: 'easy' | 'normal' | 'hard';
}

class ReflectionQuestDto {
  @IsString()
  @MaxLength(300)
  title: string;

  @IsString()
  @MaxLength(2000)
  description: string;
}

class ReviewReflectionDto extends ReflectionQuestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  question: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  answer: string;
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('quests/reflection/question')
  async reflectionQuestion(@Body() dto: ReflectionQuestDto) {
    try {
      return { success: true, data: await this.aiService.createReflectionQuestion(dto) };
    } catch (error) {
      return { success: false, error: { code: 'AI_UNAVAILABLE', message: error instanceof Error ? error.message : '질문을 준비하지 못했어요.' } };
    }
  }

  @Post('quests/reflection/review')
  async reviewReflection(@Body() dto: ReviewReflectionDto) {
    try {
      return { success: true, data: await this.aiService.reviewReflection(dto) };
    } catch (error) {
      return { success: false, error: { code: 'AI_UNAVAILABLE', message: error instanceof Error ? error.message : '답변을 검토하지 못했어요.' } };
    }
  }

  @Post('quests/generate')
  async generateQuests(@Body() dto: GenerateQuestsDto) {
    return {
      success: true,
      data: await this.aiService.generateQuests(dto),
    };
  }
}
