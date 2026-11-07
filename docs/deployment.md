# HabitQuest 운영 배포 및 롤백

운영 주소는 [HabitQuest](https://habitquest-web-aca-50887.whitegrass-9925aedb.koreacentral.azurecontainerapps.io/)입니다. Korea Central의 `rg-habitquest`에서 기존 ACR `habitquestacr50887`과 앱 `habitquest-web-aca-50887`, `habitquest-api-aca-50887`을 사용합니다. 웹의 기존 `BACKEND_URL`, 인그레스와 FQDN은 배포 중 그대로 사용합니다. `infra/azd`는 프로비저닝 정의입니다. 코드 릴리스는 이미지 갱신으로 진행합니다.

## 확인한 운영 기준선

- 웹 `--0000017`, API `--0000011`은 준비 상태가 Healthy였고 각각 트래픽 100%를 처리했습니다. 양쪽 이미지 태그는 `c1f06d5e035c73e00d2f1c3bfcb18762760afdc3`였습니다.
- 두 앱 모두 Single 리비전 모드이며 사용자 지정 프로브는 확인되지 않았습니다. Single 모드에서는 새 리비전이 준비될 때까지 기존 리비전이 트래픽을 받습니다. 새 API 프로세스는 DB 연결과 주요 스키마 필드 확인 후 포트를 엽니다. 명시적 Azure readiness probe 추가는 별도 운영 변경입니다. [Azure 리비전 문서](https://learn.microsoft.com/azure/container-apps/revisions)
- 운영 웹과 웹을 경유한 `/api/health` 응답은 200이었습니다. PostgreSQL 16의 백업 보존 기간은 7일이며 지리 중복 백업은 비활성입니다. Foundry Model Router 배포와 관리 ID의 추론 역할을 확인했습니다. 운영 DB의 실제 스키마 및 사용자 이력, 복구 리허설, 유료 추론 성공 여부는 확인 필요입니다.

## 승인된 변경을 같은 URL에 배포

1. 개발 브랜치에서 빌드와 테스트를 통과시키고 PR을 검토합니다. 검증 워크플로는 Azure에 로그인하지 않으며 격리 PostgreSQL과 모의 Router를 씁니다.
2. 사용자가 승인한 변경을 `master`에 반영하고 해당 커밋의 전체 SHA를 확인합니다. 이 문서의 수동 배포 정책은 변경된 워크플로가 `master`에 반영된 시점부터 적용됩니다. 이전 워크플로는 `master` push 시 배포를 시작하므로 전환 전에 기존 배포의 실행 조건과 승인 범위를 확인합니다.
3. 승인 후 GitHub Actions의 **Deploy HabitQuest to the existing URL**에서 **Run workflow**를 선택합니다. 브랜치는 `master`, 입력 `approved_sha`는 승인한 전체 SHA입니다. 브랜치와 SHA가 맞으면 빌드 및 통합 테스트를 다시 실행합니다. 수동 실행 권한은 저장소의 권한 설정을 따릅니다. 별도 검토자 승인을 강제하려면 GitHub 환경 보호 규칙과 Entra OIDC subject 호환성을 확인한 뒤 적용합니다. [GitHub 실행 조건](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) · [GitHub 환경 보호 규칙](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
4. 워크플로는 두 이미지를 빌드하고 기존 앱의 호스트와 리비전 모드를 검사한 뒤, 이전 정상 이미지와 리비전을 실행 요약에 기록합니다. 동일 SHA 태그로 기존 ACR에 푸시하고 API를 먼저 갱신합니다. API가 준비된 뒤 웹을 갱신합니다.
5. 앱별 FQDN, 기대 이미지, 준비 리비전과 100% 트래픽을 검증합니다. 웹의 `/version.json`과 웹을 경유하는 `/api/ready`에서 같은 커밋 SHA를 확인합니다. `/api/ready`의 DB·스키마 검사와 Router 설정 플래그는 추론 비용 없이 확인할 수 있습니다. 웹을 경유한 읽기 전용 페르소나 목록에서 세 가지 기본 역할도 확인합니다. 두 버전 확인 응답은 `no-store`를 적용하고 HTML은 다시 검증하도록 설정합니다.
6. 동일 운영 주소에서 승인된 확인 전용 세션으로 기존 세션·기록 조회를 확인합니다. 운영 신규 세션 생성과 유료 Foundry 추론 검증은 별도로 승인합니다.

## 실패 시 복원

- 새 리비전이 준비되기 전의 실패에는 Single 모드가 이전 버전을 유지합니다. API만 갱신된 상태에서 웹이 실패할 수 있으므로 각각의 실제 트래픽과 SHA를 확인합니다.
- 전환 후 문제가 확인되면 실행 요약의 **이전 정상 이미지**를 확인합니다. 승인을 받은 뒤, 갱신된 기존 앱에 `az containerapp update --resource-group rg-habitquest --name <기존-앱> --image <이전-정상-이미지>`를 각각 적용합니다. 앱이 모두 바뀐 경우 웹을 먼저 복원하고 API를 복원합니다. 실행 요약에 기록한 FQDN과 새로 생성된 준비 리비전·이미지·트래픽을 대조합니다. 이전 이미지에 버전 API가 없으면 Azure 리비전의 이미지 태그와 기존 웹·API 상태 확인으로 검증합니다.
- 앱 롤백 전 새·이전 버전이 같은 DB 스키마를 사용할 수 있는지 확인합니다. DB 되돌리기는 별도로 승인합니다.

## DB 변경과 보안 계획

- 이번 변경에 Prisma 스키마 변경은 없습니다. 저장소에는 `prisma/migrations` 이력이 없으며 기존 변경은 `foundation-upgrade.sql`, `quest-reflection.sql`, `activity-upgrade.sql`로 관리됩니다. 운영 SQL 적용 이력은 확인 필요입니다. 운영에서 스크립트를 다시 적용하기 전에 실제 컬럼·인덱스와 데이터 상태를 읽기 전용으로 대조합니다.
- 스키마 변경이 필요한 후속 배포에서는 기존 버전과 호환되는 변경을 먼저 작성하고 폐기 가능한 DB에서 적용·앱 롤백을 검증합니다. 운영에서는 현재 백업과 복원 가능 시점을 확인한 후 승인된 변경만 수행합니다. PITR은 별도 서버에 복원해 먼저 검증하고 운영 전환은 별도 승인합니다.
- 운영 PostgreSQL의 `AllowAzureServices` 규칙과 관리자 연결 사용 범위를 줄이는 계획을 제안합니다. 관리 권한 없는 앱 전용 역할의 권한을 검증하고 별도 자격 증명으로 테스트한 뒤 Secret 교체를 계획합니다. 앱의 실제 아웃바운드 연결과 복구 경로를 확인한 후 제한된 방화벽 또는 사설 연결의 전환 순서를 결정합니다. 두 변경은 각각 승인과 롤백 계획이 필요합니다.
- 분산 호출 제한이 필요해지면 신뢰 가능한 ingress 기준으로 클라이언트 식별과 공용 한도를 검토합니다. 현재 앱 제한은 리비전의 각 프로세스 단위로 적용됩니다.


## 경험 개선 릴리스 체크리스트

- 검증 워크플로에서 백엔드와 프론트엔드 빌드, 격리 PostgreSQL·모의 Router 통합 테스트를 통과시킵니다. 운영 DB 스키마 변경은 없습니다.
- API부터 적용합니다. 기존 퀘스트와 랭킹 응답의 `data` 형태는 유지하고 카테고리, 보상 설명, 시즌 기간을 선택 필드로 추가했습니다. 새 활동 요약은 인증이 필요한 `GET /users/me/activity`를 사용합니다.
- 승인된 배포 후 기존 웹 FQDN에서 새 SHA, 준비 상태, 페르소나 목록을 확인합니다. 기존 세션에서 오늘의 퀘스트와 활동 통계, 실제 랭킹을 읽기 전용으로 확인합니다. 새 완료·구매와 유료 AI 요청은 운영에서 별도 승인 없이 실행하지 않습니다.
- 화면 또는 API에 문제가 생기면 실행 요약의 이전 이미지를 사용해 이 문서의 복원 절차를 따릅니다.


## 페르소나 프로필과 시즌 정산 릴리스

- 백업 및 복구 가능 시점을 확인하고 승인 후 `backend/prisma/continuity-upgrade.sql`을 기존 스키마에 적용한 뒤 API와 웹 이미지를 순서대로 갱신합니다. 스키마는 기존 테이블과 기록을 보존하는 추가 변경이며, 앱 롤백 시 새 테이블이나 컬럼을 삭제하지 않습니다. 준비 상태 확인은 새 스키마를 요구합니다.
- 앱은 기존 페르소나 선택과 Bearer 세션으로 시작합니다. 개인 프로필 사진은 해당 페르소나의 세션에서만 조회됩니다.
- 정산은 KST 월말이 지난 지정 월에 한해 실행합니다. `DATABASE_URL`을 안전한 실행 환경에 주입한 상태에서 `npm run season:settle -- YYYY-MM`으로 지급 예정 인원을 확인한 뒤, 승인 후에만 `npm run season:settle -- YYYY-MM --apply`를 실행합니다. 월을 명시해야 하며 일괄 소급 지급이나 자동 작업은 연결하지 않았습니다.
- 참여 기준은 양수 시즌 포인트입니다. 같은 점수는 현재 랭킹과 동일하게 사용자 ID 오름차순으로 순서를 정하며, 상위 비율별 누적 커트라인은 올림합니다. 각 사용자는 해당하는 가장 높은 구간의 보상 하나를 받습니다. 정산 완료 월 재실행은 지급을 반복하지 않습니다.
- 이미지 롤백은 이미 적용된 보상을 되돌리지 않습니다. 잘못된 정산의 데이터 보정은 앱 롤백과 분리해 승인 및 검토합니다.
