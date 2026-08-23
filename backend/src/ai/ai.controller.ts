import { Body, Controller, Post } from '@nestjs/common';
import { IsArray, IsIn, IsOptional, IsString, MaxLength, ArrayMaxSize } from 'class-validator';
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

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('quests/generate')
  async generateQuests(@Body() dto: GenerateQuestsDto) {
    return {
      success: true,
      data: await this.aiService.generateQuests(dto),
    };
  }
}
