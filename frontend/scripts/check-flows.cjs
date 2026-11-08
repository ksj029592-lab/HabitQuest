// Isolated UI fixtures only. Does not contact the production API or Foundry.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.HABITQUEST_SCREENSHOTS || path.join(require('node:os').tmpdir(), 'habitquest-browser-checks');
fs.mkdirSync(output,{recursive:true});
const key = date => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const today=key(new Date()), month=today.slice(0,7);
const shift=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const days=Array.from({length:30},(_,i)=>({date:shift(today,i-29),total:i%7===0?0:3,completed:i%7===0?0:i%4}));
const presets=[['beginner','새로운 도전',1,0],['active','꾸준한 참여자',15,2500],['advanced','전설의 퀘스터',45,8000]].map(([role,name,initialLevel,initialGold])=>({id:role,role,name,initialLevel,initialGold,initialStreak:0,bestStreak:0,totalQuestsCompleted:0,monthlySuccessRate:0}));
const assertWidth=async(page,width,label)=>{
  const v=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(v.scroll<=v.viewport+1,label+' '+width+' overflow '+JSON.stringify(v));
  const clipped=await page.locator('.hq-quest,.hq-habit-card,.hq-habit-editor,.hq-shop-ticket,.hq-shop-item,.hq-verification-dialog,.hq-calendar-grid,.hq-ranking-list').evaluateAll(elements=>elements.filter(el=>el.getClientRects().length).map(el=>({name:el.className,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})).filter(rect=>rect.left < -1 || rect.right > innerWidth+1));
  assert.deepEqual(clipped,[],label+' '+width+' clipped controls');
};
async function run(browser,root,width) {
  const page=await browser.newPage({viewport:{width,height:width<=390?844:900},reducedMotion:'reduce'});
  page.setDefaultTimeout(9000);
  const failures=[];
  page.on('pageerror',err=>failures.push(err.message));
  let user={userId:'fixture-user',persona:{id:'beginner',name:'새로운 도전',role:'beginner'},level:2,totalExp:580,gold:1260,expPerLevel:300,avatarIndex:0,seasonRankingPoints:38,totalAttendanceDays:12,todayChecked:true,reminderEnabled:false,streak:{currentStreak:5,bestStreak:7},attendance:{todayChecked:true,lastSevenDaysKst:[]},stats:{totalQuestsCompleted:26,thisMonthQuestsCompleted:8,monthlySuccessRate:71,averageStreakLength:3},inventory:[{itemId:'default',itemType:'reroll_ticket',name:'리롤 티켓',quantity:1},{itemId:'aura',itemType:'cosmetic',name:'aura',quantity:1}],userPreferences:{habits:['독서와 학습'],difficulty:'normal',note:''}};
  let quests=['하루를 여는 책 10쪽','점심 후 가벼운 산책','오늘 배운 것 한 줄 기록'].map((title,i)=>({id:'q'+i,userId:user.userId,questDateKst:today,slotNo:i,title,description:['마음에 남는 문장을 한 줄 기록해요.','가까운 길을 10분 걸으며 주변을 둘러봐요.','내일도 기억하고 싶은 한 가지를 적어보세요.'][i],categoryId:'c'+i,categoryName:['독서와 학습','운동과 건강','집중력과 생산성'][i],difficulty:i===1?'normal':'easy',status:i===2?'completed':'pending',goldReward:i===2?55:90,expReward:100,rankingPointReward:i===1?20:10,rankingPointAwarded:i===2?10:undefined}));
  let managed=[{id:'habit-read',name:'독서와 학습',description:'한 챕터 읽기',note:'잠들기 전',archived:false,schedule:{mode:'daily',active:true,weekdays:[],weeklyTarget:7},planned:null,stats:{last7:4,last30:14,total:26,lastDate:today,weeklyCompleted:3,weeklyTarget:7,weeklyRate:43,streak:{current:3,best:5,unit:'회'}}}];
  let expired=false, activityError=width===390, posts=0, lastAnswer='';
  await page.addInitScript(user=>{if(!localStorage.getItem('habitquest-session'))localStorage.setItem('habitquest-session',JSON.stringify({version:0,state:{isSessionActive:true,session:{sessionId:'test-token',personaId:'beginner',personaData:user}}}));},user);
  const paths=[];
  await page.route('**/api/**',async route=>{
    const p=new URL(route.request().url()).pathname;
    paths.push(p);
    const ok=data=>route.fulfill({json:{success:true,data}});
    if(p==='/api/habits'&&route.request().method()==='GET')return ok({today,habits:managed,mostConsistent:'habit-read',days:days.map(d=>({...d,quests:Array.from({length:d.total},(_,i)=>({id:d.date+i,habitId:'habit-read',title:'읽기 기록 '+i,status:i<d.completed?'completed':'pending'}))}))});
    if(p==='/api/habits'&&route.request().method()==='POST'){const input=route.request().postDataJSON();managed.push({id:'habit-new',...input,schedule:input,planned:null,archived:false,stats:{last7:0,last30:0,total:0,lastDate:null,weeklyCompleted:0,weeklyTarget:input.weeklyTarget,weeklyRate:0,streak:{current:0,best:0,unit:'회'}}});return ok({id:'habit-new',effectiveFrom:today});}
    if(p==='/api/habits/habit-new'){const input=route.request().postDataJSON();managed=managed.map(h=>h.id==='habit-new'?{...h,...input,planned:{...input,from:shift(today,1)}}:h);return ok({id:'habit-new',effectiveFrom:shift(today,1)});}
    if(p==='/api/habits/habit-new/archive'){managed=managed.map(h=>h.id==='habit-new'?{...h,archived:true}:h);return ok({archived:true});}
    if(p==='/api/personas')return ok(presets);
    if(p==='/api/users/me/avatar')return ok({jpeg:null}); if(p==='/api/users/me')return ok(user);
    if(p==='/api/quests/daily/ensure')return expired?route.fulfill({status:401,json:{}}):ok({quests});
    if(p==='/api/quests/daily')return ok(quests);
    if(p.endsWith('/verification'))return ok({question:'오늘의 실천에서 어떤 점이 기억에 남았나요?'});
    if(p.endsWith('/complete')) {
      posts++;
      lastAnswer=route.request().postDataJSON().answer;
      if(posts===1)return route.fulfill({status:503,json:{}});
      const q=quests.find(q=>p.includes('/'+q.id+'/'));
      Object.assign(q,{status:'completed',rankingPointAwarded:0,goldReward:0,levelUp:3,rewardAdjustments:['daily_gold_cap','daily_point_cap'],verificationFeedback:'실천에서 배운 점을 잘 기록했어요.'});
      user={...user,totalExp:680,level:3};
      return posts===3?route.fulfill({status:503,json:{}}):ok(q);
    }
    if(p==='/api/users/me/activity'){
      if(activityError){activityError=false;return route.fulfill({status:503,json:{}});}
      return ok({today,days,last7:{total:18,completed:12,rate:67},last30:{total:75,completed:48,rate:64},topCategory:{name:'독서와 학습',completed:18}});
    }
    if(p==='/api/users/me/calendar')return ok({month,today,achievedDays:8,days:[{date:today,completed:1,total:3,status:'achieved',quests}],rewards:[]});
    if(p==='/api/users/me/weekly-report'){const totals={totalQuests:3,completedQuests:1,achievedDays:1,completionRate:33,exp:100,gold:55,points:10};return ok({through:today,totals,previous:totals,days:[],notes:[],categories:[]});}
    if(p==='/api/ranking/current')return route.fulfill({json:{success:true,season:{yearMonth:month,startAt:month+'-01T00:00:00+09:00',endAt:shift(today,20)+'T00:00:00+09:00'},data:[{userId:'other',name:'산책 퀘스터',rank:1,points:120,level:7},{userId:user.userId,name:'새로운 도전',rank:2,points:38,level:2}]}});
    if(p==='/api/shop/reroll-ticket/purchase'){user={...user,gold:960,inventory:user.inventory.map(x=>x.itemType==='reroll_ticket'?{...x,quantity:2}:x)};return ok({gold:960,quantity:2});}
    if(p==='/api/users/me/equipment'){user={...user,equippedDecoration:'aura'};return ok({equipped:true});}
    return ok(null);
  });
  const nav=name=>page.getByRole('navigation',{name:'주 메뉴'}).getByRole('button',{name,exact:true});
  const snap=async(name)=>{if(width===390||width===1366)await page.screenshot({path:path.join(output,name+'-'+width+'.png'),animations:'disabled'});};
  try {
    await page.goto(root+'/');
    await page.getByRole('button',{name:'새로운 도전 선택'}).waitFor();
    await assertWidth(page,width,'persona');
    assert.equal(await page.getByText(/복구 코드|로그인|회원가입/).count(),0); await snap('persona');
    await page.getByRole('button',{name:'새로운 도전 선택'}).click();
    await page.getByRole('heading',{name:'어떤 습관을 만들까요?'}).waitFor();
    await page.getByLabel('직접 습관 추가').fill('나만의 영어');
    await page.getByRole('button',{name:'추가',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'✓ 나만의 영어',exact:true}).getAttribute('aria-pressed'),'true');
    await assertWidth(page,width,'preferences');
    await snap('preferences');
    await page.goto(root+'/home');
    const complete=page.getByRole('button',{name:'완료하기'}).first();
    await complete.waitFor();
    assert.ok(await complete.evaluate(el=>el.getBoundingClientRect().top<innerHeight),'primary action below fold');
    await assertWidth(page,width,'dashboard');
    await snap('dashboard');
    await complete.click();
    const dialog=page.getByRole('dialog');
    const answer=dialog.getByRole('textbox');
    await answer.waitFor();
    await assertWidth(page,width,'reflection');
    await snap('reflection');
    await page.keyboard.press('Escape');
    await dialog.waitFor({state:'hidden'});
    assert.equal(await complete.evaluate(el=>el===document.activeElement),true);
    if(width===390) {
      const note='산책하면서 바람이 시원하다고 느꼈어요.';
      await complete.click();
      await answer.fill(note);
      await dialog.getByRole('button',{name:'답변 보내고 검토받기'}).click();
      await dialog.getByRole('alert').waitFor();
      await page.reload();
      await complete.click();
      await answer.waitFor();
      assert.equal(await answer.inputValue(),note);
      await dialog.getByRole('button',{name:'답변 보내고 검토받기'}).click();
      await dialog.getByText('레벨 업! Lv.3').waitFor();
      await dialog.getByText('일일 골드 지급 한도가 적용됐어요.').waitFor();
      assert.equal(lastAnswer,note);
      await dialog.getByRole('button',{name:'확인'}).click();
      await complete.click();
      await answer.fill(note);
      await dialog.getByRole('button',{name:'답변 보내고 검토받기'}).click();
      await dialog.getByRole('heading',{name:'오늘의 실천이 쌓였어요.'}).waitFor();
      assert.equal(posts,3);
      await dialog.getByRole('button',{name:'확인'}).click();
    }
    if(width===390){
      await page.getByRole('region',{name:'오늘 완료 요약'}).waitFor();
      await snap('daily-summary');
      await page.getByRole('button',{name:'완료 요약 닫기'}).click();
      await page.getByRole('button',{name:'오늘 완료 요약 다시 보기'}).click();
      await page.getByRole('region',{name:'오늘 완료 요약'}).waitFor();
    }
    await nav('활동 통계').click();
    if(width===390){await page.getByRole('alert').waitFor();await page.getByRole('button',{name:'다시 불러오기'}).click();}
    await page.getByRole('heading',{name:'최근 30일 활동'}).waitFor();
    assert.ok(!paths.includes('/api/quests/history')&&!paths.includes('/api/users/me/progression'));
    const day=page.locator('.hq-heatmap-day').first();
    await day.focus(); await page.keyboard.press('Enter');
    assert.equal(await day.getAttribute('aria-pressed'),'true');
    await assertWidth(page,width,'activity');
    await snap('activity');
    await page.getByLabel('히트맵 습관 필터').selectOption('habit-read');
    await page.getByLabel('히트맵 습관 필터').selectOption('');
    await page.getByRole('button',{name:'달성 캘린더'}).click();
    await page.getByRole('heading',{name:'누적 달성일 보상'}).waitFor();
    await assertWidth(page,width,'calendar');
    await page.getByRole('button',{name:'주간 리포트'}).click();
    await page.getByRole('heading',{name:'이번 주의 실천'}).waitFor();
    await assertWidth(page,width,'weekly');
    await nav('보상 상점').click();
    await page.getByRole('button',{name:'퀘스트 리롤 티켓 구매'}).waitFor();
    await assertWidth(page,width,'shop');
    await snap('shop'); assert.equal(await page.locator('.hq-shop-page .hq-avatar-engraving').count(),4); assert.equal(await page.locator('.hq-shop-page .hq-avatar-pin').count(),4); if(width===1366) { const style=await page.addStyleTag({content:'.hq-app{height:auto;overflow:visible}.hq-header{position:static}'}); await page.locator('.hq-shop-page').screenshot({path:path.join(output,'wardrobe.png'),animations:'disabled'}); await style.evaluate(el=>el.remove()); }
    if(width===390) {
      await page.getByRole('button',{name:'퀘스트 리롤 티켓 구매'}).click();
      await page.getByRole('dialog',{name:'구매 완료'}).waitFor();
      await page.keyboard.press('Escape');
      await page.getByText('보유 2/3개 · 구매 가능').waitFor();
    }
    await nav('내 프로필').click();
    await page.getByRole('heading',{name:'내 프로필'}).waitFor();
    await assertWidth(page,width,'profile');
    await snap('profile');
    await page.getByRole('button',{name:'습관 추가',exact:true}).click();
    const editor=page.getByRole('form',{name:'새 습관'});
    await editor.getByLabel('습관 이름',{exact:true}).fill('영어 공부');
    await editor.getByLabel('실천 목표와 설명').fill('문장 세 개 읽기');
    await editor.getByLabel('요일 지정',{exact:true}).check();
    await assertWidth(page,width,'habit-editor');
    await snap('habit-editor');
    await editor.getByRole('button',{name:'습관 저장',exact:true}).click();
    await page.getByRole('heading',{name:'영어 공부',exact:true}).waitFor();
    const card=page.locator('.hq-habit-card').filter({has:page.getByRole('heading',{name:'영어 공부',exact:true})});
    await card.getByRole('button',{name:'수정',exact:true}).click();
    const edit=page.getByRole('form',{name:'습관 수정'});
    await edit.getByLabel('습관 이름',{exact:true}).fill('매일 영어');
    await edit.getByLabel('주 N회',{exact:true}).check();
    await edit.getByLabel('주간 목표 횟수').selectOption('3');
    await edit.getByRole('button',{name:'습관 저장',exact:true}).click();
    const updated=page.locator('.hq-habit-card').filter({has:page.getByRole('heading',{name:'매일 영어',exact:true})});
    await updated.getByRole('button',{name:'보관',exact:true}).click();
    await updated.getByRole('button',{name:'보관 확정',exact:true}).click();
    await page.getByRole('heading',{name:'매일 영어',exact:true}).waitFor({state:'hidden'});
    if(width===390) {
      await page.getByRole('button',{name:'장착',exact:true}).click();
      await page.getByRole('dialog',{name:'프로필 변경 완료'}).waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('button',{name:'장착 중 · 해제'}).waitFor();
    }
    await nav('시즌 랭킹').click();
    await page.getByText('2위 · 38 PT').waitFor();
    await assertWidth(page,width,'ranking');
    await snap('ranking');
    if(width===390) {
      expired=true;
      await page.goto(root+'/home');
      await page.getByRole('button',{name:'페르소나 선택으로 돌아가기'}).click();
      await page.getByRole('button',{name:'새로운 도전 선택'}).waitFor();
    }
    assert.deepEqual(failures,[]);
    console.log(width+'px passed');
  } catch(e) { console.error(width+'px at '+page.url(),(await page.locator('body').innerText()).slice(0,950)); throw e; }
  finally { await page.close(); }
}
(async()=>{
  const vite=await import(pathToFileURL(require.resolve('vite',{paths:[process.cwd()]})).href);
  const server=await vite.preview({preview:{host:'127.0.0.1',port:0}});
  let browser;
  try {
    browser=await chromium.launch({executablePath:process.env.HABITQUEST_BROWSER_EXECUTABLE,headless:true});
    const root='http://127.0.0.1:'+server.httpServer.address().port;
    const results=await Promise.allSettled([360,390,768,1366,1920].map(width=>run(browser,root,width)));
    const errors=results.filter(x=>x.status==='rejected');
    if(errors.length){for(const e of errors)console.error(e.reason);process.exitCode=1;}
    else console.log('Layout and interaction checks passed. Screenshots: '+output);
  } finally {await browser?.close();await new Promise(resolve=>server.httpServer.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});


