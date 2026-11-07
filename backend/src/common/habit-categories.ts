import type { Prisma } from '@prisma/client';

export const DEFAULT_HABITS = ['운동과 건강', '독서와 학습', '집중력과 생산성'];

export function habitChoices(habits: string[]) {
  const labels = [...new Set(habits.map((habit) => habit.trim()).filter(Boolean))];
  return labels.length ? labels : DEFAULT_HABITS;
}

export async function questCategoryIds(tx: Prisma.TransactionClient, habits: string[], quests: { categoryId: string }[]) {
  const allowed = habitChoices(habits);
  const names = quests.map((quest, index) => allowed.includes(quest.categoryId) ? quest.categoryId : allowed[index % allowed.length]);
  const ids = new Map<string, string>();
  for (const name of [...new Set(names)].sort()) {
    const category = await tx.habitCategory.upsert({ where: { name }, create: { name }, update: {} });
    ids.set(name, category.id);
  }
  return names.map((name) => ids.get(name)!);
}
