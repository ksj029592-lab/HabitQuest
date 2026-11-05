/**
 * 페르소나 컨트롤러
 */
import { Controller, Get, Post, Body, Headers, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Public } from '@/common/session.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PersonaService } from './persona.service';
import { CreateSessionDto, PersonaResponseDto, SessionResponseDto } from './persona.dto';

@ApiTags('Persona & Session')
@Controller()
export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  /**
   * 테스트 페르소나 목록 조회
   */
  @Get('personas')
  @Public()
  @ApiOperation({
    summary: '페르소나 목록 조회',
    description: '플레이 가능한 테스트 페르소나 3개 조회',
  })
  @ApiResponse({ status: 200, type: [PersonaResponseDto] })
  async getPersonas() {
    try {
      const personas = await this.personaService.getAllPersonas();
      return {
        success: true,
        data: personas,
      };
    } catch (error) {
      throw new InternalServerErrorException('페르소나 조회에 실패했습니다');
    }
  }

  /**
   * 세션 시작 (페르소나 선택)
   */
  @Post('session/start')
  @Public()
  @ApiOperation({
    summary: '게임 세션 시작',
    description: '페르소나를 선택하고 새 세션을 시작합니다',
  })
  @ApiResponse({ status: 201, type: SessionResponseDto })
  async startSession(@Body() dto: CreateSessionDto) {
    if (!dto.personaId) {
      throw new BadRequestException('personaId는 필수입니다');
    }

    try {
      const session = await this.personaService.createSession(dto);
      return {
        success: true,
        data: session,
      };
    } catch (error) {
      throw new InternalServerErrorException('세션 생성에 실패했습니다');
    }
  }

  /**
   * 현재 세션 조회
   */
  @Get('session/current')
  @ApiOperation({
    summary: '현재 세션 정보 조회',
    description: '현재 활성 세션의 정보를 조회합니다 (실제로는 클라이언트에서 관리)',
  })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  async getCurrentSession(@Headers('authorization') authorization: string) {
    return {
      success: true,
      data: await this.personaService.getCurrentSession(authorization.slice(7)),
    };
  }

  /**
   * 세션 종료
   */
  @Post('session/end')
  @ApiOperation({
    summary: '게임 세션 종료',
    description: '현재 세션을 종료합니다',
  })
  @ApiResponse({ status: 200 })
  async endSession(@Headers('authorization') authorization: string) {
    await this.personaService.endSession(authorization.slice(7));
    return {
      success: true,
      data: { message: '세션이 종료되었습니다' },
    };
  }
}
