/**
 * 상점 서비스
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { getCosmetic } from '@/common/game-catalog';

@Injectable()
export class ShopService {
  private readonly protectionTicketPrice = 1000;
  private readonly protectionTicketLimit = 3;
  private readonly weeklyProtectionPurchaseLimit = 2;
  private readonly rerollTicketPrice = 300;
  private readonly rerollTicketLimit = 3;

  constructor(private prisma: PrismaService) {}

  async purchaseProtectionTicket(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
      if (!user) throw new Error('사용자를 찾을 수 없습니다');

      const inventory = await tx.inventory.findFirst({
        where: { userId, itemType: 'protection_ticket' },
      });
      const currentQuantity = inventory?.quantity || 0;
      if (currentQuantity >= this.protectionTicketLimit) {
        throw new Error('방지권은 최대 3개까지 보유할 수 있습니다');
      }
      if (user.gold < this.protectionTicketPrice) {
        throw new Error('골드가 부족합니다');
      }

      const weekKeyKst = this.getWeekKeyKst();
      const weeklyPurchases = await tx.shopPurchaseLog.count({
        where: { userId, itemType: 'protection_ticket', weekKeyKst },
      });
      if (weeklyPurchases >= this.weeklyProtectionPurchaseLimit) {
        throw new Error('방지권 주간 구매 한도를 초과했습니다');
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: this.protectionTicketPrice } },
      });

      const updatedInventory = inventory
        ? await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: { increment: 1 } },
          })
        : await tx.inventory.create({
            data: {
              userId,
              itemType: 'protection_ticket',
              rarity: 'common',
              quantity: 1,
            },
          });

      await tx.shopPurchaseLog.create({
        data: {
          userId,
          itemType: 'protection_ticket',
          priceGold: this.protectionTicketPrice,
          quantity: 1,
          weekKeyKst,
        },
      });

      return {
        itemType: updatedInventory.itemType,
        quantity: updatedInventory.quantity,
        gold: updatedUser.gold,
        priceGold: this.protectionTicketPrice,
      };
    });
  }

  async purchaseRerollTicket(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
      if (!user) throw new Error('사용자를 찾을 수 없습니다');

      const inventory = await tx.inventory.findFirst({
        where: { userId, itemType: 'reroll_ticket' },
      });
      if ((inventory?.quantity || 0) >= this.rerollTicketLimit) {
        throw new Error('리롤 티켓은 최대 3개까지 보유할 수 있습니다');
      }
      if (user.gold < this.rerollTicketPrice) {
        throw new Error('골드가 부족합니다');
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: this.rerollTicketPrice } },
      });
      const updatedInventory = inventory
        ? await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: { increment: 1 } },
          })
        : await tx.inventory.create({
            data: { userId, itemType: 'reroll_ticket', rarity: 'common', quantity: 1 },
          });
      await tx.shopPurchaseLog.create({
        data: {
          userId,
          itemType: 'reroll_ticket',
          priceGold: this.rerollTicketPrice,
          quantity: 1,
          weekKeyKst: this.getWeekKeyKst(),
        },
      });

      return {
        itemType: updatedInventory.itemType,
        quantity: updatedInventory.quantity,
        gold: updatedUser.gold,
        priceGold: this.rerollTicketPrice,
      };
    });
  }

  async purchaseCosmetic(userId: string, itemId: string) {
    const item = getCosmetic(itemId);
    if (!item || item.price === null) throw new BadRequestException('상점에서 구매할 수 없는 아이템입니다.');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
      const where = { userId_itemType_itemId: { userId, itemType: 'cosmetic', itemId } };
      const owned = await tx.inventory.findUnique({ where });
      if (owned?.quantity) throw new BadRequestException('이미 보유한 아이템입니다.');
      if (user.gold < item.price!) throw new BadRequestException('골드가 부족합니다.');
      const updated = await tx.user.update({ where: { id: userId }, data: { gold: { decrement: item.price! } } });
      await tx.inventory.upsert({ where, create: { userId, itemType: 'cosmetic', itemId, rarity: item.rarity, quantity: 1 }, update: { quantity: 1 } });
      await tx.shopPurchaseLog.create({ data: { userId, itemType: 'cosmetic', itemId, priceGold: item.price!, weekKeyKst: this.getWeekKeyKst() } });
      return { itemId, gold: updated.gold, name: item.name };
    });
  }

  async equipCosmetic(userId: string, itemId: string) {
    const item = getCosmetic(itemId);
    if (!item) throw new BadRequestException('존재하지 않는 아이템입니다.');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
      const owned = await tx.inventory.findUnique({ where: { userId_itemType_itemId: { userId, itemType: 'cosmetic', itemId } } });
      if (!owned?.quantity) throw new BadRequestException('보유한 아이템만 장착할 수 있어요.');
      const fields = { border: 'equippedBorder', avatar: 'specialAvatarId', decoration: 'equippedDecoration', title: 'equippedTitle', background: 'equippedBackground' } as const;
      const field = fields[item.slot];
      await tx.user.update({ where: { id: userId }, data: { [field]: user[field] === item.value ? null : item.value } });
      if(user[field] !== item.value) await tx.inventory.upsert({where:{userId_itemType_itemId:{userId,itemType:'achievement_event',itemId:'equip'}},create:{userId,itemType:'achievement_event',itemId:'equip',quantity:1},update:{}});
      return { itemId, equipped: user[field] !== item.value };
    });
  }

  private getWeekKeyKst(): string {
    const today = new Date();
    const dateKst = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const year = dateKst.getFullYear();
    const firstDay = new Date(year, 0, 1);
    const dayOfYear = Math.floor((dateKst.getTime() - firstDay.getTime()) / 86400000) + 1;
    const week = Math.ceil((dayOfYear + firstDay.getDay()) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }
}
