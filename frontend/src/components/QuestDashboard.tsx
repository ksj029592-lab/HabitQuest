import { ArrowRight, CheckCheck, ListChecks, RotateCw, ShieldCheck, Ticket, Trophy, Zap } from 'lucide-react';
import { DailyQuest, PersonaGameState } from '@types';
import { FieldIcon, TrailSketch } from './FieldArt';
import { Button } from './Button';
import { QuestCard } from './QuestCard';

interface QuestDashboardProps {
  persona: PersonaGameState;
  quests: DailyQuest[];
  loading: boolean;
  rerolling: boolean;
  error: string;
  expired: boolean;
  onRetry: () => void;
  onRestart: () => void;
  onReroll: () => void;
  onComplete: (quest: DailyQuest) => void;
  onShop: () => void;
}

export function QuestDashboard({ persona, quests, loading, rerolling, error, expired, onRetry, onRestart, onReroll, onComplete, onShop }: QuestDashboardProps) {
  const pending = quests.filter((quest) => quest.status === 'pending');
  const completed = quests.filter((quest) => quest.status === 'completed');
  const percent = quests.length ? Math.round(completed.length / quests.length * 100) : 0;
  const expPerLevel = persona.expPerLevel || 300;
  const currentExp = persona.totalExp % expPerLevel;
  const rerolls = persona.inventory.find((item) => item.itemType === 'reroll_ticket')?.quantity ?? 0;
  const protection = persona.inventory.find((item) => item.itemType === 'protection_ticket')?.quantity ?? 0;
  const date = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Seoul' }).format();
  const totals = pending.reduce((sum, quest) => ({
    xp: sum.xp + quest.expReward,
    gold: sum.gold + quest.goldReward,
    points: sum.points + (quest.rankingPointReward ?? 0),
  }), { xp: 0, gold: 0, points: 0 });

  return (
    <div className="hq-quest-dashboard">
      <section className="hq-quest-hero" aria-labelledby="today-title">
        <div className="hq-hero-copy">
          <p className="hq-eyebrow">{date}</p>
          <h2 id="today-title">오늘의 습관 퀘스트</h2>
          <p>{loading ? '오늘의 목표를 준비하고 있어요.' : error ? '오늘의 기록을 다시 확인해 주세요.' : pending.length ? `남은 퀘스트 ${pending.length}개` : quests.length ? '오늘의 실천을 모두 마쳤어요.' : '아직 오늘의 퀘스트가 없어요.'}</p>
        </div>
        <TrailSketch />
        <div className="hq-hero-progress">
          <span>오늘의 진행</span>
          <strong>{completed.length}<small> / {quests.length} 완료</small></strong>
          <progress aria-label="오늘의 퀘스트 달성률" max={100} value={percent} />
        </div>
      </section>

      <div className="hq-journey-strip" aria-label="나의 진행 상황">
        <div><Zap size={20} aria-hidden="true" /><span>레벨과 경험치<strong>Lv.{persona.level} <small>{currentExp}/{expPerLevel} XP</small></strong></span></div>
        <div><FieldIcon name="flame" /><span>연속 달성<strong>{persona.streak.currentStreak}<small>일</small></strong></span></div>
        <div><FieldIcon name="coin" /><span>보유 골드<strong>{persona.gold.toLocaleString()}<small> G</small></strong></span></div>
      </div>

      <div className="hq-quest-workspace">
        <section aria-labelledby="daily-quests-title">
          <div className="hq-section-heading">
            <div><h3 id="daily-quests-title">진행할 퀘스트 <span>{pending.length}</span></h3></div>
            <button type="button" onClick={onReroll} disabled={loading || rerolling || Boolean(error) || !pending.length || !rerolls} className="hq-reroll-button" title={rerolls ? '진행 중인 퀘스트만 새로 만들기' : '상점에서 리롤 티켓을 구매할 수 있어요'}>
              <RotateCw size={16} aria-hidden="true" /><span>리롤</span><span className="hq-ticket-count"><Ticket size={14} aria-hidden="true" />{rerolls}개</span>
            </button>
          </div>
          {loading && <div className="hq-empty-state" role="status"><RotateCw size={25} className="animate-spin mx-auto mb-3" aria-hidden="true" /><h4>AI가 오늘의 퀘스트를 준비하고 있어요.</h4><p>습관과 난이도에 맞는 실천을 만들고 있어요.</p></div>}
          {error && <div className="hq-empty-state" role="alert"><h4>{error}</h4><Button size="small" onClick={expired ? onRestart : onRetry}>{expired ? '페르소나 선택으로 돌아가기' : '다시 불러오기'}</Button></div>}
          {rerolling && <p className="hq-progress-message" role="status">AI가 진행 중인 퀘스트를 다시 만들고 있어요.</p>}
          {!loading && !error && (pending.length ? <div className="hq-quest-list">
            {pending.map((quest) => <QuestCard key={quest.id} quest={quest} isCompleting={rerolling} onComplete={() => onComplete(quest)} />)}
          </div> : <div className="hq-empty-state">
            {quests.length ? <CheckCheck size={28} className="mx-auto mb-3" aria-hidden="true" /> : <ListChecks size={28} className="mx-auto mb-3" aria-hidden="true" />}
            <h4>{quests.length ? '오늘의 퀘스트를 모두 마쳤어요!' : '아직 생성된 퀘스트가 없어요.'}</h4>
            {!quests.length && <Button size="small" onClick={onRetry}>오늘의 퀘스트 불러오기</Button>}
          </div>)}
          {!loading && !error && completed.length > 0 && <div className="hq-completed-section hq-quest-list">
            <h4 className="hq-eyebrow">완료한 퀘스트 {completed.length}개</h4>
            {completed.map((quest) => <QuestCard key={quest.id} quest={quest} />)}
          </div>}
        </section>

        <aside className="hq-journey-aside" aria-label="성장과 보상">
          <section className="hq-journey-card">
            <h3>다음 레벨까지</h3>
            <p className="hq-xp-value">{(expPerLevel - currentExp).toLocaleString()} <small>XP 남음</small></p>
            <progress max={expPerLevel} value={currentExp} aria-label="다음 레벨 경험치 진행률" />
            <p className="hq-activity-caption">누적 {persona.totalExp.toLocaleString()} XP · 방지권 {protection}개</p>
          </section>
          <section className="hq-journey-card">
            <h3>남은 퀘스트 기본 보상</h3>
            <dl className="hq-reward-lines">
              <div><dt><Zap size={16} aria-hidden="true" /> 경험치</dt><dd>+{totals.xp} XP</dd></div>
              <div><dt><FieldIcon name="coin" size={16} /> 골드</dt><dd>+{totals.gold} G</dd></div>
              <div><dt><Trophy size={16} aria-hidden="true" /> 시즌 점수</dt><dd>+{totals.points} PT</dd></div>
            </dl>
            <p className="hq-activity-caption">골드와 점수는 일일 한도 및 반복 감산에 따라 달라질 수 있어요.</p>
            <button type="button" className="hq-text-button" onClick={onShop}><ShieldCheck size={16} aria-hidden="true" /> 보상 상점 <ArrowRight size={16} aria-hidden="true" /></button>
          </section>
        </aside>
      </div>
    </div>
  );
}
