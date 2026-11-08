import { HabitService } from '@/habit/habit.service';
import { QuestService } from './quest.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RankingService } from '@/ranking/ranking.service';
import { AiService } from '@/ai/ai.service';

describe('Quest completion reflection', () => {
  const answer = '주인공이 실패를 다시 시도하는 부분을 읽고 저도 꾸준히 도전해야겠다고 느꼈어요.';
  const quest = {
    id: 'quest-1', userId: 'user-1', title: '책 10페이지 읽기', description: '책을 읽고 생각을 남겨보세요.',
    questDateKst: '2026-10-25', status: 'pending', verificationQuestion: '읽은 내용 중 기억에 남는 생각은?',
    verificationAnswer: null, verificationFeedback: null, categoryId: 'reading', difficulty: 'easy',
    expReward: 100, goldReward: 50, slotNo: 0, completedAt: null,
  };
  const ai = { createReflectionQuestion: jest.fn(), reviewReflection: jest.fn() };
  const prisma = { dailyQuest: { findUnique: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() }, $transaction: jest.fn() };
  const ranking = { ensureCurrentSeason: jest.fn(), calculatePoint: jest.fn() };
  let service: QuestService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-25T03:00:00Z'));
    jest.resetAllMocks();
    prisma.dailyQuest.findUnique.mockResolvedValue({ ...quest });
    ai.reviewReflection.mockResolvedValue({ approved: true, feedback: '다시 도전할 용기를 발견했네요!' });
    service = new QuestService(prisma as unknown as PrismaService, ranking as unknown as RankingService, ai as unknown as AiService, {} as HabitService);
  });

  afterEach(() => jest.useRealTimers());

  it('reuses the question already stored on the quest', async () => {
    await expect(service.getVerificationQuestion(quest.id, quest.userId)).resolves.toEqual({ question: quest.verificationQuestion });
    expect(ai.createReflectionQuestion).not.toHaveBeenCalled();
  });

  it('requires an answer even when the completion endpoint is called directly', async () => {
    await expect(service.completeQuest(quest.id, quest.userId)).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('saves a new question without replacing a question from a competing request', async () => {
    prisma.dailyQuest.findUnique.mockResolvedValueOnce({ ...quest, verificationQuestion: null });
    ai.createReflectionQuestion.mockResolvedValue({ question: '어떤 부분이 기억에 남았나요?' });
    await expect(service.getVerificationQuestion(quest.id, quest.userId)).resolves.toEqual({ question: quest.verificationQuestion });
    expect(prisma.dailyQuest.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: quest.id, userId: quest.userId, status: 'pending', verificationQuestion: null }),
      data: { verificationQuestion: '어떤 부분이 기억에 남았나요?' },
    });
  });

  it('rejects requests without a user or with whitespace-only answers', async () => {
    await expect(service.completeQuest(quest.id, undefined, answer)).rejects.toThrow();
    await expect(service.completeQuest(quest.id, quest.userId, '   ')).rejects.toThrow();
    expect(ai.reviewReflection).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not pay twice if another request already claimed the quest', async () => {
    ranking.ensureCurrentSeason.mockResolvedValue({ id: 'season-1' });
    const tx = { $queryRaw: jest.fn().mockResolvedValue([{ status: 'active' }]), user: { update: jest.fn() }, dailyQuest: { findUnique: jest.fn().mockResolvedValue(quest), updateMany: jest.fn().mockResolvedValue({ count: 0 }) } };
    prisma.$transaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => callback(tx));
    await expect(service.completeQuest(quest.id, quest.userId, answer)).rejects.toThrow('이미 완료');
    expect(ranking.calculatePoint).not.toHaveBeenCalled();
  });

  it.each([{ userId: 'other-user' }, { questDateKst: '2026-10-24' }, { status: 'completed' }, { verificationQuestion: null }])('rejects an ineligible quest: %j', async (overrides) => {
    prisma.dailyQuest.findUnique.mockResolvedValue({ ...quest, ...overrides });
    await expect(service.completeQuest(quest.id, quest.userId, answer)).rejects.toThrow();
    expect(ai.reviewReflection).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not pay rewards for rejected answers or AI errors', async () => {
    ai.reviewReflection.mockResolvedValueOnce({ approved: false, feedback: '어떤 부분이 기억에 남았는지 한 가지 알려주세요.' });
    await expect(service.completeQuest(quest.id, quest.userId, answer)).rejects.toThrow('어떤 부분');
    ai.reviewReflection.mockRejectedValueOnce(new Error('AI unavailable'));
    await expect(service.completeQuest(quest.id, quest.userId, answer)).rejects.toThrow('AI unavailable');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns the recorded capped rewards and saved reflection in history', async () => {
    const db = { dailyQuest: { findMany: jest.fn().mockResolvedValue([{ ...quest, status: 'completed', verificationAnswer: answer, completionLog: [{ goldReward: 0, rankingPointAwarded: 0 }] }]) } };
    const records = await new QuestService(db as unknown as PrismaService, ranking as unknown as RankingService, ai as unknown as AiService, {} as HabitService).getQuestHistory('user-1');
    expect(records[0]).toEqual(expect.objectContaining({ goldReward: 0, rankingPointAwarded: 0, verificationAnswer: answer }));
    expect(db.dailyQuest.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1', status: 'completed' } }));
  });

  it('calculates monthly statistics from generated and completed database quests', async () => {
    const db = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', level: 1, totalExp: 0, gold: 0, habits: [], note: '', preferredDifficulty: 'easy' }) },
      streak: { findUnique: jest.fn().mockResolvedValue(null) },
      inventory: { findMany: jest.fn().mockResolvedValue([]) },
      rankingPointLog: { aggregate: jest.fn().mockResolvedValue({ _sum: { finalPoint: 0 } }) },
      attendance: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([{ dateKst: '2026-10-22' }, { dateKst: '2026-10-23' }, { dateKst: '2026-10-25' }]) },
      dailyQuest: { count: jest.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(2).mockResolvedValueOnce(6) },
    };
    ranking.ensureCurrentSeason.mockResolvedValue({ id: 'season-1' });
    const state = await new QuestService(db as unknown as PrismaService, ranking as unknown as RankingService, ai as unknown as AiService, {} as HabitService).getUserState('user-1');
    expect(state.stats).toEqual({ totalQuestsCompleted: 12, thisMonthQuestsCompleted: 2, monthlySuccessRate: 33, averageStreakLength: 1.5 });
    expect(db.dailyQuest.count).toHaveBeenCalledWith({ where: { userId: 'user-1', questDateKst: { gte: '2026-10-01', lte: '2026-10-25' } } });
  });

  it('stores the accepted reflection atomically with the reward claim', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ status: 'active' }]),
      dailyQuest: { findUnique: jest.fn().mockResolvedValue(quest), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue({ ...quest, status: 'completed', verificationAnswer: answer, verificationFeedback: '다시 도전할 용기를 발견했네요!', completedAt: new Date() }) },
      questCompletionLog: { aggregate: jest.fn().mockResolvedValue({ _sum: { goldReward: 0 } }), count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      rankingPointLog: { aggregate: jest.fn().mockResolvedValue({ _sum: { finalPoint: 0 } }), create: jest.fn() },
      user: { update: jest.fn().mockResolvedValue({ gold: 0, totalExp: 0, level: 1 }) },
      attendance: { findUnique: jest.fn().mockResolvedValue({ checked: true }) },
    };
    ranking.ensureCurrentSeason.mockResolvedValue({ id: 'season-1' });
    ranking.calculatePoint.mockReturnValue({ finalPoint: 10, penaltyRate: 0 });
    prisma.$transaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => callback(tx));
    const result = await service.completeQuest(quest.id, quest.userId, answer);
    expect(ai.reviewReflection).toHaveBeenCalledWith({ title: quest.title, description: quest.description, question: quest.verificationQuestion, answer });
    expect(tx.dailyQuest.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ verificationAnswer: answer, verificationFeedback: result.verificationFeedback, status: 'completed' }) }));
    expect(tx.questCompletionLog.create).toHaveBeenCalledTimes(1);
  });
});

describe('Daily quest slot backfill', () => {
  it('adds only missing slots and preserves existing completed quests without replaying streak protection', async () => {
    const existing = { id: 'keep', slotNo: 0, status: 'completed' };
    const habit = { id: 'h', name: '독서와 학습', archived: false, updatedAt: new Date(), schedule: {}, recentTitles: [] };
    const created: any[] = [];
    const tx = {
      user: { update: jest.fn() }, userHabit: { findMany: jest.fn().mockResolvedValue([habit]) },
      dailyQuest: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockImplementation(async (args) => args.select ? [existing] : [existing, ...created]),
        create: jest.fn().mockImplementation(async ({ data }) => { created.push(data); return data; }),
      },
      streak: { findUnique: jest.fn().mockResolvedValue({ currentStreak: 5, lastAttendanceDateKst: '2000-01-01' }), update: jest.fn() },
      inventory: { findFirst: jest.fn() },
      habitCategory: { upsert: jest.fn().mockResolvedValue({ id: 'cat' }) },
    };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ habits: [habit.name], preferredDifficulty: 'normal' }) }, $transaction: jest.fn(async (fn) => fn(tx)) };
    const ai = { generateQuests: jest.fn().mockResolvedValue([1, 2].map(n => ({ title: `과제 ${n}`, description: '읽기', categoryId: habit.name, difficulty: 'normal', expReward: 100, goldReward: 50 }))) };
    const service = new QuestService(prisma as any, {} as RankingService, ai as any, { candidates: jest.fn().mockResolvedValue([habit]) } as any);
    jest.spyOn(service, 'getDailyQuests').mockResolvedValue([existing] as any);
    jest.spyOn(service as any, 'toDto').mockImplementation(q => q);
    const result = await service.ensureDailyQuests('u', { personaName: '초심자' } as any);
    expect(ai.generateQuests).toHaveBeenCalledWith(expect.objectContaining({ count: 2 }));
    expect(created.map(q => q.slotNo)).toEqual([1, 2]);
    expect(result.quests[0]).toBe(existing);
    expect(tx.inventory.findFirst).not.toHaveBeenCalled();
    expect(tx.streak.update).not.toHaveBeenCalled();
  });
});
