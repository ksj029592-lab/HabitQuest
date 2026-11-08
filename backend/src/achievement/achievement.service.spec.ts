import { AchievementService } from './achievement.module';
import { PrismaService } from '@/prisma/prisma.service';
it('evaluates all verified metrics and never guesses cumulative gold or duplicates grants',async()=>{
 const records=new Map<string,any>();
 for(const id of ['habit:1','habit:2','habit:3','habit:4','habit:5','schedule','equip'])records.set('achievement_event:'+id,{itemType:'achievement_event',itemId:id,quantity:1});
 const user={id:'u',level:20,equippedTitle:null};
 const tx={user:{update:jest.fn().mockResolvedValue(user)},dailyQuest:{count:jest.fn().mockResolvedValue(100)},streak:{findUnique:jest.fn().mockResolvedValue({bestStreak:30,currentStreak:3})},shopPurchaseLog:{count:jest.fn().mockResolvedValue(1)},rankingPointLog:{count:jest.fn().mockResolvedValue(1)},seasonRewardLog:{count:jest.fn().mockResolvedValue(1)},userHabit:{findMany:jest.fn().mockResolvedValue([1,2,3].map(()=>({archived:false,scheduleHistory:[{from:'2000-01-01',mode:'weekly',active:true,weeklyTarget:3,weekdays:[]}]})))},inventory:{findMany:jest.fn(async()=>[...records.values()]),upsert:jest.fn(async({create})=>{const row={...create,createdAt:new Date('2026-11-07T00:00:00Z')};records.set(create.itemType+':'+create.itemId,row);return row;})}};
 const db={$transaction:async(callback:any)=>callback(tx)};
 const service=new AchievementService(db as unknown as PrismaService);
 const result=await service.collection('u',true);
 expect(result.filter(i=>i.earned)).toHaveLength(19);
 expect(result.find(i=>i.id==='g1000')).toMatchObject({earned:false,progress:null});
 const calls=tx.inventory.upsert.mock.calls.length;
 await service.collection('u',true);
 expect(tx.inventory.upsert).toHaveBeenCalledTimes(calls);
 expect([...records.values()].filter(r=>r.itemType==='trophy')).toHaveLength(19);
 expect([...records.values()].filter(r=>r.itemType==='achievement_title')).toHaveLength(19);
});
