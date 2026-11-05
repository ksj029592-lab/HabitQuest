import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsString, Matches, MaxLength } from 'class-validator';
import { QuestService } from './quest.service';
import { ProgressionService } from './progression.service';
import { ShopService } from '@/shop/shop.service';
import { Public } from '@/common/session.guard';
import { COSMETICS, LEVEL_MILESTONES } from '@/common/game-catalog';
import { ActivityService } from './activity.service';

class CosmeticActionDto {
  @IsString()
  @MaxLength(80)
  itemId: string;
}

class HabitPreferencesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @Matches(/\S/, { each: true })
  habits: string[];

  @IsString()
  @MaxLength(500)
  note: string;

  @IsIn(['easy', 'normal', 'hard'])
  difficulty: string;
}

class ReminderSettingsDto {
  @IsBoolean()
  enabled: boolean;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time: string;
}

@Controller('users')
export class UserController {
  constructor(private readonly questService: QuestService, private readonly progression: ProgressionService, private readonly shop: ShopService, private readonly activity: ActivityService) {}

  @Post('me/preferences')
  async updatePreferences(@Headers('x-user-id') userId: string, @Body() dto: HabitPreferencesDto) {
    const saved = await this.activity.updatePreferences(userId, dto);
    return { success: true, data: { habits: saved.habits, note: saved.note, difficulty: saved.preferredDifficulty } };
  }

  @Post('me/reminders')
  async updateReminders(@Headers('x-user-id') userId: string, @Body() dto: ReminderSettingsDto) {
    const saved = await this.activity.updateReminder(userId, dto);
    return { success: true, data: { enabled: saved.reminderEnabled, time: saved.reminderTime } };
  }

  @Post('me/reminders/check')
  async checkReminder(@Headers('x-user-id') userId: string) {
    return { success: true, data: await this.activity.checkReminder(userId) };
  }

  @Get('me/calendar')
  async getCalendar(@Headers('x-user-id') userId: string, @Query('month') month: string) {
    return { success: true, data: await this.activity.getCalendar(userId, month) };
  }

  @Get('me/weekly-report')
  async getWeeklyReport(@Headers('x-user-id') userId: string, @Query('start') start?: string) {
    return { success: true, data: await this.activity.getWeeklyReport(userId, start) };
  }

  @Post('me/day-rewards/:days/claim')
  async claimDayReward(@Headers('x-user-id') userId: string, @Param('days', ParseIntPipe) days: number) {
    return { success: true, data: await this.activity.claimDayReward(userId, days) };
  }

  @Public()
  @Get('progression/catalog')
  getRewardCatalog() {
    return { success: true, data: { level: 1, totalExp: 0, expPerLevel: 300, milestones: LEVEL_MILESTONES.map((node) => ({ ...node, items: node.itemIds.map((id) => ({ id, ...COSMETICS[id] })), status: 'locked' })) } };
  }

  @Get('me/progression')
  async getProgression(@Headers('x-user-id') userId: string) {
    return { success: true, data: await this.progression.getTree(userId) };
  }

  @Post('me/level-rewards/:level/claim')
  async claimReward(@Headers('x-user-id') userId: string, @Param('level', ParseIntPipe) level: number) {
    return { success: true, data: await this.progression.claim(userId, level) };
  }

  @Post('me/cosmetics/purchase')
  async purchaseCosmetic(@Headers('x-user-id') userId: string, @Body() dto: CosmeticActionDto) {
    return { success: true, data: await this.shop.purchaseCosmetic(userId, dto.itemId) };
  }

  @Post('me/equipment')
  async equipCosmetic(@Headers('x-user-id') userId: string, @Body() dto: CosmeticActionDto) {
    return { success: true, data: await this.shop.equipCosmetic(userId, dto.itemId) };
  }

  @Get('me')
  async getMe(@Headers('x-user-id') userId?: string) {
    if (!userId) {
      return {
        success: false,
        error: { code: 'USER_REQUIRED', message: '사용자 세션이 필요합니다' },
      };
    }

    try {
      return { success: true, data: await this.questService.getUserState(userId) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: error instanceof Error ? error.message : '사용자 조회에 실패했습니다',
        },
      };
    }
  }
}
