/**
 * 메인 애플리케이션 모듈
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SessionGuard } from '@/common/session.guard';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@/prisma/prisma.module';
import { PersonaModule } from '@/persona/persona.module';
import { QuestModule } from '@/quest/quest.module';
import { AiModule } from '@/ai/ai.module';
import { ShopModule } from '@/shop/shop.module';
import { RankingModule } from '@/ranking/ranking.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.model-router.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    PersonaModule,
    QuestModule,
    AiModule,
    ShopModule,
    RankingModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: SessionGuard }],
})
export class AppModule {}
