import { AiService, GeneratedQuest } from '@/ai/ai.service';
import { PrismaService } from '@/prisma/prisma.service';
import { PersonaService } from './persona.service';

jest.mock('node:crypto', () => ({ ...jest.requireActual('node:crypto'), randomUUID: () => 'generated-uuid' }));

describe('PersonaService', () => {
  it('persists generated quests using the selected habits and difficulty', async () => {
    const persona = {
      id: 'persona-1',
      name: '초심자',
      role: 'beginner',
      initialLevel: 1,
      initialGold: 0,
      initialStreak: 0,
      bestStreak: 0,
      totalQuestCompleted: 0,
      monthlySuccessRate: 0,
    };
    const generatedQuests: GeneratedQuest[] = [0, 1, 2].map((slotNo) => ({
      id: `generated-${slotNo}`,
      userId: 'demo-user',
      categoryId: 'health',
      questDateKst: '2026-10-18',
      difficulty: 'easy',
      title: `맞춤 운동 퀘스트 ${slotNo + 1}`,
      description: `운동 목표 ${slotNo + 1}을 실천하세요.`,
      status: 'pending',
      expReward: 100,
      goldReward: 50,
      rankingPointReward: 10,
      slotNo: slotNo as 0 | 1 | 2,
    }));
    const transaction = {
      testPersona: { findFirst: jest.fn().mockResolvedValue(persona) },
      user: { create: jest.fn().mockResolvedValue({ id: 'user-1', level: 1, totalExp: 0, gold: 0 }) },
      streak: { create: jest.fn() },
      inventory: { create: jest.fn() },
      habitCategory: {
        upsert: jest.fn().mockImplementation(({ where }) => ({ id: `category-${where.name}` })),
      },
      dailyQuest: {
        create: jest.fn().mockImplementation(({ data }) => ({ id: `quest-${data.slotNo}`, ...data })),
      },
      attendance: { upsert: jest.fn() },
      userSession: { create: jest.fn() },
    };
    const prisma = { testPersona: transaction.testPersona, $transaction: (operation: (tx: typeof transaction) => unknown) => operation(transaction) };
    const aiService = { generateQuests: jest.fn().mockResolvedValue(generatedQuests) };
    const PersonaServiceWithAi = PersonaService as unknown as new (
      prisma: PrismaService,
      aiService: AiService,
    ) => PersonaService;
    const personaService = new PersonaServiceWithAi(
      prisma as unknown as PrismaService,
      aiService as unknown as AiService,
    );
    const sessionInput = {
      personaId: 'persona-1',
      habits: ['운동과 건강'],
      note: '',
      difficulty: 'easy' as const,
    };

    type SessionInput = typeof sessionInput;
    const createSession = personaService.createSession.bind(personaService) as unknown as (
      input: SessionInput,
    ) => Promise<unknown>;
    await createSession(sessionInput);

    expect(aiService.generateQuests).toHaveBeenCalledWith({
      personaName: '초심자',
      habits: ['운동과 건강'],
      note: '',
      difficulty: 'easy',
    });
    expect(transaction.dailyQuest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'generated-uuid',
        categoryId: 'category-운동과 건강',
        title: '맞춤 운동 퀘스트 1',
        description: '운동 목표 1을 실천하세요.',
        difficulty: 'easy',
        slotNo: 0,
      }),
    });
    expect(transaction.dailyQuest.create).toHaveBeenCalledTimes(3);
  });
});