import { RankingService } from './ranking.service';
import { PrismaService } from '@/prisma/prisma.service';
describe('read-only season results',()=>{
  it.each([
    ['active','2026-10-15T00:00:00Z',true,false,'active'],
    ['active','2026-11-02T00:00:00Z',true,false,'pending'],
    ['archived','2026-11-02T00:00:00Z',true,true,'rewarded'],
    ['archived','2026-11-02T00:00:00Z',true,false,'not_rewarded'],
    ['archived','2026-11-02T00:00:00Z',false,false,'no_participation'],
  ])('%s %s returns %s',async(status,now,participated,paid,state)=>{
    const db={rankingSeason:{findMany:jest.fn().mockResolvedValue([{id:'season',yearMonth:'2026-10',status}])},rankingPointLog:{groupBy:jest.fn().mockResolvedValue(participated?[{userId:'other',_sum:{finalPoint:80}},{userId:'me',_sum:{finalPoint:40}}]:[])},seasonRewardLog:{findMany:jest.fn().mockResolvedValue(paid?[{id:'receipt',rewardType:'gold',rewardValue:'600',grantedAt:new Date(now)}]:[])}};
    const [result]=await new RankingService(db as unknown as PrismaService).getSeasonResults('me',new Date(now));
    expect(result.state).toBe(state);expect(result.rank).toBe(participated?2:null);expect(result.points).toBe(participated?40:0);expect(result.rewards).toHaveLength(paid?1:0);
  });
  it('propagates retrieval errors instead of returning an empty result',async()=>{
    const db={rankingSeason:{findMany:jest.fn().mockRejectedValue(new Error('offline'))}};
    await expect(new RankingService(db as unknown as PrismaService).getSeasonResults('me')).rejects.toThrow('offline');
  });
});
