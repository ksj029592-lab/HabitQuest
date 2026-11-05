import { ShopService } from './shop.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('Server cosmetic inventory', () => {
  const tx = { user: { update: jest.fn() }, inventory: { findUnique: jest.fn(), upsert: jest.fn() }, shopPurchaseLog: { create: jest.fn() } };
  const prisma = { $transaction: jest.fn() };
  let service: ShopService;
  beforeEach(() => {
    jest.resetAllMocks();
    tx.user.update.mockResolvedValue({ gold: 1000, equippedBorder: 'rainbow_ring' });
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    service = new ShopService(prisma as unknown as PrismaService);
  });
  it('uses the server price and a unique item ID when purchasing', async () => {
    await service.purchaseCosmetic('user', 'border_fire_ring');
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'user' }, data: { gold: { decrement: 500 } } });
    expect(tx.inventory.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ itemId: 'border_fire_ring' }) }));
  });
  it('rejects duplicate purchases and unowned equipment', async () => {
    tx.inventory.findUnique.mockResolvedValueOnce({ quantity: 1 });
    await expect(service.purchaseCosmetic('user', 'border_fire_ring')).rejects.toThrow('이미');
    await expect(service.equipCosmetic('user', 'border_crystal_ring')).rejects.toThrow('보유');
    expect(tx.inventory.upsert).not.toHaveBeenCalled();
  });
  it('keeps rainbow and crystal equipment separate', async () => {
    tx.inventory.findUnique.mockResolvedValue({ quantity: 1 });
    await service.equipCosmetic('user', 'border_crystal_ring');
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'user' }, data: { equippedBorder: 'crystal_ring' } });
  });
  it('does not allow invalid IDs or reward-only items to be purchased', async () => {
    for (const itemId of ['toString', 'not-real', 'border_rainbow_ring']) await expect(service.purchaseCosmetic('user', itemId)).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});