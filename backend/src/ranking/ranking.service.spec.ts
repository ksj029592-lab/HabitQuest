import { PrismaService } from '@/prisma/prisma.service';
import { RankingService } from './ranking.service';

describe('RankingService season boundaries', () => {
  it.each([
    ['2026-02-28T15:00:00.000Z', '2026-03', '2026-03-31T15:00:00.000Z'],
    ['2026-12-31T14:59:59.999Z', '2026-12', '2026-12-31T15:00:00.000Z'],
    ['2026-12-31T15:00:00.000Z', '2027-01', '2027-01-31T15:00:00.000Z'],
    ['2028-01-31T15:00:00.000Z', '2028-02', '2028-02-29T15:00:00.000Z'],
  ])('repairs a legacy end date using KST for %s', async (now, yearMonth, end) => {
    const rankingSeason = {
      findUnique: jest.fn().mockResolvedValue({ endAtKst: new Date(0) }),
      upsert: jest.fn(),
    };
    const db = { rankingSeason } as unknown as PrismaService;
    await new RankingService(db).ensureCurrentSeason(db, new Date(now));
    expect(rankingSeason.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { yearMonth },
      update: { endAtKst: new Date(end) },
    }));
  });

  it('returns a correct existing season without writing to the shared season row', async () => {
    const season = { id: 'existing', endAtKst: new Date('2026-03-31T15:00:00Z') };
    const rankingSeason = { findUnique: jest.fn().mockResolvedValue(season), upsert: jest.fn() };
    const db = { rankingSeason } as unknown as PrismaService;
    await expect(new RankingService(db).ensureCurrentSeason(db, new Date('2026-03-15T00:00:00Z'))).resolves.toBe(season);
    expect(rankingSeason.upsert).not.toHaveBeenCalled();
  });
});
