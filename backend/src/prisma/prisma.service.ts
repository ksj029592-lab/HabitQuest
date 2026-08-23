/**
 * Prisma ORM 서비스
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected');
    } catch (error) {
      console.warn('⚠️ Database unavailable; running with API fallbacks', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
