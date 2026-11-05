import { ProgressionService } from './progression.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('Level rewards', () => {
  const tx = { user: { update: jest.fn() }, levelRewardClaim: { findUnique: jest.fn(), create: jest.fn() }, inventory: { upsert: jest.fn() } };
  const prisma = { user: { findUniqueOrThrow: jest.fn() }, levelRewardClaim: { findMany: jest.fn() }, $transaction: jest.fn() };
  let service: ProgressionService;
  beforeEach(() => {
    jest.resetAllMocks();
    tx.user.update.mockResolvedValue({ id: 'user', level: 10, gold: 0, totalExp: 2700 });
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'user', level: 10, totalExp: 2700 });
    prisma.levelRewardClaim.findMany.mockResolvedValue([{ level: 2 }]);
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    service = new ProgressionService(prisma as unknown as PrismaService);
  });
  it('shows locked, available and claimed nodes separately', async () => {
    const result = await service.getTree('user');
    expect(result.milestones.find((node) => node.level === 2)?.status).toBe('claimed');
    expect(result.milestones.find((node) => node.level === 5)?.status).toBe('available');
    expect(result.milestones.find((node) => node.level === 20)?.status).toBe('locked');
  });
  it('unlocks every reached reward for the level-45 persona and only locks level 50', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'user', level: 45, totalExp: 13200 });
    prisma.levelRewardClaim.findMany.mockResolvedValue([]);
    const result = await service.getTree('user');
    expect(result.milestones.filter((node) => node.status === 'available').map((node) => node.level)).toEqual([2, 5, 10, 15, 20, 30, 40]);
    expect(result.milestones.filter((node) => node.status === 'locked').map((node) => node.level)).toEqual([50]);
  });
  it('rejects a reward above the current level', async () => {
    await expect(service.claim('user', 50)).rejects.toThrow();
    expect(tx.levelRewardClaim.create).not.toHaveBeenCalled();
  });
  it('rejects repeated reward claims', async () => {
    tx.levelRewardClaim.findUnique.mockResolvedValue({ level: 10 });
    await expect(service.claim('user', 10)).rejects.toThrow();
    expect(tx.inventory.upsert).not.toHaveBeenCalled();
  });
  it('records a claim and grants its unique cosmetic in the same transaction', async () => {
    await service.claim('user', 10);
    expect(tx.levelRewardClaim.create).toHaveBeenCalledWith({ data: { userId: 'user', level: 10 } });
    expect(tx.inventory.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ itemId: 'border_gold_frame', quantity: 1 }) }));
  });
});