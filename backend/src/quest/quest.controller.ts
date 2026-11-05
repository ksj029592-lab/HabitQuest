/**
 * 퀘스트 컨트롤러
 */
import { Controller, Get, Post, Param, Body, BadRequestException, Headers } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuestService } from './quest.service';
import { CompleteQuestDto, DailyQuestListResponseDto, EnsureDailyQuestsDto, QuestResponseDto, RerollQuestsDto } from './quest.dto';

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
  async getDailyQuests(@Headers('x-user-id') userId?: string) {
    if (userId) {
      return {
        success: true,
        data: await this.questService.getDailyQuests(userId),
      };
    }

    return {
      success: true,
      data: [],
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
    @Body() dto: CompleteQuestDto,
    @Headers('x-user-id') userId?: string
  ) {
    if (!questId) {
      throw new BadRequestException('questId는 필수입니다');
    }

    try {
      const quest = await this.questService.completeQuest(questId, userId, dto.answer);
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

  @Post(':questId/verification')
  async getVerificationQuestion(@Param('questId') questId: string, @Headers('x-user-id') userId?: string) {
    try {
      return { success: true, data: await this.questService.getVerificationQuestion(questId, userId) };
    } catch (error) {
      return { success: false, error: { code: 'QUEST_VERIFICATION_FAILED', message: error instanceof Error ? error.message : '질문을 준비하지 못했어요.' } };
    }
  }

  /**
   * 자정(KST) 이후 첫 접속 시 오늘의 퀘스트 생성 + 스트릭 처리
   */
  @Post('daily/ensure')
  async ensureDailyQuests(@Body() dto: EnsureDailyQuestsDto, @Headers('x-user-id') userId?: string) {
    if (!userId) {
      return {
        success: false,
        error: { code: 'USER_REQUIRED', message: '사용자 세션이 필요합니다' },
      };
    }

    try {
      return { success: true, data: await this.questService.ensureDailyQuests(userId, dto) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUEST_ENSURE_FAILED',
          message: error instanceof Error ? error.message : '퀘스트 생성에 실패했습니다',
        },
      };
    }
  }

  /**
   * 리롤 티켓 사용 - 진행 중 퀘스트를 랜덤 난이도로 재생성
   */
  @Post('reroll')
  @ApiOperation({
    summary: '퀘스트 리롤',
    description: '리롤 티켓 1개를 사용해 진행 중인 퀘스트를 랜덤 난이도로 다시 생성',
  })
  async rerollQuests(@Body() dto: RerollQuestsDto, @Headers('x-user-id') userId?: string) {
    if (!userId) {
      return {
        success: false,
        error: { code: 'USER_REQUIRED', message: '사용자 세션이 필요합니다' },
      };
    }

    try {
      return { success: true, data: await this.questService.rerollQuests(userId, dto) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUEST_REROLL_FAILED',
          message: error instanceof Error ? error.message : '리롤에 실패했습니다',
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
  async getQuestHistory(@Headers('x-user-id') userId: string) {
    return {
      success: true,
      data: await this.questService.getQuestHistory(userId),
    };
  }
}
