/**
 * 퀨스트 모듈
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { RankingModule } from '@/ranking/ranking.module';
import { AiModule } from '@/ai/ai.module';
import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';
import { UserController } from './user.controller';
import { ProgressionService } from './progression.service';
import { ShopModule } from '@/shop/shop.module';
import { ActivityService } from './activity.service';

@Module({
  imports: [PrismaModule, RankingModule, AiModule, ShopModule],
  controllers: [QuestController, UserController],
  providers: [QuestService, ProgressionService, ActivityService],
  exports: [QuestService],
})
export class QuestModule {}
