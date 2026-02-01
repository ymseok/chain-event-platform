# Admin Api Component

## Entity

### Core Entities
- **User**: 플랫폼 사용자
  - id, email, password, name, createdAt, updatedAt

- **Application**: 사용자의 프로젝트/서비스 단위
  - id, userId, name, description, status (active/inactive), createdAt, updatedAt
  - 1개의 Application은 여러 Program, Webhook을 가질 수 있음

### Blockchain Event Entities
- **Chain**: 블록체인 네트워크 정보
  - id, name (Ethereum, Polygon, BSC, etc.), chainId, rpcUrl, status (active/inactive)
  - 시스템 관리자가 관리

- **Program**: 추적할 스마트 컨트랙트 단위
  - id, applicationId, chainId, name, contractAddress, abi (JSON), status (active/inactive), createdAt, updatedAt
  - 1개의 ABI 세트와 1:1 매핑
  - 1개의 Program은 여러 Event를 포함

- **Event**: ABI에 정의된 이벤트
  - id, programId, name, signature (event signature hash), parameters (JSON), createdAt
  - ABI 파싱 시 자동 생성

### Subscription & Notification Entities
- **Webhook**: 이벤트 발생 시 호출될 엔드포인트
  - id, applicationId, name, url, headers (JSON), retryPolicy (JSON), status (active/inactive), createdAt, updatedAt
  - retryPolicy: { maxRetries, retryInterval, backoffMultiplier }
  - security(target API): Shared Secret + HMAC , API Key

- **EventSubscription**: Event와 Webhook의 연결 관계
  - id, eventId, webhookId, filterConditions (JSON, optional), status (active/paused), createdAt, updatedAt
  - filterConditions: 특정 파라미터 값 필터링 (예: from address, amount > 1000)

- **WebhookLog**: Webhook 호출 이력
  - id, webhookId, eventSubscriptionId, payload (JSON), responseStatus, responseBody, attemptCount, succeededAt, failedAt

## User Story

### 1. Application & Authentication Management
- User는 Application을 생성할 수 있다
- Application은 식별 정보(name, description)를 가진다
- User는 Application별로 여러 개의 ApiKey를 발급할 수 있다
- ApiKey는 이름과 만료일을 설정할 수 있다
- User는 ApiKey를 언제든지 revoke할 수 있다

### 2. Program & ABI Management
- User는 Application 내에 Program을 등록할 수 있다
- Program 등록 시 블록체인 네트워크(Chain)를 선택해야 한다
- Program 등록 시 컨트랙트 주소(contractAddress)를 입력해야 한다
- User는 스마트 컨트랙트의 ABI를 파일 업로드 또는 텍스트 붙여넣기로 등록할 수 있다
- 시스템은 등록된 ABI를 파싱하여 Event 목록을 자동 생성한다
- User는 생성된 Event 목록을 확인할 수 있다
- User는 Program의 상태를 활성화/비활성화할 수 있다

### 3. Webhook Management
- User는 Application 내에 Webhook을 등록할 수 있다
- Webhook 등록 시 엔드포인트 URL과 이름을 입력해야 한다
- User는 Webhook에 커스텀 헤더를 추가할 수 있다 (인증 토큰 등)
- User는 Webhook의 재시도 정책(retry policy)을 설정할 수 있다
  - 최대 재시도 횟수
  - 재시도 간격
  - Backoff 전략
- User는 Webhook 테스트를 실행하여 연결을 확인할 수 있다
- User는 Webhook의 상태를 활성화/비활성화할 수 있다

### 4. Event Subscription
- User는 Program의 Event를 선택하여 Webhook과 연결(구독)할 수 있다
- 1개의 Event는 여러 Webhook에 구독될 수 있다
- User는 Event Subscription에 필터 조건을 설정할 수 있다
  - 예: Transfer 이벤트의 from 주소가 특정 값일 때만
  - 예: amount 파라미터가 특정 값 이상일 때만
- User는 Event Subscription의 상태를 활성화/일시정지할 수 있다
- User는 구독 중인 Event 목록을 확인할 수 있다

### 5. Monitoring & Logging
- User는 Webhook 호출 이력(WebhookLog)을 조회할 수 있다
- WebhookLog는 다음 정보를 포함한다
  - 호출 시간
  - 전송된 페이로드
  - 응답 상태 코드
  - 응답 본문
  - 재시도 횟수
  - 성공/실패 여부
- User는 실패한 Webhook 호출을 수동으로 재시도할 수 있다
- User는 특정 기간의 통계를 확인할 수 있다
  - Event 발생 건수
  - Webhook 호출 성공률
  - 평균 응답 시간

## API Endpoints (예상)

### Application
- `POST /applications` - Application 생성
- `GET /applications` - Application 목록 조회
- `GET /applications/:id` - Application 상세 조회
- `PATCH /applications/:id` - Application 수정
- `DELETE /applications/:id` - Application 삭제

### ApiKey
- `POST /applications/:appId/api-keys` - ApiKey 발급
- `GET /applications/:appId/api-keys` - ApiKey 목록 조회
- `PATCH /api-keys/:id/revoke` - ApiKey 폐기

### Chain
- `GET /chains` - 지원 블록체인 네트워크 목록 조회

### Program
- `POST /applications/:appId/programs` - Program 등록
- `GET /applications/:appId/programs` - Program 목록 조회
- `GET /programs/:id` - Program 상세 조회 (Events 포함)
- `PATCH /programs/:id` - Program 수정
- `DELETE /programs/:id` - Program 삭제
- `PATCH /programs/:id/status` - Program 활성화/비활성화

### Webhook
- `POST /applications/:appId/webhooks` - Webhook 등록
- `GET /applications/:appId/webhooks` - Webhook 목록 조회
- `GET /webhooks/:id` - Webhook 상세 조회
- `PATCH /webhooks/:id` - Webhook 수정
- `DELETE /webhooks/:id` - Webhook 삭제
- `POST /webhooks/:id/test` - Webhook 테스트 호출

### Event Subscription
- `POST /subscriptions` - Event Subscription 생성
- `GET /applications/:appId/subscriptions` - Subscription 목록 조회
- `GET /subscriptions/:id` - Subscription 상세 조회
- `PATCH /subscriptions/:id` - Subscription 수정 (필터 조건 등)
- `DELETE /subscriptions/:id` - Subscription 삭제
- `PATCH /subscriptions/:id/status` - Subscription 활성화/일시정지

### Webhook Logs
- `GET /webhooks/:id/logs` - Webhook 호출 이력 조회
- `GET /subscriptions/:id/logs` - Subscription별 이력 조회
- `POST /webhook-logs/:id/retry` - 실패한 호출 재시도

### Statistics
- `GET /applications/:appId/stats` - Application 통계 조회
