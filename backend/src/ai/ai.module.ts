import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ModelRouterClient } from './model-router.client';

@Module({
  controllers: [AiController],
  providers: [AiService, ModelRouterClient],
  exports: [AiService],
})
export class AiModule {}
