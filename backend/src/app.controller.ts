/**
 * 애플리케이션 메인 컨트롤러
 */
import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';
import { AiService } from '@/ai/ai.service';
import { Public } from '@/common/session.guard';

@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly aiService: AiService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async readiness() {
    await this.appService.assertDatabaseReady();
    return { status: 'ready', revision: process.env.APP_REVISION || 'local', foundryConfigured: this.aiService.isRouterConfigured() };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
