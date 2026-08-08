# HabitQuest MVP - 개발 가이드

## 🎮 프로젝트 개요

HabitQuest는 게임형 습관 형성 플랫폼입니다. 사용자는 일일 퀘스트를 완료하고 경험치, 골드, 스트릭을 획득하며 성장합니다.

**기술 스택:**
- 프론트엔드: React 18 + TypeScript + Vite + Tailwind CSS (Apple HIG)
- 백엔드: NestJS + TypeScript + PostgreSQL + Prisma ORM
- 인증: 테스트 페르소나 3개 (회원가입/로그인 제외)

---

## 📁 프로젝트 구조

```
HabitQuest/
├── frontend/                   # React 웹 애플리케이션
│   ├── src/
│   │   ├── components/        # Apple HIG 기반 UI 컴포넌트
│   │   ├── pages/             # 페이지 컴포넌트
│   │   ├── store/             # Zustand 상태 관리
│   │   ├── api/               # API 클라이언트
│   │   ├── types/             # TypeScript 타입
│   │   ├── utils/             # 유틸리티 함수
│   │   ├── hooks/             # Custom Hooks
│   │   └── App.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                    # NestJS API 서버
│   ├── src/
│   │   ├── persona/           # 페르소나/세션 모듈
│   │   ├── quest/             # 퀘스트 모듈
│   │   ├── common/            # 공통 모듈
│   │   ├── prisma/            # Prisma ORM
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   └── ...
│   ├── prisma/
│   │   └── schema.prisma      # DB 스키마
│   ├── .env.example
│   └── package.json
│
├── docs/                       # 문서
│   ├── PRD.md                 # 제품 요구사항
│   ├── TRD.md                 # 기술 요구사항
│   └── IDEA.txt               # 초기 개념
│
├── IDEA.txt                    # 프로젝트 개념
├── PRD.md                      # 제품 요구사항
├── TRD.md                      # 기술 요구사항
├── .gitignore
└── README.md                   # 이 파일
```

---

## 🚀 시작하기

### 1. 프로젝트 클론 및 설정

```bash
cd HabitQuest

# 패키지 설치
cd frontend
npm install

cd ../backend
npm install
```

### 2. 데이터베이스 설정

```bash
cd backend

# .env 파일 생성
cp .env.example .env

# .env 파일에 PostgreSQL 연결 정보 설정
# DATABASE_URL="postgresql://user:password@localhost:5432/habitquest_dev"

# Prisma 마이그레이션
npx prisma migrate dev --name init

# 테스트 데이터 시드
npx prisma db seed
```

### 3. 백엔드 실행

```bash
cd backend
npm run start:dev
# 서버: http://localhost:3001
# API Docs: http://localhost:3001/api-docs
```

### 4. 프론트엔드 실행

```bash
cd frontend
npm run dev
# 앱: http://localhost:3000
```

---

## 🎯 MVP 기능

### ✅ 포함된 기능

**페르소나 & 세션**
- [ ] 3개 테스트 페르소나 선택 (초심자, 활발한 사용자, 고도화된 사용자)
- [ ] 페르소나별 독립적인 세션 관리
- [ ] 마지막 활동 기반 다중 탭 지원

**퀘스트**
- [ ] 일일 3개 퀨스트 자동 생성 (KST 00:00 기준)
- [ ] 3가지 난이도 (쉬움, 보통, 어려움)
- [ ] 퀘스트 완료 시 경험치/골드 지급
- [ ] 퀨스트 상태 관리 (대기, 완료)

**보상 & 레벨**
- [ ] 경험치 기반 레벨업 (300 exp/레벨)
- [ ] 레벨업 시 보상 (뱃지, 칭호)
- [ ] 일일 골드 획득 상한 (300 골드)

**출석 & 연속**
- [ ] 일일 출석 확인 (하루 1개 이상 완료)
- [ ] 연속 달성 추적
- [ ] 30일 연속 시 방지권 무료 지급

**방지권 & 상점**
- [ ] 방지권 최대 3개 보유
- [ ] 방지권 상점 가격 1000 골드
- [ ] 주간 최대 2회 구매 제한
- [ ] 꾸미기 아이템 (Common 100, Rare 300, Epic 700, Legendary 1500)

**통계 & 프로필**
- [ ] 월간 성공률 조회
- [ ] 총 완료 횟수
- [ ] 현재/최고 연속 기록

### 🔄 2차 릴리스 (Phase 2)

- [ ] AI 대화형 퀘스트 인증
- [ ] AI 난이도 자동 제안
- [ ] 고급 경제 밸런싱
- [ ] 모바일 앱 확장

---

## 🏗️ API 엔드포인트

### 페르소나/세션

```
GET    /personas                    # 페르소나 목록
POST   /session/start               # 세션 시작 (페르소나 선택)
GET    /session/current             # 현재 세션 정보
POST   /session/end                 # 세션 종료
```

### 퀨스트

```
GET    /quests/daily               # 오늘의 퀨스트
POST   /quests/:questId/complete   # 퀨스트 완료
GET    /quests/history             # 완료 히스토리
```

### 출석/연속/방지권

```
GET    /streak                     # 연속 기록
POST   /streak/protection/use      # 방지권 사용
GET    /attendance/today           # 오늘 출석 상태
```

### 보상/인벤토리/상점

```
GET    /wallet                     # 재화 조회
GET    /inventory                  # 인벤토리
GET    /shop/items                 # 상점 아이템
POST   /shop/purchase              # 구매
```

### 랭킹

```
GET    /ranking/season/current                      # 현재 시즌
GET    /ranking/leaderboard?scope=global|friends|percentile  # 랭킹
GET    /ranking/me                 # 내 랭킹
```

### 통계/프로필

```
GET    /profile                    # 프로필
GET    /stats/monthly              # 월간 통계
```

---

## 🎨 UI/UX (Apple Human Interface Guidelines)

### 핵심 원칙

1. **명확성 (Clarity)**
   - 일관된 타이포그래피 (SF Pro Display)
   - 명확한 아이콘
   - 계층적 정보 구조

2. **기울기 (Deference)**
   - 사용자 콘텐츠 중심
   - 배경은 보조적 역할

3. **깊이 (Depth)**
   - 카드 레이아웃 (둥근 모서리 12-20px)
   - 그림자와 구분선
   - 명확한 상호작용 상태

### 컴포넌트

- `Button`: Primary, Secondary, Destructive, Plain 변형
- `Card`: 인터랙티브 카드 디자인
- `Header`: 네비게이션 헤더
- `TabBar`: 하단 탭 네비게이션
- `PersonaSelector`: 페르소나 선택 UI
- `QuestCard`: 퀨스트 카드

---

## 📱 테스트 페르소나

### Persona A: 초심자 (Beginner)
- 이름: "새로운 도전"
- 레벨: 1, 골드: 0
- 연속: 0일, 최고: 0일
- 완료: 0개
- **역할**: MVP 기본 게임플레이 테스트

### Persona B: 활발한 사용자 (Active)
- 이름: "꾸준한 참여자"
- 레벨: 15, 골드: 2,500
- 연속: 23일, 최고: 45일
- 완료: 156개
- 보유: 방지권 2개, 테두리 1개
- **역할**: 중급 진행, 상점/보상 검증

### Persona C: 고도화된 사용자 (Advanced)
- 이름: "전설의 퀨스터"
- 레벨: 45, 골드: 8,000
- 연속: 89일, 최고: 120일
- 완료: 1,203개
- 보유: 방지권 3개, 전설 테두리, 칭호
- **역할**: 고급 기능, 랭킹, 장기 플레이 시뮬레이션

---

## 🧪 테스트

### 프론트엔드 테스트

```bash
cd frontend
npm run test              # 단위 테스트
npm run test:e2e          # E2E 테스트
```

### 백엔드 테스트

```bash
cd backend
npm run test              # 단위 테스트
npm run test:e2e          # E2E 테스트
```

---

## 🔐 보안

### 현재 (MVP)

- 테스트 페르소나 기반 (인증 제외)
- 클라이언트 세션 관리

### Phase 2 이후

- JWT 기반 인증
- bcrypt/Argon2 비밀번호 해싱
- Rate Limiting
- RBAC (역할 기반 접근 제어)

---

## 📊 성능 목표

- API 응답 시간 (조회): **< 500ms**
- API 응답 시간 (완료/구매): **< 800ms**
- 랭킹 조회: **< 1s** (캐시 없음), **< 300ms** (캐시 있음)

---

## 🐛 알려진 문제

- 다중 탭 동시 세션 처리 미완성
- 오프라인 퀨스트 완료 동기화 미완성
- AI 기반 난이도 피드백 미포함 (Phase 2)

---

## 📖 참고 자료

- [PRD.md](./PRD.md) - 제품 요구사항
- [TRD.md](./TRD.md) - 기술 요구사항
- [IDEA.txt](./IDEA.txt) - 초기 개념
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [NestJS 문서](https://docs.nestjs.com)
- [Prisma 문서](https://www.prisma.io/docs)
- [React 문서](https://react.dev)

---

## 📝 라이선스

MIT

---

## 👥 기여자

HabitQuest Team

---

**마지막 업데이트**: 2026-08-08
