# HabitQuest 개발 지침

## 구조

- `frontend/`은 React·TypeScript·Vite 앱입니다. 개발 서버는 포트 3000에서 `/api`를 로컬 API 포트 3001로 프록시합니다. 운영 Nginx는 기존 웹 Container App에서 기존 API Container App으로 같은 경로를 프록시합니다.
- `backend/`는 NestJS API입니다. `persona`는 DB 세션, `quest`는 퀘스트·출석·성장·통계, `shop`은 구매·장착, `ranking`은 월간 순위, `ai`는 Model Router 통신을 담당합니다. PostgreSQL 모델은 `backend/prisma/schema.prisma`를 기준으로 합니다.
- README는 개요, PRD와 TRD는 요구사항, AI-IDEA1은 기능 아이디어입니다. 문서와 코드가 다르면 현재 구현을 확인한 뒤 제품 정책 변경을 별도로 검토합니다.

## 로컬 실행 및 검증

- Node.js 20의 최신 패치 또는 프론트엔드 lockfile이 지원하는 Node.js와 npm을 사용합니다. 운영 이미지와 CI는 Node.js 20입니다. 프론트엔드와 백엔드에서 각각 `npm ci`를 실행합니다.
- 로컬 DB만 사용합니다. `backend/.env.example`을 참고해 무시되는 `backend/.env`에 로컬 `DATABASE_URL`을 설정합니다. Docker가 있으면 백엔드에서 `npx prisma generate`, `npm run db:local`, `npm run build`, `npm run start:local` 순서로 실행할 수 있습니다. 로컬 스크립트는 loopback PostgreSQL을 요구하고 Docker 볼륨에 테스트 데이터를 만듭니다.
- Docker 없이 별도 로컬 PostgreSQL을 사용할 때는 DB 대상을 확인한 뒤 백엔드에서 `npx prisma generate`, `npx prisma db push`, `npx prisma db seed`, `npm run start:dev`를 실행합니다. `db push`와 `db seed`의 대상은 폐기 가능한 로컬 DB여야 합니다.
- 프론트엔드는 `npm run dev`로 실행합니다. 백엔드 `GET /health`는 프로세스 확인용입니다. `GET /ready`는 DB와 주요 스키마 필드를 확인하고, 이미지 커밋과 Router 설정 여부를 반환합니다. Router 추론 호출은 포함하지 않습니다.
- 백엔드에서 `npm run build`와 `npm test -- --runInBand`, 프론트엔드에서 `npm run build`를 실행합니다. TypeScript 확인만 필요할 때는 프론트엔드에서 `npm run type-check`를 사용합니다.
- HTTP 통합 테스트를 실행하려면 새 PostgreSQL DB 이름을 `habitquest_test`로 두고 호스트 `127.0.0.1`의 연결 URL을 `HABITQUEST_TEST_DATABASE_URL`과 `DATABASE_URL`에 설정합니다. 해당 DB에만 `npx prisma db push --skip-generate`를 적용한 뒤 Jest를 실행합니다. 이 테스트는 사용자를 생성하고 롤백 검증용 트리거를 사용하므로 폐기 가능한 DB를 사용합니다. Router는 Nest 테스트에서 모의 응답으로 교체합니다.

## 데이터와 게임 규칙

- 현재 UUID Bearer 세션, 만료 규칙, 기존 사용자 ID 및 저장된 데이터를 호환합니다. 서버는 세션에서 사용자 ID를 정합니다. 클라이언트의 사용자 ID나 보상 값을 신뢰하지 않습니다.
- 서버가 KST(Asia/Seoul) 기준으로 일일 퀘스트, 출석, 스트릭 및 월간 시즌을 결정합니다. 날짜 문자열과 UTC 저장 시각을 구분하고 자정·월말·윤년을 검증합니다.
- 완료·구매·성장 보상은 같은 사용자의 행을 먼저 잠근 뒤 잔액·로그·인벤토리를 한 트랜잭션으로 처리합니다. AI 호출은 트랜잭션 밖에서 끝내고 저장 직전 퀘스트 날짜·상태를 다시 확인합니다. 완료한 슬롯은 리롤에서도 유지합니다.
- 현재 규칙은 300 XP당 레벨, 퀘스트 지급 골드 하루 최대 300, 시즌 포인트 하루 최대 60입니다. 쉬움·보통·어려움의 기본 포인트는 10·20·30점이며 같은 카테고리의 세 번째 완료부터 20% 감산합니다. 보호권·리롤권·꾸미기 가격과 보유 한도는 서버 서비스와 카탈로그를 따릅니다. 정책 변경 시 기존 기록과 재시도·동시 요청의 영향을 검토합니다.

## Azure 및 배포

- 후속 맞춤형 습관은 `habit/` 모듈과 `user_habits`의 고유 ID를 사용합니다. 이름 변경·보관에서 기록을 삭제하지 않습니다. `scheduleHistory`의 과거 버전은 수정하지 않고, 일반 일정은 다음 KST 날짜, 주간 일정 전환·목표 변경은 다음 월요일에 적용합니다. 주간 목표는 서로 다른 실천 날짜 수로 평가합니다.
- 오늘 생성된 퀘스트는 습관 설정 변경으로 다시 만들지 않습니다. 새 생성과 리롤은 활성·오늘 실천 가능한 습관마다 한 개씩 최대 3개를 만듭니다. 후보가 없으면 AI를 호출하지 않습니다. 복구 코드·회원가입·로그인 UI는 추가하지 않습니다.
- `prisma/custom-habits-upgrade.sql`은 격리 DB에서 검증한 추가 스키마 변경입니다. 운영에는 아직 적용하지 않았습니다. 배포 전 별도 승인과 [맞춤형 습관 릴리스 계획](docs/custom-habits.md)의 스키마 선행 적용이 필요합니다.

- GitHub Actions OIDC → 기존 ACR → 기존 API·웹 Container App 이미지 업데이트 경로를 사용합니다. 리소스 그룹, 리전, Container Apps Environment, 인그레스, 두 앱 간 라우팅, PostgreSQL, Foundry 및 운영 URL을 유지합니다. 세부 절차는 [배포 문서](docs/deployment.md)를 따릅니다.
- Model Router는 백엔드에서 `FOUNDRY_MODEL_ROUTER_ENDPOINT`와 `FOUNDRY_MODEL_ROUTER_DEPLOYMENT`로 연결합니다. Azure에서는 기존 사용자 할당 관리 ID와 Entra RBAC를 사용합니다. 로컬에서는 필요한 경우 기존 Azure CLI 자격 증명을 사용할 수 있습니다. 유료 추론 호출은 별도 승인 후 실행합니다.
- 토큰, API 키, DB 연결 문자열, 환경 파일 및 Azure Secret 값을 출력하거나 커밋하지 않습니다. Actions OIDC 식별자와 운영 DB Secret의 관리 경계를 지킵니다.
- 개발 브랜치와 PR에서는 검증만 실행합니다. `master` 병합과 운영 배포는 사용자가 승인한 커밋 기준으로 진행합니다. 운영 리소스 변경, 워크플로 실행, DB 마이그레이션·시드·복구, URL 및 네트워크 변경 전에 승인을 받습니다. 읽기 전용 점검은 필요한 필드만 조회합니다.

## 업적 컬렉션
- `achievement/`는 기존 Inventory의 별도 itemType으로 업적 영수증·칭호·트로피·행동 증거를 저장한다. 사용자 행 잠금 안에서 세 보상을 원자적으로 지급하며 XP·골드 보너스는 없다. 기존 공개 인벤토리 응답에서는 내부 증거를 제외한다.
- 컬렉션의 명시적 확인 시 서버가 판정한다. 직접 등록/일정 설정/장착은 도입 후 증거만 사용한다. 누적 골드 업적은 원장 도입 전에는 판정 보류이며 현재 잔액이나 추정값으로 지급하지 않는다. 세부 정책은 docs/achievements.md를 따른다.
