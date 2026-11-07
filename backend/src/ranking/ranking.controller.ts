import { Controller, Get, Headers, ServiceUnavailableException } from '@nestjs/common';
import { RankingService } from './ranking.service';

@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('results')
  async results(@Headers('x-user-id') userId: string) {
    return { success: true, data: await this.rankingService.getSeasonResults(userId) };
  }

  @Get('rewards')
  async rewards(@Headers('x-user-id') userId: string) {
    return { success: true, data: await this.rankingService.getSeasonRewards(userId) };
  }

  @Get('current')
  async getCurrentSeasonRanking() {
    try {
      const { entries, season } = await this.rankingService.getCurrentSeasonRanking();
      return { success: true, data: entries, season };
    } catch {
      throw new ServiceUnavailableException('랭킹을 불러오지 못했어요.');
    }
  }
}
