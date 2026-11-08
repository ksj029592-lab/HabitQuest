import { TITLE_STYLES } from './titleStyles';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import { Button } from './Button';
import {
  Award,
  Crown,
  Sprout,
  Shield,
  Star,
  Trophy,
  Coins,
  BookOpen,
  Clock,
  Pencil,
  ShoppingBag,
  Compass,
  Flame,
  Gem,
  Footprints,
  Swords,
  ArrowUp,
  LayoutGrid,
  Ribbon,
  Medal,
} from 'lucide-react';
const icons: Record<string, typeof Trophy> = {
  sprout: Sprout,
  footprints: Footprints,
  swords: Swords,
  crown: Crown,
  flame: Flame,
  compass: Compass,
  shield: Shield,
  stars: Star,
  arrow: ArrowUp,
  gem: Gem,
  coins: Coins,
  pen: Pencil,
  book: BookOpen,
  clock: Clock,
  grid: LayoutGrid,
  bag: ShoppingBag,
  ribbon: Ribbon,
  laurel: Medal,
  award: Award,
};
export interface AchievementEntry {
  id: string;
  name: string;
  title: string;
  trophy: string;
  metric: string;
  category: string;
  target: number;
  rarity: string;
  motif: string;
  titleId: string;
  trophyId: string;
  progress: number | null;
  earned: boolean;
  earnedAt?: string;
  equipped: boolean;
  description: string;
  resource: string;
}
export function Nameplate({ name, title }: { name: string; title?: string | null }) {
  const style = title ? TITLE_STYLES[title] : undefined;
  const Icon = icons[style?.motif ?? 'award'] ?? Award;
  return (
    <span className={'hq-nameplate ' + (style?.rarity ?? 'common')}>
      <strong>{name}</strong>
      {title && (
        <span>
          <Icon size={12} aria-hidden="true" /> {title} · {style?.rarity ?? '칭호'}
        </span>
      )}
    </span>
  );
}
function TrophyArt({ item, size }: { item: AchievementEntry; size: number }) {
  const [failed, setFailed] = useState(false);
  const Icon = icons[item.motif] ?? Trophy;
  return (
    <span className={`hq-trophy-art ${item.rarity}`}>
      {failed ? (
        <Icon size={size} aria-hidden="true" />
      ) : (
        <img
          src={item.resource}
          alt={item.trophy}
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
export function AchievementCollection({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [data, setData] = useState<AchievementEntry[]>();
  const [tab, setTab] = useState('업적');
  const [category, setCategory] = useState('전체');
  const [rarity, setRarity] = useState('전체');
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AchievementEntry>();
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selected) {
      detailRef.current?.scrollIntoView({ block: 'start' });
      detailRef.current?.focus();
    }
  }, [selected]);
  const load = async () => {
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    setError('');
    try {
      const r = await apiClient.post<AchievementEntry[]>('/achievements/check');
      if (!r.success || !r.data) throw Error();
      setData(r.data);
    } catch {
      setError('컬렉션을 불러오지 못했어요. 다시 확인해 주세요.');
    } finally {
      setBusy(false);
      busyLock.current = false;
    }
  };
  const equip = async (item: AchievementEntry) => {
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    setError('');
    try {
      const r = await apiClient.post('/achievements/title', { id: item.titleId });
      if (!r.success) throw Error();
      const updated = await apiClient.get<AchievementEntry[]>('/achievements');
      if (updated.success && updated.data) setData(updated.data);
      await onRefresh();
    } catch {
      setError('장착 상태를 확인하지 못했어요. 컬렉션을 다시 불러와 주세요.');
    } finally {
      setBusy(false);
      busyLock.current = false;
    }
  };
  const artwork = (item: AchievementEntry, size = 32) => (
    <TrophyArt key={item.id} item={item} size={size} />
  );
  return (
    <section className="hq-achievements">
      <h3>업적과 모험 컬렉션</h3>
      <p className="hq-activity-caption">
        서버 기록으로 확인 · 보상은 칭호와 트로피이며 XP·골드 보너스는 없어요.
      </p>
      <Button onClick={() => void load()} disabled={busy}>
        {busy ? '확인 중…' : data ? '달성 기록 새로 확인' : '업적과 컬렉션 열기'}
      </Button>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p role="status">
            달성 {data.filter((i) => i.earned).length} / {data.length} · 칭호와 트로피 각 20종
          </p>
          <div className="hq-progress-tabs">
            {['업적', '칭호', '트로피'].map((t) => (
              <button key={t} aria-pressed={t === tab} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          {tab === '업적' && (
            <label>
              분류
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {['전체', ...new Set(data.map((i) => i.category))].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
          {tab === '트로피' && (
            <label>
              희귀도
              <select value={rarity} onChange={(e) => setRarity(e.target.value)}>
                {['전체', 'common', 'rare', 'epic', 'legendary'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
          <div className="hq-collection-grid">
            {data
              .filter((i) => tab !== '업적' || category === '전체' || category === i.category)
              .filter((i) => tab !== '트로피' || rarity === '전체' || rarity === i.rarity)
              .map((item) => (
                <article
                  key={item.id}
                  className={`hq-collection-item ${item.rarity} ${item.earned ? 'earned' : 'locked'}`}
                >
                  {artwork(item)}
                  <h4>
                    {tab === '트로피' ? item.trophy : tab === '칭호' ? item.title : item.name}
                  </h4>
                  <p>
                    {item.rarity} · {item.earned ? '획득' : '잠금'}
                  </p>
                  <p>
                    {item.progress === null
                      ? '정확한 누적 기록이 없어 판정 보류'
                      : `${Math.min(item.progress, item.target)} / ${item.target}`}
                  </p>
                  {tab === '업적' && item.progress !== null && (
                    <progress
                      aria-label={item.name + ' 진행률'}
                      max={item.target}
                      value={Math.min(item.target, item.progress)}
                    />
                  )}
                  <p>{item.description}</p>
                  {item.earnedAt && (
                    <time>
                      {new Intl.DateTimeFormat('ko-KR', {
                        timeZone: 'Asia/Seoul',
                        dateStyle: 'medium',
                      }).format(new Date(item.earnedAt))}{' '}
                      획득
                    </time>
                  )}
                  {tab === '업적' && (
                    <p>
                      보상: {item.title} · {item.trophy}
                    </p>
                  )}
                  {tab === '칭호' && (
                    <>
                      <Nameplate name="모험가" title={item.title} />
                      <Button
                        size="small"
                        disabled={busy || !item.earned}
                        onClick={() => void equip(item)}
                      >
                        {item.equipped ? '장착 중 · 해제' : '칭호 장착'}
                      </Button>
                    </>
                  )}
                  {tab === '트로피' && (
                    <Button variant="secondary" size="small" onClick={() => setSelected(item)}>
                      트로피 자세히 보기
                    </Button>
                  )}
                </article>
              ))}
          </div>
        </>
      )}
      {selected && (
        <section
          className="hq-trophy-detail"
          aria-label="트로피 상세"
          ref={detailRef}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSelected(undefined);
          }}
        >
          <Button variant="plain" onClick={() => setSelected(undefined)}>
            상세 닫기
          </Button>
          {artwork(selected, 110)}
          <h3>{selected.trophy}</h3>
          <p>
            {selected.rarity} · {selected.name}
          </p>
          <p>{selected.description}</p>
          <p>
            {selected.earnedAt
              ? `획득: ${new Date(selected.earnedAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}`
              : '아직 획득하지 않았어요.'}
          </p>
          <p className="hq-activity-caption">이미지 누락 시 임시 SVG 아이콘으로 표시됩니다.</p>
        </section>
      )}
    </section>
  );
}
