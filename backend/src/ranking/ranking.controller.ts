import { Controller, Get } from '@nestjs/common';
import { RankingService } from './ranking.service';

@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('current')
  async getCurrentSeasonRanking() {
    try {
      return {
        success: true,
        data: await this.rankingService.getCurrentSeasonRanking(),
      };
    } catch (error) {
      console.error('Ranking data unavailable:', error);
      return {
        success: true,
        data: [],
        degraded: true,
      };
    }
  }
}
