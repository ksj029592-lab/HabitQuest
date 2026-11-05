import { AiService } from './ai.service';
import { ModelRouterClient } from './model-router.client';

describe('AiService', () => {
  let aiService: AiService;
  const environment = { ...process.env };

  beforeEach(() => {
    delete process.env.FOUNDRY_MODEL_ROUTER_ENDPOINT;
    delete process.env.FOUNDRY_MODEL_ROUTER_DEPLOYMENT;
    delete process.env.FOUNDRY_MODEL_ROUTER_API_KEY;
    aiService = new AiService(new ModelRouterClient());
  });

  afterEach(() => {
    process.env = { ...environment };
    jest.restoreAllMocks();
  });

  describe('quest reflection', () => {
    const quest = { title: '책 10페이지 읽기', description: '읽은 내용에서 마음에 남는 생각을 기록하세요.' };
    const originalEnvironment = { ...process.env };

    beforeEach(() => {
      process.env.FOUNDRY_MODEL_ROUTER_ENDPOINT = 'https://example.openai.azure.com';
      process.env.FOUNDRY_MODEL_ROUTER_DEPLOYMENT = 'test-router';
      process.env.FOUNDRY_MODEL_ROUTER_API_KEY = 'test-key';
    });

    afterEach(() => {
      process.env = { ...originalEnvironment };
      jest.restoreAllMocks();
    });

    it('asks a quest-specific reflection question', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ model: 'gpt-5.4', choices: [{ message: { content: JSON.stringify({ question: '읽은 내용 중 가장 기억에 남는 생각과 이유는 무엇인가요?' }) } }] }) } as Response);
      const result = await aiService.createReflectionQuestion(quest);
      expect(result.question).toContain('읽은 내용');
    });

    it('returns the model decision and short feedback', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ model: 'gpt-5.5', choices: [{ message: { content: JSON.stringify({ approved: true, feedback: '작은 습관이 쌓인다는 생각을 잘 발견했네요!' }) } }] }) } as Response);
      await expect(aiService.reviewReflection({ ...quest, question: '어떤 생각이 남았나요?', answer: '작은 습관을 반복하는 것이 중요하다는 부분이 인상 깊었어요.' })).resolves.toEqual({ approved: true, feedback: '작은 습관이 쌓인다는 생각을 잘 발견했네요!' });
    });

    it('does not approve malformed decisions or unavailable AI', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ model: 'gpt-5.6-sol', choices: [{ message: { content: JSON.stringify({ approved: 'true', feedback: '완료' }) } }] }) } as Response);
      await expect(aiService.reviewReflection({ ...quest, question: '무엇을 느꼈나요?', answer: '조금씩 실천할 때 마음이 편해진다는 걸 느꼈어요.' })).rejects.toThrow();
      delete process.env.FOUNDRY_MODEL_ROUTER_DEPLOYMENT;
      await expect(aiService.reviewReflection({ ...quest, question: '무엇을 느꼈나요?', answer: '실천해 보니 집중이 잘 됐어요.' })).rejects.toThrow();
    });
  });

  describe('generateQuests', () => {
    it('normalizes Router quests to the selected difficulty', async () => {
      const router = new ModelRouterClient();
      jest.spyOn(router, 'isConfigured').mockReturnValue(true);
      jest.spyOn(router, 'completeJson').mockResolvedValue({ quests: [0, 1, 2].map((slot) => ({ title: `습관 ${slot}`, description: '오늘의 작은 실천', difficulty: 'hard' })) });
      const result = await new AiService(router).generateQuests({ personaName: '초심자', habits: ['독서'], difficulty: 'easy' });
      expect(result).toHaveLength(3);
      expect(result.every((quest) => quest.difficulty === 'easy')).toBe(true);
    });

    it('does not hide a configured Router failure behind local fallback quests', async () => {
      const router = new ModelRouterClient();
      jest.spyOn(router, 'isConfigured').mockReturnValue(true);
      jest.spyOn(router, 'completeJson').mockRejectedValue(new Error('Disallowed serving model'));
      await expect(new AiService(router).generateQuests({ personaName: '초심자', habits: ['독서'] })).rejects.toThrow('Disallowed serving model');
    });

    it('should generate 3 distinct fallback quests even when only 1 habit is provided', async () => {
      const input = {
        personaName: '초심자',
        habits: ['운동과 건강'],
        note: '가볍게 운동하고 싶어요',
        difficulty: 'easy' as const,
      };

      const result = await aiService.generateQuests(input);

      expect(result).toHaveLength(3);
      expect(result[0].slotNo).toBe(0);
      expect(result[1].slotNo).toBe(1);
      expect(result[2].slotNo).toBe(2);

      // Check titles are distinct and non-empty
      const titles = result.map((q) => q.title);
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(3);

      result.forEach((quest) => {
        expect(quest.difficulty).toBe('easy');
        expect(quest.status).toBe('pending');
        expect(quest.expReward).toBeGreaterThan(0);
        expect(quest.goldReward).toBeGreaterThan(0);
      });
    });

    it('should generate 3 quests matching preferred difficulty and persona', async () => {
      const input = {
        personaName: '고도화된 사용자',
        habits: ['독서와 학습', '집중력과 생산성', '수면 습관'],
        note: '오늘 2시간 공부 도전',
        difficulty: 'hard' as const,
      };

      const result = await aiService.generateQuests(input);

      expect(result).toHaveLength(3);
      result.forEach((quest) => {
        expect(quest.difficulty).toBe('hard');
        expect(quest.expReward).toBe(180);
        expect(quest.goldReward).toBe(120);
      });
    });
  });
});
