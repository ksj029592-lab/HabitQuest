import type { Prisma } from '@prisma/client';
import { questCategoryIds } from './habit-categories';

it('matches allowed habit labels, preserves slot order, and never writes an unknown category', async () => {
  const upsert = jest.fn(async ({ where }: { where: { name: string } }) => ({ id: where.name }));
  const tx = { habitCategory: { upsert } } as unknown as Prisma.TransactionClient;
  await expect(questCategoryIds(tx, ['독서', '산책'], [
    { categoryId: '산책' }, { categoryId: '독서' }, { categoryId: '허용되지 않은 분류' },
  ])).resolves.toEqual(['산책', '독서', '독서']);
  expect(upsert).toHaveBeenCalledTimes(2);
});
