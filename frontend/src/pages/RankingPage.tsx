import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Medal } from 'lucide-react';
import { AvatarFrame, Button, Header } from '@components';
import { useSessionStore } from '@store';
import { rankingApi, SeasonPeriod, SeasonRankingEntry, SeasonReward } from '../api/ranking';

import { Nameplate } from '../components/AchievementCollection';
import { SeasonResults } from '../components/SeasonResults';
import { FieldIcon, TrailSketch } from '../components/FieldArt';

const examples: SeasonRankingEntry[] = [
  { userId: 'demo-advanced', name: '전설의 퀘스터', level: 45, points: 540, rank: 1, avatarIndex: 4, equippedBorder: 'rainbow_ring' },
  { userId: 'demo-active', name: '꾸준한 참여자', level: 15, points: 320, rank: 2, avatarIndex: 2, equippedBorder: 'gold_frame' },
  { userId: 'demo-beginner', name: '새로운 도전', level: 1, points: 75, rank: 3, avatarIndex: 0 },
];

const seasonDate = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });

export function RankingPage() {
  const navigate = useNavigate();
  const session = useSessionStore((state) => state.session);
  const clearSession = useSessionStore((state) => state.clearSession);
  const sessionId = session?.sessionId;
  const demo = !sessionId || sessionId.startsWith('session_');
  const [entries, setEntries] = useState<SeasonRankingEntry[]>([]);
  const [period, setPeriod] = useState<SeasonPeriod>();
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'expired'>('loading');
  const [rewards, setRewards] = useState<SeasonReward[] | null>(null);
  const [rewardsFailed, setRewardsFailed] = useState(false);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (demo) return;
    let ignore = false;
    setState('loading');
    setEntries([]);
    setPeriod(undefined);
    void rankingApi.getCurrentSeasonRanking().then((result) => {
      if (!result.success || !result.data) throw new Error('Ranking unavailable');
      if (!ignore) { setEntries(result.data); setPeriod(result.season); setState('ready'); }
    }).catch((failure) => {
      if (!ignore) setState(isAxiosError(failure) && failure.response?.status === 401 ? 'expired' : 'error');
    });
    return () => { ignore = true; };
  }, [demo, sessionId, attempt]);

  const loadRewards = async () => {
    if (rewardsLoading) return;
    setRewardsLoading(true);
    setRewardsFailed(false);
    try {
      const result = await rankingApi.getRewards();
      if (!result.success || !result.data) throw new Error();
      setRewards(result.data);
    } catch { setRewardsFailed(true); }
    finally { setRewardsLoading(false); }
  };

  const rows = demo ? examples : entries;
  const me = !demo ? rows.find((entry) => entry.userId === session?.personaData.userId) : undefined;
  const remaining = period ? new Date(period.endAt).getTime() - Date.now() : null;

  return (
    <div className="hq-app">
      <Header title="HabitQuest" onBackPress={() => navigate('/home')} />
      <main className="hq-ranking-page">
        <section className="hq-quest-hero hq-ranking-hero">
          <div className="hq-hero-copy">
            <p className="hq-eyebrow">시즌 기록</p>
            <h2>{period ? `${Number(period.yearMonth.slice(-2))}월 시즌 랭킹` : '시즌 랭킹'}</h2>
            <p>{demo ? '미리보기 · 예시 순위와 점수' : '이번 시즌 동안 쌓은 퀘스트 점수로 순위를 확인해요.'}</p>
            {period && <p className="hq-season-dates"><CalendarDays size={17} aria-hidden="true" />{seasonDate.format(new Date(period.startAt))} – {seasonDate.format(new Date(new Date(period.endAt).getTime() - 1))} KST <span>{remaining !== null && (remaining <= 0 ? '시즌 종료' : remaining < 86_400_000 ? '1일 미만 남음' : `약 ${Math.ceil(remaining / 86_400_000)}일 남음`)}</span></p>}
          </div>
          <TrailSketch /><FieldIcon name="flag" className="hq-ranking-trophy" size={53} />
        </section>

        {!demo && state === 'ready' && <div className="hq-activity-highlight"><Medal size={22} aria-hidden="true" /><div><span>내 시즌 순위</span><strong>{me ? `${me.rank}위 · ${me.points.toLocaleString()} PT` : '이번 시즌 순위 기록이 없어요.'}</strong></div></div>}
        {!demo && state === 'loading' && <p className="hq-activity-loading" role="status">시즌 랭킹을 불러오는 중이에요.</p>}
        {!demo && state === 'ready' && !rows.length && <p className="hq-empty-state" role="status">이번 시즌에 아직 기록된 점수가 없어요.</p>}
        {!demo && state === 'error' && <div className="hq-empty-state" role="alert"><h3>랭킹을 불러오지 못했어요.</h3><Button size="small" onClick={() => setAttempt((value) => value + 1)}>다시 시도</Button></div>}
        {!demo && state === 'expired' && <div className="hq-empty-state" role="alert"><h3>세션이 만료됐어요.</h3><Button size="small" onClick={() => { clearSession(); navigate('/'); }}>페르소나 선택으로 돌아가기</Button></div>}
        {!!rows.length && <ol className="hq-ranking-list" aria-label={demo ? '예시 순위' : '시즌 순위'}>
          {rows.map((entry) => <li key={entry.userId} className={entry.userId === me?.userId ? 'is-current' : ''}>
            <strong className="hq-ranking-place" aria-label={`${entry.rank}위`}>{String(entry.rank).padStart(2, '0')}</strong>
            <AvatarFrame avatarIndex={entry.avatarIndex} equippedBorder={entry.equippedBorder} specialAvatarId={entry.specialAvatarId} equippedDecoration={entry.equippedDecoration} size="sm" />
            <div className="hq-ranking-person"><strong><Nameplate name={entry.name} title={entry.equippedTitle}/> {entry.userId === me?.userId && <small>나</small>}</strong><span>Lv.{entry.level}{entry.equippedTitle && ` · ${entry.equippedTitle}`}</span></div>
            <strong className="hq-ranking-score">{entry.points.toLocaleString()} <small>PT</small></strong>
          </li>)}
        </ol>}
        {!demo && <SeasonResults />}
        {!demo && <section className="hq-journey-card" aria-label="시즌 보상">
          <h3>시즌 보상 기록</h3>
          {rewards === null && <Button size="small" onClick={() => void loadRewards()} disabled={rewardsLoading}>{rewardsLoading ? '불러오는 중' : '내 시즌 보상 보기'}</Button>}
          {rewardsFailed && <p role="alert">보상 기록을 불러오지 못했어요. 다시 시도해 주세요.</p>}
          {rewards?.length === 0 && <p role="status">아직 지급된 시즌 보상이 없어요.</p>}
          {!!rewards?.length && <ul>{rewards.map((reward) => <li key={reward.id}>{reward.month} · {reward.label}</li>)}</ul>}
        </section>}
        {!demo && <p className="hq-activity-caption">기본 점수는 쉬움 10점, 보통 20점, 어려움 30점입니다. 같은 카테고리의 세 번째 완료부터 20% 감산되며, 하루 최대 60점이 반영됩니다.</p>}
      </main>
    </div>
  );
}
