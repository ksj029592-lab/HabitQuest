import { AiService } from './ai.service';

describe('AiService', () => {
  let aiService: AiService;

  beforeEach(() => {
    aiService = new AiService();
  });

  describe('generateQuests', () => {
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
