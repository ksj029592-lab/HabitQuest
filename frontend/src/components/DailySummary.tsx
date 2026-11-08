import { useState } from 'react';
import { CheckCheck, X } from 'lucide-react';
import { DailyQuest } from '@types';
import { Button } from './Button';

export function DailySummary({ quests, userId, streak }: { quests: DailyQuest[]; userId: string; streak: number }) {
  const key = `habitquest:summary:${userId}:${quests[0]?.questDateKst}`;
  const [closed, setClosed] = useState(() => { try { return sessionStorage.getItem(key) === 'closed'; } catch { return false; } });
  if (!quests.length || quests.some((quest) => quest.status !== 'completed')) return null;
  const toggle = (value: boolean) => { setClosed(value); try { if (value) sessionStorage.setItem(key, 'closed'); else sessionStorage.removeItem(key); } catch { /* Display stays usable when storage is blocked. */ } };
  if (closed) return <Button variant="plain" size="small" onClick={() => toggle(false)}>오늘 완료 요약 다시 보기</Button>;
  const totals = quests.reduce((sum, quest) => ({ xp: sum.xp + quest.expReward, gold: sum.gold + quest.goldReward }), { xp: 0, gold: 0 });
  return <section className="hq-daily-summary" aria-label="오늘 완료 요약">
    <div className="hq-settings-heading"><h3><CheckCheck size={20} aria-hidden="true" />오늘의 실천을 모두 마쳤어요!</h3><button type="button" className="hq-icon-button" aria-label="완료 요약 닫기" onClick={() => toggle(true)}><X size={18} /></button></div>
    <p>{quests.length}개 완료 · +{totals.xp} XP · +{totals.gold} G · 연속 {streak}일</p>
    <p className="hq-activity-caption">서버에 기록된 실제 지급 보상입니다.</p>
    <details><summary>오늘 남긴 성찰 돌아보기</summary><ul>{quests.map((quest) => <li key={quest.id}><strong>{quest.title}</strong><p>{quest.verificationAnswer || '저장된 성찰이 없는 이전 기록입니다.'}</p>{quest.verificationFeedback && <p className="hq-history-feedback">{quest.verificationFeedback}</p>}</li>)}</ul></details>
  </section>;
}
