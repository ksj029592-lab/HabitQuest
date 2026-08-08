/**
 * 퀘스트 컨트롤러
 */
import { Controller, Get, Post, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuestService } from './quest.service';
import { CompleteQuestDto, DailyQuestListResponseDto, QuestResponseDto } from './quest.dto';

@ApiTags('Quest')
@Controller('quests')
export class QuestController {
  constructor(private readonly questService: QuestService) {}

  /**
   * 일일 퀘스트 조회 (클라이언트 세션 기반)
   * 실제로는 세션의 userId를 사용해야 함
   */
  @Get('daily')
  @ApiOperation({
    summary: '오늘의 퀘스트 조회',
    description: '현재 세션 사용자의 오늘 퀘스트 3개 조회',
  })
  @ApiResponse({ status: 200, type: DailyQuestListResponseDto })
  async getDailyQuests() {
    // 실제로는 세션의 userId를 사용하지만, MVP에서는 테스트용으로 일반화
    return {
      success: true,
      data: {
        quests: [],
        totalPending: 0,
        totalCompleted: 0,
      },
    };
  }

  /**
   * 퀘스트 완료
   */
  @Post(':questId/complete')
  @ApiOperation({
    summary: '퀘스트 완료 처리',
    description: '퀘스트를 완료 상태로 변경하고 보상 지급',
  })
  @ApiResponse({ status: 200, type: QuestResponseDto })
  async completeQuest(
    @Param('questId') questId: string,
    @Body() dto: CompleteQuestDto
  ) {
    if (!questId) {
      throw new BadRequestException('questId는 필수입니다');
    }

    try {
      const quest = await this.questService.completeQuest(questId);
      return {
        success: true,
        data: quest,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUEST_COMPLETE_FAILED',
          message: error.message,
        },
      };
    }
  }

  /**
   * 퀘스트 히스토리 조회
   */
  @Get('history')
  @ApiOperation({
    summary: '퀘스트 완료 히스토리 조회',
    description: '완료한 퀘스트의 기록 조회 (최대 30개)',
  })
  @ApiResponse({ status: 200, type: [QuestResponseDto] })
  async getQuestHistory() {
    return {
      success: true,
      data: [],
    };
  }
}
