/**
 * 퀨스트 모듈
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';

@Module({
  imports: [PrismaModule],
  controllers: [QuestController],
  providers: [QuestService],
  exports: [QuestService],
})
export class QuestModule {}
