import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const personas = [
  {
    name: '새로운 도전',
    role: 'beginner',
    initialLevel: 1,
    initialGold: 0,
    initialStreak: 0,
    bestStreak: 0,
    totalQuestCompleted: 0,
    monthlySuccessRate: 0,
  },
  {
    name: '꾸준한 참여자',
    role: 'active',
    initialLevel: 15,
    initialGold: 2500,
    initialStreak: 23,
    bestStreak: 45,
    totalQuestCompleted: 156,
    monthlySuccessRate: 85,
  },
  {
    name: '전설의 퀘스터',
    role: 'advanced',
    initialLevel: 45,
    initialGold: 8000,
    initialStreak: 89,
    bestStreak: 120,
    totalQuestCompleted: 1203,
    monthlySuccessRate: 95,
  },
];

async function main() {
  for (const persona of personas) {
    const existing = await prisma.testPersona.findFirst({
      where: { role: persona.role },
    });

    if (existing) {
      await prisma.testPersona.update({
        where: { id: existing.id },
        data: persona,
      });
    } else {
      await prisma.testPersona.create({ data: persona });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
