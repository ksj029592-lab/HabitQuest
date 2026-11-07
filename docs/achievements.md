# 업적·칭호·트로피 구현 및 릴리스 인수인계

기존 Inventory의 (userId,itemType,itemId) 고유 키를 재사용한다. achievement(지급 영수증), achievement_title(장착권), trophy(컬렉션), achievement_event(행동 증거)를 구분한다. 신규 테이블/SQL은 없다. 기존 custom-habits SQL 선행 적용 → API → 웹 배포가 필요하며 이번에는 운영 작업을 하지 않았다.

POST /achievements/check를 컬렉션 열기/명시적 새로고침 때 호출한다. 사용자 행을 먼저 잠그고 조건 조회·영수증·칭호·트로피를 한 트랜잭션으로 저장한다. GET은 조회만 한다. 지급 시각은 실제 행동 시각이 아닌 서버 확인·지급 시각이다. 자동 팝업이나 매 요청 재계산은 추가하지 않았다. XP·골드·시즌 점수는 지급하지 않는다.

소급 정책: 퀘스트 완료 수, 전체 스트릭, 레벨, 구매 로그, 시즌 포인트/지급 로그, 현재 활성 주간 습관은 실제 DB 기록으로 판정한다. 기본 페르소나 레벨/스트릭도 기존 서버 상태에 따른다. 직접 등록·일정 설정·장착 행동은 기능 도입 후 기록한 이벤트만 센다. 온보딩 배열만으로 기본/직접 습관을 구분하지 않으며 프로필의 신규 추가만 직접 등록으로 인정한다. 누적 골드 1000은 정확한 전체 획득 원장이 없으므로 판정 보류한다. 원장을 도입한다면 거래원별 고유 키·수입 유형·금액·발생 시각을 기록하고, 기초 잔액과 과거 불명 수입은 별도로 분리해야 한다. 과거 값을 추정하거나 현재 잔액으로 대체하지 않는다.

| ID | 업적 | 칭호 | 트로피 | 등급 |
|---|---|---|---|---|
| q1 | 첫걸음 | 초보 모험가 | 새싹 메달 | common |
| q10 | 퀘스트 러너 | 작은 실천가 | 청록 리본 트로피 | rare |
| q30 | 루틴 헌터 | 퀘스트 헌터 | 은빛 사냥패 | epic |
| q100 | 일일 정복자 | 일일 정복자 | 데일리 크라운 | legendary |
| s3 | 흐름 타기 | 꾸준한 실천가 | 3일 연속 배지 | common |
| s7 | 일주일의 증명 | 성실한 탐험가 | 7일 연속 트로피 | rare |
| s14 | 흔들리지 않는 루틴 | 루틴 수호자 | 루틴 실드 | epic |
| s30 | 습관의 달인 | 습관 마스터 | 월간 루틴 크라운 | legendary |
| l5 | 성장의 시작 | 성장의 새싹 | 새싹 성장패 | common |
| l10 | 한 단계 위로 | 성장 개척자 | 레벨 스타 트로피 | rare |
| l20 | 멈추지 않는 성장 | 성장 마에스트로 | 성장 오브 | epic |
| g1000 | 황금 발걸음 | 황금 수집가 | 골드 스택 메달 | rare |
| h1 | 첫 습관 설계자 | 습관 설계자 | 첫 기록 문장 | common |
| h5 | 루틴 컬렉터 | 루틴 수집가 | 루틴 북마크 | rare |
| schedule | 나만의 방식 | 계획의 장인 | 스케줄 링 | rare |
| weekly | 생활 최적화 | 생활 전략가 | 전략 보드 패 | epic |
| buy | 첫 구매 | 작은 수집가 | 민트 쇼핑 배지 | common |
| equip | 나만의 개성 | 개성 있는 모험가 | 스타일 엠블럼 | rare |
| season | 시즌의 도전자 | 시즌 도전자 | 도전자 컵 | rare |
| reward | 첫 시즌 보상 | 명예의 수상자 | 아너 트로피 | epic |

아트 경로는 frontend/public/trophies/<ID>.png다. PNG 실패 시 명확히 구분된 임시 SVG를 사용한다. 명찰은 동일 레이아웃에 칭호별 문양·등급 스타일을 적용하며 아바타 프레임과 독립된 레이어다. 실제 생성 파일 목록/검증 결과는 최종 보고와 아트 매니페스트를 따른다.

아트 재생성 공통 프롬프트: Single centered individual [트로피 주제], transparent PNG square canvas, bright friendly 2D RPG collectible, white silver light gray teal #137b70 mint, soft top-left lighting, clean outlines, consistent front three-quarter view, generous margins, legible at48px, no text watermark. 교체 파일은 동일 ID 경로로 넣고 PNG 투명도·정사각형·작은 크기 가독성을 확인한다.

검증: 기존 전체 121개 테스트와 이후 추가한 전체 판정·중복 지급 테스트 1개가 통과했다. 고의로 트로피 INSERT를 실패시키는 격리 PostgreSQL 트리거로 세 보상 모두 롤백됨을 검증했다. 실제 AI는 Mock으로 대체했다. 브라우저 컬렉션·잠긴 칭호·상세 패널을 360/390/768/1366/1920px에서 검사했다. 테스트 스크립트는 frontend/scripts/check-achievements.cjs다.

실제 아트: 20개 PNG를 개별 생성해 frontend/public/trophies에 연결했다. 모두 서로 다른 SHA256이며 투명 코너와 512×512 규격을 확인했다. 전체 파일·원본 식별자·해시는 docs/trophy-assets.json, 트로피별 재생성 프롬프트와 적용 경로는 docs/trophy-prompts.json에 있다. 그림은 1차 생성본이며 일부 메달/배지가 받침대형 트로피로 표현되어 실루엣과 금색 강조의 추가 아트 디렉션은 후속 개선점이다. 원본 파일은 Codex generated_images에 남기고 웹용 PNG만 정규화했다.


변경 파일 목록:
- `AGENTS.md`
- `backend/src/achievement/achievement.module.ts`
- `backend/src/achievement/achievement.service.spec.ts`
- `backend/src/achievement/catalog.spec.ts`
- `backend/src/achievement/catalog.ts`
- `backend/src/app.module.ts`
- `backend/src/habit/habit.service.ts`
- `backend/src/quest/quest.service.ts`
- `backend/src/shop/shop.service.ts`
- `backend/src/stabilization.integration.spec.ts`
- `docs/achievements.md`
- `docs/trophy-assets.json`
- `docs/trophy-prompts.json`
- `frontend/public/trophies/buy.png`
- `frontend/public/trophies/equip.png`
- `frontend/public/trophies/g1000.png`
- `frontend/public/trophies/h1.png`
- `frontend/public/trophies/h5.png`
- `frontend/public/trophies/l10.png`
- `frontend/public/trophies/l20.png`
- `frontend/public/trophies/l5.png`
- `frontend/public/trophies/q1.png`
- `frontend/public/trophies/q10.png`
- `frontend/public/trophies/q100.png`
- `frontend/public/trophies/q30.png`
- `frontend/public/trophies/reward.png`
- `frontend/public/trophies/s14.png`
- `frontend/public/trophies/s3.png`
- `frontend/public/trophies/s30.png`
- `frontend/public/trophies/s7.png`
- `frontend/public/trophies/schedule.png`
- `frontend/public/trophies/season.png`
- `frontend/public/trophies/weekly.png`
- `frontend/scripts/check-achievements.cjs`
- `frontend/src/components/AchievementCollection.tsx`
- `frontend/src/components/QuestDashboard.tsx`
- `frontend/src/components/titleStyles.ts`
- `frontend/src/index.css`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/RankingPage.tsx`
