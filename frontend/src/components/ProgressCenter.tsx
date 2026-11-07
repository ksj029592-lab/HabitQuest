import React, { useEffect, useRef, useState } from 'react';
import { Check, Coins, Gift, LockKeyhole, RotateCw, Zap } from 'lucide-react';
import { isAxiosError } from 'axios';
import { DailyQuest, UserSession } from '@types';
import { questApi, userApi } from '@api';
import { LevelTree } from '../api/user';
import { AvatarFrame } from './AvatarFrame';
import { Button } from './Button';
import { ActivityOverviewPanel } from './ActivityOverviewPanel';
import { CalendarPanel } from './CalendarPanel';
import { WeeklyReportPanel } from './WeeklyReportPanel';

export const ProgressCenter: React.FC<{ session: UserSession; onRefresh: () => Promise<void> }> = ({ session, onRefresh }) => {
  const [view, setView] = useState<'stats' | 'tree' | 'history' | 'calendar' | 'weekly'>('stats');
  const [tree, setTree] = useState<LevelTree | null>(null);
  const [history, setHistory] = useState<DailyQuest[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const busy = useRef(false);
  const serverBacked = !session.sessionId.startsWith('session_');

  useEffect(() => {
    if (view !== 'tree' && view !== 'history') return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        if (view === 'tree') {
          const response = await (serverBacked ? userApi.getProgression() : userApi.getRewardCatalog());
          if (!response.success || !response.data) throw new Error('레벨 트리를 불러오지 못했어요.');
          if (!cancelled) setTree(response.data);
        } else if (serverBacked) {
          const response = await questApi.getQuestHistory();
          if (!response.success || !response.data) throw new Error('성찰 기록을 불러오지 못했어요.');
          if (!cancelled) setHistory(response.data);
        }
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : '기록 조회에 실패했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [view, attempt, serverBacked]);

  const claim = async (level: number) => {
    if (busy.current || !serverBacked) return;
    busy.current = true;
    setClaiming(level);
    setError('');
    setMessage('');
    try {
      const result = await userApi.claimLevelReward(level);
      if (!result.success || !result.data) throw new Error(result.error?.message || '보상을 받지 못했어요.');
      setTree((current) => current && { ...current, milestones: current.milestones.map((node) => node.level === level ? { ...node, status: 'claimed' } : node) });
      setMessage(result.data.message);
      await onRefresh();
    } catch (failure) {
      setError(isAxiosError(failure) ? failure.response?.data?.message || '서버 연결을 확인해 주세요.' : failure instanceof Error ? failure.message : '보상 수령에 실패했습니다.');
    } finally {
      busy.current = false;
      setClaiming(null);
    }
  };

  const data = session.personaData;
  const level = tree?.level || data.level;
  const progress = tree ? Math.round(tree.totalExp % tree.expPerLevel / tree.expPerLevel * 100) : 0;
  return (
    <section className="hq-progress-center">
      <h2>나의 성장 기록</h2>
      <div className="hq-progress-tabs" aria-label="성장 기록 보기">
        {([['stats', '활동 통계'], ['calendar', '달성 캘린더'], ['weekly', '주간 리포트'], ['tree', '레벨 트리'], ['history', '성찰 기록']] as const).map(([id, label]) => <button key={id} aria-pressed={view === id} onClick={() => { setError(''); setMessage(''); setView(id); }}>{label}</button>)}
      </div>
      {!serverBacked && <p className="hq-session-notice">데모 세션 · 보상 수령 및 서버 기록 저장 불가</p>}
      {message && <p role="status" className="hq-progress-message">{message}</p>}
      {error && <div role="alert" className="hq-verification-error">{error}<button className="hq-text-button" onClick={() => setAttempt((value) => value + 1)}><RotateCw size={15} /> 다시 불러오기</button></div>}
      {view === 'calendar' && <CalendarPanel serverBacked={serverBacked} onRefresh={onRefresh} />}
      {view === 'weekly' && <WeeklyReportPanel serverBacked={serverBacked} />}

      {view === 'stats' && (serverBacked
        ? <ActivityOverviewPanel totalCompleted={data.stats.totalQuestsCompleted} currentStreak={data.streak.currentStreak} />
        : <p className="hq-session-notice">서버에 연결하면 실제 활동 기록을 볼 수 있어요.</p>)}

      {view === 'tree' && <>
        <div className="hq-tree-summary"><div><span>현재 레벨</span><strong>Lv.{serverBacked ? level : data.level}</strong></div><div><span>다음 레벨 경험치</span><progress max={100} value={progress} aria-label="다음 레벨 경험치" /><small>{progress}% · 레벨당 {tree?.expPerLevel || 300} XP</small></div></div>
        {loading ? <p role="status">레벨 트리를 불러오고 있어요.</p> : <ol className="hq-level-tree">
          {tree?.milestones.map((node) => <li key={node.level} className={`hq-level-node ${node.status}`}>
            <div className="hq-level-node-marker" aria-hidden="true">{node.status === 'claimed' ? <Check size={18} /> : node.status === 'available' ? <Gift size={18} /> : <LockKeyhole size={17} />}</div>
            <div className="hq-level-node-content"><div className="hq-level-node-title"><span>Lv.{node.level}</span><h3>{node.name}</h3><small>{node.status === 'claimed' ? '수령 완료' : node.status === 'available' ? '수령 가능' : '미도달'}</small></div>
              <div className="hq-level-rewards"><span><Coins size={16} /> +{node.gold} G</span>{node.items.map((item) => <span key={item.id}>{item.slot === 'border' ? <AvatarFrame equippedBorder={item.value} size="sm" /> : item.slot === 'avatar' ? <AvatarFrame specialAvatarId={item.value} size="sm" /> : <Gift size={16} />}{item.name}</span>)}</div>
              <Button size="small" variant={node.status === 'available' ? 'primary' : 'secondary'} disabled={!serverBacked || node.status !== 'available' || claiming !== null} aria-label={`Lv.${node.level} 보상 받기`} onClick={() => void claim(node.level)}><Gift size={15} /> {claiming === node.level ? '받는 중' : node.status === 'claimed' ? '받은 보상' : node.status === 'locked' ? `Lv.${node.level}에 해금` : '보상 받기'}</Button>
            </div>
          </li>)}
        </ol>}
      </>}

      {view === 'history' && <div className="hq-reflection-history">
        {loading ? <p role="status">지난 기록을 불러오고 있어요.</p> : history.length === 0 ? <div className="hq-empty-state"><Zap size={26} /><h3>아직 완료한 기록이 없어요.</h3><p>완료한 퀘스트와 성찰이 이곳에 남습니다.</p></div> : history.map((quest) => <article key={quest.id}><time>{quest.questDateKst}</time><h3>{quest.title}</h3><div className="hq-quest-rewards"><span>+{quest.expReward} XP</span><span>+{quest.goldReward} G</span></div>{quest.verificationAnswer && <details><summary>나의 성찰 보기</summary><p className="hq-history-question">{quest.verificationQuestion}</p><p>{quest.verificationAnswer}</p><p className="hq-history-feedback">{quest.verificationFeedback}</p></details>}</article>)}
      </div>}
    </section>
  );
};