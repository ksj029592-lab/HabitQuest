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
              temperature: 0.85,
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content:
                    'You are an expert habit coach creating 3 distinct, practical, specific daily habit quests tailored to the user persona and habits. Return JSON with a "quests" array of exactly 3 objects. Each object must have: title (creative Korean string with emoji), description (actionable Korean string), categoryId (string), difficulty ("easy"|"normal"|"hard"), expReward (number 50-250), goldReward (number 20-150). Ensure all 3 titles and descriptions are completely unique and specific.',
                },
                {
                  role: 'user',
                  content: JSON.stringify({
                    persona: input.personaName,
                    habits: input.habits,
                    note: input.note || '',
                    preferredDifficulty: input.difficulty || 'normal',
                    seed: Date.now(),
                  }),
                },
              ],
            }),
          },
        );

        if (!response.ok) throw new Error(`Azure OpenAI returned ${response.status}`);
        const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = payload.choices?.[0]?.message?.content;
        if (!content) throw new Error('AI returned no content');

        let rawItems: Array<Record<string, unknown>> = [];
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          rawItems = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.quests)) rawItems = parsed.quests;
          else if (Array.isArray(parsed.data)) rawItems = parsed.data;
          else if (Array.isArray(parsed.items)) rawItems = parsed.items;
        }

        if (rawItems.length >= 3) {
          return this.normalize(rawItems.slice(0, 3), input.difficulty || 'normal');
        }
      } catch (error) {
        this.logger.warn(`AI generation failed; using smart local personalization: ${String(error)}`);
      }
    }

    return this.fallback(input);
  }

  private normalize(items: Array<Record<string, unknown>>, preferredDifficulty: 'easy' | 'normal' | 'hard'): GeneratedQuest[] {
    const date = this.getKstDateString();
    return items.map((item, index) => {
      const difficulty = this.toDifficulty(item.difficulty) || preferredDifficulty;
      return {
        id: `ai_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
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
    const userHabits = input.habits.length > 0 ? input.habits : ['운동과 건강', '독서와 학습', '집중력과 생산성'];
    const difficulty = input.difficulty || 'normal';
    const date = this.getKstDateString();
    const noteHint = input.note ? ` (${input.note})` : '';

    // 카테고리별 다채로운 퀘스트 템플릿 데이터베이스
    const templateCatalog: Record<string, Array<{ emoji: string; title: string; desc: string; category: string }>> = {
      '운동과 건강': [
        { emoji: '🏃', title: '가벼운 30분 유산소 운동하기', desc: `가벼운 조깅이나 산책으로 활력을 고취해 보세요.${noteHint}`, category: 'health' },
        { emoji: '🤸', title: '아침/저녁 전신 스트레칭 10분', desc: `굳은 몸을 부드럽게 풀어주고 혈액순환을 돕습니다.${noteHint}`, category: 'health' },
        { emoji: '💧', title: '하루 수분 보충 (물 1.5L 마시기)', desc: `체내 수분을 충분히 채워 건강한 하루를 만드세요.${noteHint}`, category: 'health' },
        { emoji: '💪', title: '핵심 맨몸 운동 3세트 완수', desc: `스쿼트나 푸시업 등 간단한 운동으로 근력을 키워보세요.${noteHint}`, category: 'health' },
      ],
      '독서와 학습': [
        { emoji: '📚', title: '관심 분야 책 15페이지 읽기', desc: `마음의 양식을 쌓는 유익한 독서 시간을 가집니다.${noteHint}`, category: 'learning' },
        { emoji: '✍️', title: '오늘 배운 내용 핵심 3줄 요약', desc: `지식을 나만의 언어로 정리하여 기억을 강화합니다.${noteHint}`, category: 'learning' },
        { emoji: '💡', title: '새로운 정보나 강의 10분 시청', desc: `궁금했던 분야의 최신 아티클이나 영상 하나를 파악하세요.${noteHint}`, category: 'learning' },
        { emoji: '📖', title: '좋은 구절 메모하고 다짐하기', desc: `감명을 준 문장을 기록하고 오늘의 행동 지침으로 삼습니다.${noteHint}`, category: 'learning' },
      ],
      '집중력과 생산성': [
        { emoji: '🎯', title: '25분 몰입 뽀모도로 1회 완료', desc: `방해요소를 차단하고 한 가지 핵심 업무에 집중하세요.${noteHint}`, category: 'productivity' },
        { emoji: '📝', title: '오늘의 Top 3 우선순위 작성', desc: `하루 시작 전 가장 중요한 3가지 일을 결정해 둡니다.${noteHint}`, category: 'productivity' },
        { emoji: '🧹', title: '작업 공간 및 책상 5분 정돈', desc: `깨끗한 환경에서 높은 집중력과 효율을 발휘하세요.${noteHint}`, category: 'lifestyle' },
        { emoji: '⚡', title: '미뤄둔 가벼운 일 1개 즉시 처리', desc: `5분 내로 끝낼 수 있는 작고 귀찮은 업무를 정돈합니다.${noteHint}`, category: 'productivity' },
      ],
      '마음 챙김': [
        { emoji: '🧘', title: '10분 마음 챙김 호흡 명상', desc: `깊은 숨을 쉬며 지친 마음과 생각을 조용히 내려놓으세요.${noteHint}`, category: 'mindset' },
        { emoji: '📔', title: '오늘 하루 감사한 일 3가지 기록', desc: `소소한 행복과 감사를 되새기며 긍정 에너지를 충전합니다.${noteHint}`, category: 'mindset' },
        { emoji: '☕', title: '디지털 차단 오프라인 휴식 15분', desc: `스마트폰을 두고 조용히 차 한 잔과 함께 휴식하세요.${noteHint}`, category: 'mindset' },
      ],
      '수면 습관': [
        { emoji: '🌙', title: '취침 30분 전 스마트폰 화면 끄기', desc: `숙면을 방해하는 수면 전 미디어 시청을 줄여봅니다.${noteHint}`, category: 'sleep' },
        { emoji: '⏰', title: '정해진 시각에 잠자리 들기', desc: `일정한 수면 리듬을 만들어 내일 아침 개운하게 시작하세요.${noteHint}`, category: 'sleep' },
      ],
      '정리와 생활': [
        { emoji: '🌿', title: '방 안 환기하고 주변 환경 정리', desc: `신선한 공기를 마시며 쾌적한 보금자리를 가꿉니다.${noteHint}`, category: 'lifestyle' },
        { emoji: '🥗', title: '신선한 채소 포함 건강한 식사하기', desc: `몸에 좋은 영양소를 섭취하여 에너지를 보충합니다.${noteHint}`, category: 'health' },
      ],
    };

    // 선택된 habits에 맞는 후보 풀 수집
    const candidates: Array<{ emoji: string; title: string; desc: string; category: string }> = [];
    userHabits.forEach((h) => {
      const match = templateCatalog[h];
      if (match) candidates.push(...match);
    });

    // 만약 후보가 부족하면 전체 템플릿에서 추가
    Object.values(templateCatalog).forEach((list) => {
      list.forEach((item) => {
        if (!candidates.some((c) => c.title === item.title)) {
          candidates.push(item);
        }
      });
    });

    // 셔플 및 3개 추출 (중복 제거)
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    return selected.map((item, index) => ({
      id: `local_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
      userId: 'demo-user',
      categoryId: item.category,
      questDateKst: date,
      difficulty,
      title: `${item.emoji} ${item.title}`,
      description: item.desc,
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
