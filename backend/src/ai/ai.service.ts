import { Injectable, Logger } from '@nestjs/common';

interface GenerateQuestsInput {
  personaName: string;
  habits: string[];
  note?: string;
  difficulty?: 'easy' | 'normal' | 'hard';
}

export interface GeneratedQuest {
  id: string;
  userId: string;
  categoryId: string;
  questDateKst: string;
  difficulty: 'easy' | 'normal' | 'hard';
  title: string;
  description: string;
  status: 'pending';
  expReward: number;
  goldReward: number;
  slotNo: 0 | 1 | 2;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  async generateQuests(input: GenerateQuestsInput): Promise<GeneratedQuest[]> {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;

    if (endpoint && deployment && apiKey) {
      try {
        const response = await fetch(
          `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=2024-10-21`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': apiKey,
            },
            body: JSON.stringify({
              temperature: 0.8,
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content: 'You create practical, safe, specific daily habit quests. Return JSON only with a quests array of exactly 3 objects. Each object has title, description, categoryId, difficulty, expReward, goldReward. Do not suggest medical treatment or dangerous actions.',
                },
                {
                  role: 'user',
                  content: JSON.stringify({ persona: input.personaName, habits: input.habits, note: input.note || '', preferredDifficulty: input.difficulty || 'normal' }),
                },
              ],
            }),
          },
        );

        if (!response.ok) throw new Error(`Azure OpenAI returned ${response.status}`);
        const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        const content = payload.choices?.[0]?.message?.content;
        if (!content) throw new Error('AI returned no content');
        const parsed = JSON.parse(content) as { quests?: Array<Record<string, unknown>> };
        if (Array.isArray(parsed.quests) && parsed.quests.length >= 3) {
          return this.normalize(parsed.quests.slice(0, 3), input.difficulty || 'normal');
        }
      } catch (error) {
        this.logger.warn(`AI generation failed; using local personalization: ${String(error)}`);
      }
    }

    return this.fallback(input);
  }

  private normalize(items: Array<Record<string, unknown>>, preferredDifficulty: 'easy' | 'normal' | 'hard'): GeneratedQuest[] {
    const date = this.getKstDateString();
    return items.map((item, index) => {
      const difficulty = this.toDifficulty(item.difficulty) || preferredDifficulty;
      return {
        id: `ai_${Date.now()}_${index}`,
        userId: 'demo-user',
        categoryId: String(item.categoryId || 'personal'),
        questDateKst: date,
        difficulty,
        title: String(item.title || '나만의 습관 퀘스트'),
        description: String(item.description || '오늘의 목표를 작은 행동으로 실천해보세요.'),
        status: 'pending',
        expReward: this.toReward(item.expReward, difficulty === 'hard' ? 180 : difficulty === 'easy' ? 100 : 140),
        goldReward: this.toReward(item.goldReward, difficulty === 'hard' ? 120 : difficulty === 'easy' ? 50 : 80),
        slotNo: index as 0 | 1 | 2,
      };
    });
  }

  private fallback(input: GenerateQuestsInput): GeneratedQuest[] {
    const habits = input.habits.length > 0 ? input.habits : ['건강 관리', '마음 돌보기', '꾸준한 성장'];
    const difficulty = input.difficulty || 'normal';
    const date = this.getKstDateString();
    return [0, 1, 2].map((index) => ({
      id: `local_${Date.now()}_${index}`,
      userId: 'demo-user',
      categoryId: `habit_${index}`,
      questDateKst: date,
      difficulty,
      title: `${habits[index % habits.length]} 실천하기`,
      description: `${input.personaName}님에게 맞춘 오늘의 목표입니다. ${input.note ? input.note : '부담 없이 10~30분 동안 실행해보세요.'}`,
      status: 'pending',
      expReward: difficulty === 'hard' ? 180 : difficulty === 'easy' ? 100 : 140,
      goldReward: difficulty === 'hard' ? 120 : difficulty === 'easy' ? 50 : 80,
      slotNo: index as 0 | 1 | 2,
    }));
  }

  private toDifficulty(value: unknown): 'easy' | 'normal' | 'hard' | null {
    return value === 'easy' || value === 'normal' || value === 'hard' ? value : null;
  }

  private toReward(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(10, Math.min(500, Math.round(value))) : fallback;
  }

  private getKstDateString(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  }
}
