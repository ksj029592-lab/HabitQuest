import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { rankingApi, SeasonResult } from '../api/ranking';
import { Button } from './Button';
const labels = { active: '시즌 진행 중', pending: '시즌 종료 · 정산 대기', rewarded: '정산 완료 · 보상 지급됨', not_rewarded: '정산 완료 · 지급된 보상 없음', no_participation: '시즌 참여 기록 없음' };
export function SeasonResults() {
  const [data,setData]=useState<SeasonResult[]>();
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(false);
  const [selected,setSelected]=useState('');
  const load=async()=>{if(loading)return;setLoading(true);setError(false);try{const response=await rankingApi.getResults();if(!response.success||!response.data)throw Error();setData(response.data);setSelected(response.data.find(s=>s.state!=='active')?.yearMonth ?? response.data[0]?.yearMonth ?? '');}catch{setError(true);}finally{setLoading(false);}};
  const result=data?.find(s=>s.yearMonth===selected);
  const date=(value:string)=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(new Date(value));
  return <section className="hq-journey-card hq-season-result" aria-label="이전 시즌 결과"><h3><Trophy size={20} aria-hidden="true" /> 시즌 여정</h3>
    {!data && <Button size="small" onClick={()=>void load()} disabled={loading}>{loading?'시즌 기록 조회 중…':'이전 시즌 결과 보기'}</Button>}
    {error && <p role="alert">시즌 결과를 불러오지 못했어요. <button className="hq-text-button" onClick={()=>void load()} disabled={loading}>다시 시도</button></p>}
    {data?.length===0 && <p role="status">저장된 시즌이 아직 없어요.</p>}
    {!!data?.length && <label>확인할 시즌<select aria-label="확인할 시즌" value={selected} onChange={e=>setSelected(e.target.value)}>{data.map(s=><option key={s.yearMonth} value={s.yearMonth}>{s.yearMonth} 시즌</option>)}</select></label>}
    {result && <div key={result.yearMonth} className="hq-season-result-content"><h4>{result.yearMonth} 시즌</h4><p className="hq-activity-caption">{date(result.startAt)} – {date(new Date(new Date(result.endAt).getTime()-1).toISOString())} KST</p><p role="status">{labels[result.state]}</p>
      <div className="hq-season-score"><strong>{result.rank===null?'순위 없음':`${result.rank}위`}<small>{result.state==='active'?'현재 순위':'최종 순위'}</small></strong><strong>{result.points.toLocaleString()} PT<small>{result.state==='active'?'현재 점수':'최종 점수'}</small></strong></div>
      {result.state==='pending' && <p>정산이 아직 완료되지 않았습니다. 지급될 보상은 확정하지 않아요.</p>}
      {result.state==='no_participation' && <p>양수 시즌 포인트가 기록되지 않았어요.</p>}
      {result.state==='not_rewarded' && <p>실제 지급 기록이 없습니다. 보상 지급 대상 여부는 운영 확인이 필요합니다.</p>}
      {result.state==='rewarded' && <ul aria-label="실제 지급 보상">{result.rewards.map(r=><li key={r.id}>✓ {r.label} · {date(r.grantedAt)} 지급</li>)}</ul>}
      <Button variant="plain" size="small" onClick={()=>{setSelected(data?.find(s=>s.state==='active')?.yearMonth ?? selected);document.querySelector('.hq-ranking-hero')?.scrollIntoView({block:'start'});}}>현재 시즌 랭킹으로 이동</Button>
    </div>}
    <p className="hq-activity-caption">최근 저장된 12개 시즌 · 실제 포인트와 지급 기록 기준</p>
  </section>;
}
