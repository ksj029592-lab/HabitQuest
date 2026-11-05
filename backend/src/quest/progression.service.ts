import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { COSMETICS, LEVEL_MILESTONES } from '@/common/game-catalog';

@Injectable()
export class ProgressionService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const claims = await this.prisma.levelRewardClaim.findMany({ where: { userId } });
    const claimed = new Set(claims.map((entry) => entry.level));
    return {
      level: user.level,
      totalExp: user.totalExp,
      expPerLevel: 300,
      milestones: LEVEL_MILESTONES.map((node) => ({
        ...node,
        items: node.itemIds.map((id) => ({ id, ...COSMETICS[id] })),
        status: claimed.has(node.level) ? 'claimed' as const : user.level >= node.level ? 'available' as const : 'locked' as const,
      })),
    };
  }

  async claim(userId: string, level: number) {
    const reward = LEVEL_MILESTONES.find((node) => node.level === level);
    if (!reward) throw new BadRequestException('존재하지 않는 레벨 보상입니다.');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
      if (user.level < level) throw new BadRequestException(`Lv.${level}에 도달해야 받을 수 있어요.`);
      const existing = await tx.levelRewardClaim.findUnique({ where: { userId_level: { userId, level } } });
      if (existing) throw new BadRequestException('이미 받은 레벨 보상입니다.');
      await tx.levelRewardClaim.create({ data: { userId, level } });
      for (const itemId of reward.itemIds) {
        const item = COSMETICS[itemId];
        await tx.inventory.upsert({
          where: { userId_itemType_itemId: { userId, itemType: 'cosmetic', itemId } },
          create: { userId, itemType: 'cosmetic', itemId, rarity: item.rarity, quantity: 1 },
          update: { quantity: 1 },
        });
      }
      const updated = await tx.user.update({ where: { id: userId }, data: { gold: { increment: reward.gold } } });
      return { claimedLevel: level, gold: updated.gold, message: `${reward.name} 보상을 받았어요!` };
    });
  }
}