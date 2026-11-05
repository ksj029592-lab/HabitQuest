import { Controller, Headers, Post } from '@nestjs/common';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post('reroll-ticket/purchase')
  async purchaseRerollTicket(@Headers('x-user-id') userId?: string) {
    if (!userId) {
      return {
        success: false,
        error: { code: 'USER_REQUIRED', message: '사용자 세션이 필요합니다' },
      };
    }

    try {
      return { success: true, data: await this.shopService.purchaseRerollTicket(userId) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SHOP_PURCHASE_FAILED',
          message: error instanceof Error ? error.message : '구매에 실패했습니다',
        },
      };
    }
  }

  @Post('protection-ticket/purchase')
  async purchaseProtectionTicket(@Headers('x-user-id') userId?: string) {
    if (!userId) {
      return {
        success: false,
        error: { code: 'USER_REQUIRED', message: '사용자 세션이 필요합니다' },
      };
    }

    try {
      return {
        success: true,
        data: await this.shopService.purchaseProtectionTicket(userId),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SHOP_PURCHASE_FAILED',
          message: error instanceof Error ? error.message : '구매에 실패했습니다',
        },
      };
    }
  }
}
