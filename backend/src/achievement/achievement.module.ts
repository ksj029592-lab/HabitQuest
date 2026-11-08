import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Module,
  Post,
} from "@nestjs/common";
import { IsString, MaxLength } from "class-validator";
import { PrismaService } from "@/prisma/prisma.service";
import { PrismaModule } from "@/prisma/prisma.module";
import { ACHIEVEMENTS, qualifies } from "./catalog";
import { historyOf } from "@/habit/habit.service";
import { kstDate, scheduleAt } from "@/habit/schedule";
@Injectable()
export class AchievementService {
  constructor(private readonly db: PrismaService) {}
  async collection(userId: string, claim = false) {
    return this.db.$transaction(
      async (tx) => {
        const user = claim
          ? await tx.user.update({
              where: { id: userId },
              data: { updatedAt: new Date() },
            })
          : await tx.user.findUniqueOrThrow({ where: { id: userId } });
        const [
          completed,
          streak,
          purchases,
          points,
          rewards,
          habits,
          inventory,
        ] = await Promise.all([
          tx.dailyQuest.count({ where: { userId, status: "completed" } }),
          tx.streak.findUnique({ where: { userId } }),
          tx.shopPurchaseLog.count({ where: { userId } }),
          tx.rankingPointLog.count({
            where: { userId, finalPoint: { gt: 0 } },
          }),
          tx.seasonRewardLog.count({ where: { userId } }),
          tx.userHabit.findMany({ where: { userId } }),
          tx.inventory.findMany({ where: { userId } }),
        ]);
        const events = inventory.filter(
          (i) => i.itemType === "achievement_event",
        );
        const values: Record<string, number | null> = {
          quest: completed,
          streak: Math.max(streak?.bestStreak ?? 0, streak?.currentStreak ?? 0),
          level: user.level,
          gold: null,
          manual: events.filter((i) => i.itemId.startsWith("habit:")).length,
          schedule: events.filter((i) => i.itemId === "schedule").length,
          weekly: habits.filter(
            (h) =>
              !h.archived &&
              scheduleAt(historyOf(h.scheduleHistory), kstDate())?.active &&
              scheduleAt(historyOf(h.scheduleHistory), kstDate())?.mode ===
                "weekly",
          ).length,
          purchase: purchases,
          equip: events.filter((i) => i.itemId === "equip").length,
          season: points,
          reward: rewards,
        };
        const entries = [];
        for (const item of ACHIEVEMENTS) {
          let receipt = inventory.find(
            (i) =>
              i.itemType === "achievement" &&
              i.itemId === item.id &&
              i.quantity > 0,
          );
          if (
            claim &&
            !receipt &&
            qualifies(item.target, values[item.metric])
          ) {
            receipt = await tx.inventory.upsert({
              where: {
                userId_itemType_itemId: {
                  userId,
                  itemType: "achievement",
                  itemId: item.id,
                },
              },
              create: {
                userId,
                itemType: "achievement",
                itemId: item.id,
                quantity: 1,
                rarity: item.rarity,
              },
              update: { quantity: 1 },
            });
            for (const [itemType, itemId] of [
              ["achievement_title", item.titleId],
              ["trophy", item.trophyId],
            ])
              await tx.inventory.upsert({
                where: { userId_itemType_itemId: { userId, itemType, itemId } },
                create: {
                  userId,
                  itemType,
                  itemId,
                  quantity: 1,
                  rarity: item.rarity,
                },
                update: { quantity: 1 },
              });
          }
          entries.push({
            ...item,
            progress: values[item.metric],
            earned: !!receipt,
            earnedAt: receipt?.createdAt,
            equipped: user.equippedTitle === item.title,
            description:
              item.metric === "gold"
                ? "누적 획득량 원장이 없어 판정 보류"
                : (
                    {
                      quest: `퀘스트 누적 ${item.target}회 완료`,
                      streak: `전체 출석 최고 스트릭 ${item.target}일`,
                      level: `서버 레벨 ${item.target} 달성`,
                      manual: `기능 도입 후 프로필에서 직접 추가한 습관 ${item.target}개`,
                      schedule: "기능 도입 후 반복 일정 직접 설정",
                      weekly: "현재 활성 주간 목표 습관 3개",
                      purchase: "실제 상점 구매 기록 1회",
                      equip: "기능 도입 후 코스메틱 직접 장착",
                      season: "실제 양수 시즌 포인트 기록",
                      reward: "실제 시즌 보상 지급 기록",
                    } as Record<string, string>
                  )[item.metric],
            resource: `/trophies/${item.id}.png`,
          });
        }
        return entries;
      },
      { timeout: 15000 },
    );
  }
  async equip(userId: string, id: string) {
    const item = ACHIEVEMENTS.find((i) => i.titleId === id);
    if (!item) throw new BadRequestException("알 수 없는 칭호입니다.");
    return this.db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { updatedAt: new Date() },
      });
      const owned = await tx.inventory.findUnique({
        where: {
          userId_itemType_itemId: {
            userId,
            itemType: "achievement_title",
            itemId: id,
          },
        },
      });
      if (!owned?.quantity)
        throw new BadRequestException("획득한 칭호만 장착할 수 있어요.");
      await tx.user.update({
        where: { id: userId },
        data: {
          equippedTitle: user.equippedTitle === item.title ? null : item.title,
        },
      });
      if (user.equippedTitle !== item.title)
        await tx.inventory.upsert({
          where: {
            userId_itemType_itemId: {
              userId,
              itemType: "achievement_event",
              itemId: "equip",
            },
          },
          create: {
            userId,
            itemType: "achievement_event",
            itemId: "equip",
            quantity: 1,
          },
          update: {},
        });
      return { equipped: user.equippedTitle !== item.title };
    });
  }
}
class TitleDto {
  @IsString() @MaxLength(80) id: string;
}
@Controller("achievements")
class AchievementController {
  constructor(private readonly service: AchievementService) {}
  @Get() async list(@Headers("x-user-id") id: string) {
    return { success: true, data: await this.service.collection(id) };
  }
  @Post("check") async check(@Headers("x-user-id") id: string) {
    return { success: true, data: await this.service.collection(id, true) };
  }
  @Post("title") async title(
    @Headers("x-user-id") id: string,
    @Body() body: TitleDto,
  ) {
    return { success: true, data: await this.service.equip(id, body.id) };
  }
}
@Module({
  imports: [PrismaModule],
  providers: [AchievementService],
  controllers: [AchievementController],
})
export class AchievementModule {}
