import { useEffect, useState } from 'react';
import { ArrowRight, Coins, Flame, ShieldCheck } from 'lucide-react';
import { TestPersona } from '@types';
import { personaApi, PersonaPreset } from '../api/persona';
import { AvatarFrame } from './AvatarFrame';
import { FieldIcon, TrailSketch } from './FieldArt';
import { Button } from './Button';

const roles = {
  beginner: { label: '초심자', avatarIndex: 0, protectionTickets: 0, equippedTitle: null, equippedBorder: null },
  active: { label: '꾸준한 실천가', avatarIndex: 2, protectionTickets: 2, equippedTitle: '부지런한', equippedBorder: '금색 테두리' },
  advanced: { label: '숙련된 퀘스터', avatarIndex: 4, protectionTickets: 3, equippedTitle: '전설의', equippedBorder: '무지개 테두리' },
};

function toPersona(preset: PersonaPreset): TestPersona {
  const appearance = roles[preset.role] ?? roles.beginner;
  return {
    ...preset,
    ...appearance,
    initialStats: { bestStreak: preset.bestStreak, totalQuestsCompleted: preset.totalQuestsCompleted, monthlySuccessRate: preset.monthlySuccessRate },
    itemsPreset: [],
  };
}

export function PersonaSelector({ onPersonaSelected, isLoading }: { onPersonaSelected: (persona: TestPersona) => void; isLoading?: boolean }) {
  const [personas, setPersonas] = useState<TestPersona[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    setStatus('loading');
    void personaApi.getPersonas().then((result) => {
      if (!result.success || !result.data) throw new Error('Personas unavailable');
      if (!ignore) { setPersonas(result.data.map(toPersona)); setStatus('ready'); }
    }).catch(() => { if (!ignore) setStatus('error'); });
    return () => { ignore = true; };
  }, [attempt]);

  return (
    <main className="hq-onboarding hq-persona-picker">
      <header className="hq-onboarding-intro">
        <div className="hq-onboarding-mast"><FieldIcon name="compass" size={30} /><span>습관 탐사 수첩</span></div>
        <h1>HabitQuest</h1>
        <p>오늘 해 보고 싶은 일을 고르고, 하나씩 기록해요.</p>
        <TrailSketch />
      </header>
      <section className="hq-persona-selection" aria-labelledby="persona-title">
        <div className="hq-section-heading"><div><h2 id="persona-title">시작할 페르소나를 골라요</h2></div></div>
        <p className="hq-activity-caption">각 페르소나의 시작 레벨, 골드, 연속 기록이 달라요.</p>
        {(status === 'loading' || isLoading) && <p className="hq-activity-loading" role="status">페르소나를 불러오고 있어요.</p>}
        {status === 'error' && <div className="hq-empty-state" role="alert"><h3>페르소나 목록을 불러오지 못했어요.</h3><Button size="small" onClick={() => setAttempt((value) => value + 1)}>다시 불러오기</Button></div>}
        {status === 'ready' && !isLoading && !personas.length && <p role="status">선택할 수 있는 페르소나가 없어요.</p>}
        {status === 'ready' && !isLoading && <div className="hq-persona-grid">
          {personas.map((persona) => <article className="hq-persona-choice hq-journey-card" data-persona={persona.role} key={persona.id}>
            <div className="hq-persona-top"><AvatarFrame avatarIndex={persona.avatarIndex} equippedBorder={persona.equippedBorder} size="xl" /><span>Lv.{persona.initialLevel}</span></div>
            <p className="hq-eyebrow">{roles[persona.role]?.label || '습관 퀘스터'}</p>
            <h3>{persona.name}</h3>
            <ul aria-label="시작 혜택">
              <li><Flame size={16} aria-hidden="true" /> 연속 {persona.initialStreak}일</li>
              <li><Coins size={16} aria-hidden="true" /> {persona.initialGold.toLocaleString()} G</li>
              <li><ShieldCheck size={16} aria-hidden="true" /> 방지권 {persona.protectionTickets}개</li>
            </ul>
            <Button aria-label={`${persona.name} 선택`} onClick={() => onPersonaSelected(persona)}>이 페르소나로 시작 <ArrowRight size={16} aria-hidden="true" /></Button>
          </article>)}
        </div>}
      </section>
    </main>
  );
}
