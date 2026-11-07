/**
 * 페르소나 모듈
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AiModule } from '@/ai/ai.module';
import { PersonaController } from './persona.controller';
import { SessionStartLimitInterceptor } from './session-start-limit.interceptor';
import { PersonaService } from './persona.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [PersonaController],
  providers: [PersonaService, SessionStartLimitInterceptor],
  exports: [PersonaService],
})
export class PersonaModule {}
