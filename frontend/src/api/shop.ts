import { apiClient } from './client';
import { ApiResponse } from '@types';

interface ProtectionTicketPurchase {
  itemType: 'protection_ticket';
  quantity: number;
  gold: number;
  priceGold: number;
}

interface RerollTicketPurchase {
  itemType: 'reroll_ticket';
  quantity: number;
  gold: number;
  priceGold: number;
}

export const shopApi = {
  purchaseRerollTicket: async (userId: string): Promise<ApiResponse<RerollTicketPurchase>> => {
    return apiClient.post<RerollTicketPurchase>('/shop/reroll-ticket/purchase', undefined, {
      headers: { 'x-user-id': userId },
    });
  },
  purchaseProtectionTicket: async (
    userId: string,
  ): Promise<ApiResponse<ProtectionTicketPurchase>> => {
    return apiClient.post<ProtectionTicketPurchase>(
      '/shop/protection-ticket/purchase',
      undefined,
      { headers: { 'x-user-id': userId } },
    );
  },
};