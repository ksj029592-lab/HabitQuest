import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { INestApplication, ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { settleSeason } from './ranking/season-settlement';
import request = require('supertest');
import { AppModule } from './app.module';
import { ModelRouterClient } from './ai/model-router.client';
import { PrismaService } from './prisma/prisma.service';
import { HabitService } from './habit/habit.service';
import { dailySchedule, kstDate, shiftDate, weekStart } from './habit/schedule';

const testDatabase = process.env.HABITQUEST_TEST_DATABASE_URL;
const integration = testDatabase ? describe : describe.skip;

integration('HabitQuest HTTP and isolated PostgreSQL', () => {
  const personaId = randomUUID();
  const originalDatabase = process.env.DATABASE_URL;
  const generation = { quests: [1, 2, 3].map((slot) => ({
    title: `습관 퀘스트 ${slot}`, description: '읽은 내용을 기록해요.', expReward: 110, goldReward: 999,
  })) };
  const router = {
    isConfigured: () => true,
    completeJson: jest.fn(async (instruction: string, input: {habits?:string[];count?:number}) => {
      if (instruction.startsWith('Create one')) return { question: '무엇을 배웠나요?' };
      if (instruction.startsWith('Review')) return { approved: true, feedback: '기록을 남겼어요.' };
      return { quests: (input.habits ?? ['독서']).slice(0,input.count ?? 3).map((categoryId, i) => ({...generation.quests[i], categoryId})) };
    }),
  };
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());
  const preferences = { personaName: '테스트', habits: ['독서', '독서2', '독서3'], difficulty: 'hard' };
  const answer = '책을 읽고 기억에 남은 내용을 기록했어요.';

  beforeAll(async () => {
    const url = new URL(testDatabase);
    if (url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' ||
        url.pathname !== '/habitquest_test' || url.search || url.hash) {
      throw new Error('Integration tests require a disposable habitquest_test database at 127.0.0.1');
    }
    process.env.DATABASE_URL = testDatabase;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ModelRouterClient).useValue(router).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.testPersona.create({ data: {
      id: personaId, name: '테스트', role: 'beginner', initialLevel: 1, initialGold: 2500,
      initialStreak: 4, bestStreak: 4, totalQuestCompleted: 0, monthlySuccessRate: 0,
    } });
  });

  afterAll(async () => {
    await app?.close();
    if (originalDatabase === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabase;
  });

  const start = async () => {
    const response = await api().post('/session/start')
      .send({ personaId, habits: ['독서', '독서2', '독서3'], difficulty: 'hard' }).expect(201);
    expect(response.body.success).toBe(true);
    return { token: `Bearer ${response.body.data.sessionId}`, userId: response.body.data.personaData.userId as string };
  };

  it('checks readiness, rejects invalid signup input, and keeps the active session compatible', async () => {
    await api().get('/ready').expect(200).expect(({ body }) => {
      expect(body).toMatchObject({ status: 'ready', foundryConfigured: true });
    });
    const calls = router.completeJson.mock.calls.length;
    await api().post('/session/start').send({ personaId, habits: Array(9).fill('독서') }).expect(400);
    expect(router.completeJson).toHaveBeenCalledTimes(calls);
    const { token, userId } = await start();
    await api().get('/session/current').set('Authorization', token).expect(200)
      .expect(({ body }) => expect(body.data.userId).toBe(userId));
    await api().get('/users/me').set('Authorization', token).set('x-user-id', 'another-user').expect(403);
    const legacyToken = randomUUID();
    await prisma.userSession.create({ data: { personaId: 'beginner', sessionId: legacyToken, userId } });
    await api().get('/session/current').set('Authorization', `Bearer ${legacyToken}`).expect(200)
      .expect(({ body }) => expect(body.data).toMatchObject({ personaId: 'beginner', userId }));
  });

  it('returns 503 when the database schema cannot be checked', async () => {
    const query = jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Database offline'));
    try {
      await api().get('/ready').expect(503);
      await api().get('/health').expect(200);
    } finally {
      query.mockRestore();
    }
  });

  it('rolls back signup records when the final session write fails', async () => {
    const before = await prisma.user.count({ where: { personaId } });
    await prisma.$executeRawUnsafe(`CREATE FUNCTION test_reject_session() RETURNS trigger LANGUAGE plpgsql
      AS $$ BEGIN RAISE EXCEPTION 'test session failure'; END; $$`);
    try {
      await prisma.$executeRawUnsafe(`CREATE TRIGGER test_reject_session BEFORE INSERT ON "user_sessions"
        FOR EACH ROW EXECUTE FUNCTION test_reject_session()`);
      await api().post('/session/start').send({ personaId }).expect(500);
      expect(await prisma.user.count({ where: { personaId } })).toBe(before);
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS test_reject_session ON "user_sessions"');
      await prisma.$executeRawUnsafe('DROP FUNCTION test_reject_session()');
    }
  });

  it('handles reroll, reminders, Router failure, concurrent rewards, cosmetics, growth and activity', async () => {
    const { token, userId } = await start();
    const post = (path: string, body: object = {}) => api().post(path).set('Authorization', token).send(body).expect(201);
    const get = (path: string) => api().get(path).set('Authorization', token).expect(200);
    const initial = (await get('/quests/daily')).body.data;
    expect(initial).toHaveLength(3);
    await post('/users/me/reminders', { enabled: true, time: '00:00' });
    expect((await post('/users/me/reminders/check')).body.data).toMatchObject({ notify: true, pending: 3 });
    expect((await post('/users/me/reminders/check')).body.data.notify).toBe(false);

    const question = ({ id }: { id: string }) => post(`/quests/${id}/verification`);
    const complete = ({ id }: { id: string }) => post(`/quests/${id}/complete`, { questId: id, answer });
    expect((await question(initial[0])).body.data.question).toBe('무엇을 배웠나요?');
    router.completeJson.mockRejectedValueOnce(new ServiceUnavailableException('mock outage'));
    expect((await complete(initial[0])).body.success).toBe(false);
    expect(await prisma.questCompletionLog.count({ where: { userId } })).toBe(0);
    expect((await complete(initial[0])).body.data.status).toBe('completed');

    expect((await post('/shop/reroll-ticket/purchase')).body.data.quantity).toBe(1);
    const { personaName, habits } = preferences;
    const rerolled = (await post('/quests/reroll', { personaName, habits })).body.data;
    expect(rerolled.rerollTickets).toBe(0);
    expect(rerolled.quests).toHaveLength(3);
    expect(rerolled.quests[0]).toMatchObject({ id: initial[0].id, status: 'completed' });
    const quests: Array<{ id: string; questDateKst: string }> = rerolled.quests.slice(1);
    expect(quests.every((quest) => !initial.some((original: { id: string }) => original.id === quest.id))).toBe(true);
    const questions = await Promise.all(quests.map(question));
    expect(questions.every(({ body }) => body.data.question === '무엇을 배웠나요?')).toBe(true);

    const [second, third, purchase] = await Promise.all([
      ...quests.map(complete),
      post('/users/me/cosmetics/purchase', { itemId: 'aura' }),
    ]);
    expect([second, third, purchase].every(({ body }) => body.success)).toBe(true);
    expect([second.body.data, third.body.data]).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelUp: 2, goldReward: 0, rewardAdjustments: expect.arrayContaining(['daily_gold_cap']) }),
    ]));
    expect((await get('/quests/daily')).body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ goldReward: 0, categoryName: expect.any(String), rewardAdjustments: ['daily_gold_cap'] }),
    ]));
    expect((await complete(quests[0])).body.success).toBe(false);
    expect(await prisma.user.findUnique({ where: { id: userId } })).toMatchObject({ gold: 2200, totalExp: 330, level: 2 });
    expect(await prisma.questCompletionLog.count({ where: { userId } })).toBe(3);
    expect((await post('/users/me/level-rewards/2/claim')).body.data.gold).toBe(2300);
    expect((await post('/users/me/equipment', { itemId: 'aura' })).body.data.equipped).toBe(true);
    expect((await get('/users/me')).body.data).toMatchObject({ todayChecked: true, totalAttendanceDays: 1, equippedDecoration: 'aura', streak: { currentStreak: 5 } });
    expect((await get('/quests/history')).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ verificationAnswer: answer })]));
    const ranking = (await get('/ranking/current')).body;
    expect(ranking.data).toEqual(expect.arrayContaining([expect.objectContaining({ userId, equippedDecoration: 'aura', rank: expect.any(Number) })]));
    expect(ranking.season).toMatchObject({ yearMonth: quests[0].questDateKst.slice(0, 7), startAt: expect.any(String), endAt: expect.any(String) });
    expect((await get('/users/me/activity')).body.data).toMatchObject({ last7: { completed: 3, total: 3, rate: 100 }, topCategory: { name: '독서', completed: 1 } });
    expect((await get(`/users/me/calendar?month=${quests[0].questDateKst.slice(0, 7)}`)).body.data.achievedDays).toBe(1);
    expect((await get('/users/me/weekly-report')).body.data.totals.completedQuests).toBe(3);
  });

  it('consumes one protection ticket when two clients create the same day', async () => {
    const { token, userId } = await start();
    const post = (path: string, body: object = {}) => api().post(path).set('Authorization', token).send(body).expect(201);
    expect((await post('/shop/protection-ticket/purchase')).body.data.quantity).toBe(1);
    const today = (await prisma.dailyQuest.findFirstOrThrow({ where: { userId } })).questDateKst;
    const previous = new Date(`${today}T00:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 2);
    const missedDate = previous.toISOString().slice(0, 10);
    await prisma.dailyQuest.updateMany({ where: { userId }, data: { questDateKst: missedDate } });
    await prisma.streak.update({ where: { userId }, data: { lastAttendanceDateKst: missedDate } });

    const responses = await Promise.all([post('/quests/daily/ensure', preferences), post('/quests/daily/ensure', preferences)]);
    expect(responses.every(({ body }) => body.success)).toBe(true);
    // Concurrent callers share the single in-flight result; the ticket is spent only once.
    expect(responses.some(({ body }) => body.data.protectionUsed)).toBe(true);
    expect(await prisma.dailyQuest.count({ where: { userId, questDateKst: today } })).toBe(3);
    expect(await prisma.inventory.findFirst({ where: { userId, itemType: 'protection_ticket' } })).toMatchObject({ quantity: 0 });
    expect(await prisma.streak.findUnique({ where: { userId } })).toMatchObject({ currentStreak: 4 });
  });

  it('keeps persona photos private and leaves recovery routes unavailable', async () => {
    const { token } = await start();
    await api().post('/session/recovery-code').set('Authorization', token).expect(404);
    await api().post('/session/recover').set('Authorization', token).send({}).expect(404);

    const photo = Buffer.from([255, 216, 255, 192, 0, 11, 8, 0, 1, 0, 1, 1, 1, 17, 0, 255, 217]).toString('base64');
    await api().post('/users/me/avatar').set('Authorization', token).send({ jpeg: 'invalid' }).expect(400);
    await api().post('/users/me/avatar').set('Authorization', token).send({ jpeg: photo }).expect(201);
    await api().get('/users/me/avatar').expect(401);
    await api().get('/users/me/avatar').set('Authorization', token).expect(200)
      .expect(({ body }) => expect(body.data.jpeg).toBe(photo));
    await api().post('/users/me/avatar/remove').set('Authorization', token).expect(201);
    await api().get('/users/me/avatar').set('Authorization', token).expect(200)
      .expect(({ body }) => expect(body.data.jpeg).toBeNull());
  });

  it('settles a closed KST season once, even across concurrent commands', async () => {
    const yearMonth = '2025-09';
    const endAt = new Date('2025-09-30T15:00:00.000Z');
    const season = await prisma.rankingSeason.create({ data: {
      yearMonth, startAtKst: new Date('2025-08-31T15:00:00Z'), endAtKst: new Date('2025-09-29T15:00:00Z'),
    } });
    const ids = Array.from({ length: 20 }, () => randomUUID());
    await prisma.user.createMany({ data: ids.map((id) => ({ id, personaId })) });
    await prisma.rankingPointLog.createMany({ data: ids.map((userId, index) => ({ userId, seasonId: season.id, finalPoint: 20 - index })) });
    await expect(settleSeason(prisma, yearMonth, false, new Date(endAt.getTime() - 1))).rejects.toThrow('has not ended');
    await expect(settleSeason(prisma, yearMonth, false, endAt)).resolves.toMatchObject({ pending: 20, granted: 0 });
    expect(await prisma.seasonRewardLog.count({ where: { seasonId: season.id } })).toBe(0);

    const results = await Promise.all([settleSeason(prisma, yearMonth, true, endAt), settleSeason(prisma, yearMonth, true, endAt)]);
    expect(results.map((result) => result.granted).sort()).toEqual([0, 20]);
    expect(await prisma.rankingSeason.findUnique({ where: { yearMonth } })).toMatchObject({ endAtKst: endAt, status: 'archived' });
    expect(await prisma.seasonRewardLog.count({ where: { seasonId: season.id } })).toBe(20);
    expect(await prisma.inventory.findFirst({ where: { userId: ids[0] } })).toMatchObject({ itemId: 'border_season_laurel' });
    expect(await prisma.inventory.findFirst({ where: { userId: ids[1] } })).toMatchObject({ itemId: 'season_top10_2025-09' });
    expect(await prisma.inventory.findFirst({ where: { userId: ids[2] } })).toMatchObject({ itemId: 'season_grove' });
    expect(await prisma.user.findUnique({ where: { id: ids[19] } })).toMatchObject({ gold: 600 });
  });

  it('manages stable habit identities, validates schedules, and preserves quests after edit and archive', async () => {
    const { token, userId } = await start();
    const post = (path: string, body: object = {}) => api().post(path).set('Authorization', token).send(body);
    const before = await prisma.dailyQuest.findMany({ where: { userId } });
    const input = { name: '영어 공부', description: '문장 소리 내어 읽기', note: '퇴근 후 10분', active: true, mode: 'weekdays', weekdays: [0, 2, 4], weeklyTarget: 3 };
    await post('/habits', { ...input, weekdays: [0, 0], weeklyTarget: 2 }).expect(400);
    await post('/habits', { ...input, weeklyTarget: 5 }).expect(400);
    const created = await post('/habits', input).expect(201);
    const id = created.body.data.id;
    await post(`/habits/${id}`, { ...input, name: '짧은 영어', mode: 'weekly', weekdays: [], weeklyTarget: 3 }).expect(201);
    await post('/habits/not-owned', input).expect(400);
    const saved = await prisma.userHabit.findUniqueOrThrow({ where: { id } });
    const history = saved.scheduleHistory as Array<{ from: string; mode: string }>;
    expect(history[0].mode).toBe('weekdays');
    expect(history[1]).toMatchObject({ from: shiftDate(weekStart(kstDate()), 7), mode: 'weekly' });
    expect(await prisma.dailyQuest.findMany({ where: { userId } })).toEqual(before);
    await post(`/habits/${id}/archive`).expect(201);
    expect(await prisma.userHabit.findUniqueOrThrow({ where: { id } })).toMatchObject({ archived: true });
    expect(await prisma.dailyQuest.findMany({ where: { userId } })).toEqual(before);
    await api().get('/habits').set('Authorization', token).expect(200).expect(({ body }) => {
      expect(body.data.habits).toEqual(expect.arrayContaining([expect.objectContaining({ id, name: '짧은 영어', archived: true })]));
      expect(body.data.days).toHaveLength(30);
    });
  });

  it('counts practice dates once, preserves historical names and excludes exhausted or inactive habits', async () => {
    const userId = randomUUID(), today = kstDate(), monday = weekStart(today);
    await prisma.user.create({ data: { id: userId, personaId } });
    const habit = await prisma.userHabit.create({ data: { userId, name: '변경된 습관 이름', scheduleHistory: [{ ...dailySchedule(monday), mode: 'weekly', weeklyTarget: 1 }] } });
    const category = await prisma.habitCategory.upsert({ where: { name: '이전 이름' }, create: { name: '이전 이름' }, update: {} });
    await prisma.dailyQuest.createMany({ data: [0,1].map((slotNo) => ({ userId, habitId: habit.id, habitSnapshot: { name: '이전 이름' }, categoryId: category.id, questDateKst: monday, title: '이전 실천', description: '', status: 'completed', difficulty: 'easy', expReward: 100, goldReward: 50, slotNo })) });
    const habits = app.get(HabitService);
    const report = await habits.overview(userId);
    expect(report.counts).toMatchObject({ total: 1, registered: 1, active: 1, eligible: 0, maxQuests: 3 });
    expect(report.habits[0].stats).toMatchObject({ total: 2, weeklyCompleted: 1, weeklyTarget: 1, weeklyRate: 100 });
    expect(await habits.candidates(userId)).toEqual([]);
    expect((await prisma.dailyQuest.findFirstOrThrow({ where: { userId } })).habitSnapshot).toEqual({ name: '이전 이름' });
    await prisma.userHabit.update({ where: { id: habit.id }, data: { scheduleHistory: [{ ...dailySchedule(monday), active: false }] } });
    expect(await habits.candidates(userId)).toEqual([]);
  });

  it('creates one quest for one habit and makes no paid request when no habits are eligible', async () => {
    const response = await api().post('/session/start').send({ personaId, habits: ['영어'], difficulty: 'easy' }).expect(201);
    const userId = response.body.data.personaData.userId;
    const token = `Bearer ${response.body.data.sessionId}`;
    const quests = await prisma.dailyQuest.findMany({ where: { userId } });
    expect(quests).toHaveLength(1);
    expect(quests[0].habitId).toBeTruthy();
    await prisma.dailyQuest.updateMany({ where: { userId }, data: { questDateKst: shiftDate(kstDate(), -1) } });
    await prisma.userHabit.updateMany({ where: { userId }, data: { scheduleHistory: [{ ...dailySchedule(kstDate()), active: false }] } });
    const calls = router.completeJson.mock.calls.length;
    await api().post('/quests/daily/ensure').set('Authorization', token).send(preferences).expect(201).expect(({ body }) => {
      expect(body.data).toMatchObject({ created: false, quests: [] });
    });
    expect(router.completeJson).toHaveBeenCalledTimes(calls);
    await api().get('/habits').expect(401);
  });

  (process.env.HABITQUEST_MIGRATION_FIXTURE === '1' ? it : it.skip)('preserves legacy balances, inventory, logs and historical links after two SQL upgrade runs', async () => {
    expect(await prisma.user.findUniqueOrThrow({ where: { id: 'compat-user' } })).toMatchObject({ gold: 77, totalExp: 100, habits: ['독서'] });
    expect(await prisma.inventory.findUniqueOrThrow({ where: { id: 'compat-inventory' } })).toMatchObject({ quantity: 2 });
    expect(await prisma.questCompletionLog.findUniqueOrThrow({ where: { id: 'compat-log' } })).toMatchObject({ goldReward: 50, expReward: 100, rankingPointAwarded: 10 });
    const habits = await prisma.userHabit.findMany({ where: { userId: 'compat-user' } });
    expect(habits).toHaveLength(2);
    expect(habits).toEqual(expect.arrayContaining([expect.objectContaining({ name: '독서', archived: false }), expect.objectContaining({ name: '과거 운동', archived: true })]));
    const quest = await prisma.dailyQuest.findUniqueOrThrow({ where: { id: 'compat-quest' } });
    expect(quest).toMatchObject({ habitId: habits.find((habit) => habit.name === '독서').id, habitSnapshot: { name: '독서', legacy: true }, status: 'completed' });
    expect((await app.get(HabitService).overview('compat-user')).habits.reduce((sum, habit) => sum + habit.stats.total, 0)).toBe(2);
    // A later retry must not recreate the old names after a real user renames/adds habits.
    await prisma.userHabit.update({ where: { id: quest.habitId }, data: { name: '새 이름' } });
    await prisma.userHabit.create({ data: { userId: 'compat-user', name: '새 습관', scheduleHistory: [dailySchedule(kstDate())] } });
    await prisma.user.update({ where: { id: 'compat-user' }, data: { habits: ['새 이름', '새 습관'] } });
    execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'db', 'execute', '--file', resolve('prisma/custom-habits-upgrade.sql')], { env: process.env, stdio: 'pipe', timeout: 15000 });
    expect(await prisma.userHabit.count({ where: { userId: 'compat-user' } })).toBe(3);
    expect((await prisma.dailyQuest.findUniqueOrThrow({ where: { id: 'compat-quest' } })).habitId).toBe(quest.habitId);
  }, 20000);

  it('limits public signup attempts before invoking AI again', async () => {
    const calls = router.completeJson.mock.calls.length;
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 13; attempt++) {
      const response = await api().post('/session/start').send({ personaId, note: 'x'.repeat(501) });
      statuses.push(response.status);
    }
    expect(statuses).toContain(429);
    expect(statuses.every((status) => status === 400 || status === 429)).toBe(true);
    expect(router.completeJson).toHaveBeenCalledTimes(calls);
  });
});
