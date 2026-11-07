/**
 * 애플리케이션 서비스
 */
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async assertDatabaseReady() {
    try {
      // Resolve the tables and fields of the deployed upgrade scripts without reading any user rows.
      await this.prisma.$queryRaw`
        SELECT u."habits", u."note", u."preferredDifficulty", u."avatarIndex", u."specialAvatarId",
               u."equippedTitle", u."equippedBorder", u."equippedDecoration", u."equippedBackground", u."reminderEnabled",
               u."reminderTime", u."reminderLastDateKst", s."userId", i."itemId", p."itemId",
               q."verificationQuestion", q."verificationAnswer", q."verificationFeedback", l."level", d."days"
        FROM "users" u, "user_sessions" s, "inventory" i, "shop_purchase_logs" p, "daily_quests" q,
             "level_reward_claims" l, "day_reward_claims" d
        LIMIT 0
      `;
      await this.prisma.$queryRaw`SELECT "jpeg" FROM "profile_photos" LIMIT 0`;
    } catch {
      throw new ServiceUnavailableException('Database schema is not ready');
    }
  }

  getHello(): string {
    return 'HabitQuest API Server v0.1.0';
  }
}
