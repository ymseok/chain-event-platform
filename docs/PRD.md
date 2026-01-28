# Chain Event Platform - PRD (Product Requirements Document)

## 1. 개요

### 1.1 프로젝트 명
Chain Event Platform (체인 이벤트 플랫폼)

### 1.2 프로젝트 목적
블록체인 네트워크에서 발생하는 블록, 트랜잭션, 이벤트 정보를 실시간으로 수집하고, 등록된 ABI(Application Binary Interface) 기반으로 이벤트를 디코딩하여 사용자가 등록한 Webhook(Hook API)으로 전달하는 플랫폼 구축

### 1.3 비즈니스 가치
- 블록체인 이벤트 모니터링 자동화
- 스마트 컨트랙트 이벤트 기반 비즈니스 로직 트리거 지원
- 외부 시스템과의 블록체인 데이터 연동 간소화
- 실시간 알림 및 데이터 동기화 인프라 제공

---

## 2. 기능 요구사항

### 2.1 블록 리더 (Block Reader)

#### 2.1.1 블록 수집
- [ ] 지정된 블록체인 노드(RPC Endpoint)에 연결하여 블록 정보 수집
- [ ] 실시간 신규 블록 구독 (WebSocket/Polling 지원)
- [ ] 특정 블록 높이부터 재수집 가능 (Re-sync)
- [ ] 블록 정보 파싱 (블록 번호, 타임스탬프, 해시, 트랜잭션 목록 등)

#### 2.1.2 트랜잭션 처리
- [ ] 블록 내 모든 트랜잭션 추출
- [ ] 트랜잭션 상세 정보 수집 (from, to, value, input data, gas 등)
- [ ] 트랜잭션 영수증(Receipt) 조회 및 이벤트 로그 추출

#### 2.1.3 지원 체인
- [ ] EVM 호환 체인 우선 지원 (Ethereum, Polygon, BSC, Arbitrum 등)
- [ ] 체인별 RPC Endpoint 설정 관리
- [ ] 멀티체인 동시 모니터링 지원

### 2.2 메시지 큐 (Message Queue)

#### 2.2.1 큐 적재
- [ ] 수집된 블록/트랜잭션/이벤트 정보를 메시지 큐에 적재
- [ ] 메시지 형식 표준화 (JSON)
- [ ] 메시지 우선순위 및 순서 보장

#### 2.2.2 큐 관리
- [ ] 메시지 재시도(Retry) 정책
- [ ] Dead Letter Queue (DLQ) 관리
- [ ] 메시지 TTL(Time To Live) 설정

### 2.3 ABI 레지스트리 (ABI Registry)

#### 2.3.1 ABI 등록
- [ ] 스마트 컨트랙트 ABI JSON 등록
- [ ] 컨트랙트 주소와 ABI 매핑
- [ ] ABI 버전 관리

#### 2.3.2 ABI 관리
- [ ] ABI 조회/수정/삭제
- [ ] 이벤트 시그니처 자동 추출 및 인덱싱
- [ ] 함수 시그니처 자동 추출 및 인덱싱

### 2.4 이벤트 프로세서 (Event Processor)

#### 2.4.1 이벤트 매칭
- [ ] 큐에서 메시지 소비(Consume)
- [ ] 트랜잭션/이벤트 로그와 등록된 ABI 매칭
- [ ] 이벤트 시그니처(topic0) 기반 필터링
- [ ] 컨트랙트 주소 기반 필터링

#### 2.4.2 이벤트 디코딩
- [ ] ABI를 사용하여 이벤트 로그 디코딩
- [ ] indexed/non-indexed 파라미터 파싱
- [ ] 디코딩된 데이터의 타입 변환 (bytes → 가독성 있는 형식)

### 2.5 훅 매니저 (Hook Manager)

#### 2.5.1 훅 등록
- [ ] Webhook URL 등록
- [ ] 훅 트리거 조건 설정 (컨트랙트 주소, 이벤트 타입 등)
- [ ] 인증 정보 설정 (API Key, Bearer Token 등)
- [ ] 훅 활성화/비활성화

#### 2.5.2 훅 호출
- [ ] 매칭된 이벤트 발생 시 등록된 Webhook 호출
- [ ] HTTP POST 방식 호출
- [ ] 요청 본문에 디코딩된 이벤트 정보 포함
- [ ] 커스텀 헤더 지원

#### 2.5.3 훅 호출 관리
- [ ] 호출 실패 시 재시도 (Exponential Backoff)
- [ ] 최대 재시도 횟수 설정
- [ ] 호출 이력 로깅
- [ ] 실패 알림

### 2.6 관리 API (Admin API)

#### 2.6.1 ABI 관리 API
- [ ] `POST /api/v1/abis` - ABI 등록
- [ ] `GET /api/v1/abis` - ABI 목록 조회
- [ ] `GET /api/v1/abis/{id}` - ABI 상세 조회
- [ ] `PUT /api/v1/abis/{id}` - ABI 수정
- [ ] `DELETE /api/v1/abis/{id}` - ABI 삭제

#### 2.6.2 훅 관리 API
- [ ] `POST /api/v1/hooks` - 훅 등록
- [ ] `GET /api/v1/hooks` - 훅 목록 조회
- [ ] `GET /api/v1/hooks/{id}` - 훅 상세 조회
- [ ] `PUT /api/v1/hooks/{id}` - 훅 수정
- [ ] `DELETE /api/v1/hooks/{id}` - 훅 삭제
- [ ] `POST /api/v1/hooks/{id}/test` - 훅 테스트 호출

#### 2.6.3 모니터링 API
- [ ] `GET /api/v1/status` - 시스템 상태 조회
- [ ] `GET /api/v1/blocks/latest` - 최신 처리 블록 조회
- [ ] `GET /api/v1/hooks/{id}/logs` - 훅 호출 이력 조회

---

## 3. 비기능 요구사항

### 3.1 성능
- 초당 최소 100개 이상의 트랜잭션 처리
- 이벤트 발생 후 Webhook 호출까지 지연 시간 5초 이내
- 메시지 큐 처리량: 초당 1,000 메시지 이상

### 3.2 가용성
- 시스템 가용성 99.9% 목표
- 무중단 배포 지원
- 장애 발생 시 자동 복구

### 3.3 확장성
- 수평 확장(Scale-out) 가능한 아키텍처
- 체인별 독립적인 워커 확장
- 메시지 큐 파티셔닝 지원

### 3.4 보안
- API 인증/인가 (JWT, API Key)
- HTTPS 필수
- 민감 정보 암호화 저장 (Webhook 인증 정보 등)
- Rate Limiting

### 3.5 운영
- 구조화된 로깅 (JSON 형식)
- 메트릭 수집 및 모니터링 (Prometheus/Grafana)
- 알림 시스템 연동 (Slack, Email 등)

---

## 4. 시스템 아키텍처

### 4.1 구성 요소

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Chain Event Platform                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │              │    │              │    │              │    │           │ │
│  │ Block Reader │───▶│ Message Queue│───▶│   Event     │───▶│   Hook    │ │
│  │              │    │              │    │  Processor   │    │  Caller   │ │
│  └──────┬───────┘    └──────────────┘    └──────┬───────┘    └─────┬─────┘ │
│         │                                        │                  │       │
│         │                                        │                  │       │
│  ┌──────▼───────┐                        ┌──────▼───────┐    ┌─────▼─────┐ │
│  │  Blockchain  │                        │     ABI      │    │  Webhook  │ │
│  │    Nodes     │                        │   Registry   │    │ Endpoints │ │
│  └──────────────┘                        └──────────────┘    └───────────┘ │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                           Admin API                                   │  │
│  │  (ABI Management, Hook Management, Monitoring)                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                          Database (PostgreSQL)                        │  │
│  │  (ABIs, Hooks, Processed Blocks, Call Logs)                          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 데이터 흐름

1. **Block Reader**: 블록체인 노드에서 새로운 블록 감지
2. **Block Parser**: 블록 내 트랜잭션 및 이벤트 로그 추출
3. **Queue Producer**: 추출된 데이터를 메시지 큐에 적재
4. **Event Processor**: 큐에서 메시지 소비 및 ABI 매칭
5. **Event Decoder**: 매칭된 이벤트의 ABI 기반 디코딩
6. **Hook Caller**: 디코딩된 이벤트를 등록된 Webhook으로 전송

---

## 5. 기술 스택 (제안)

### 5.1 Backend
| 구분 | 기술 | 비고 |
|------|------|------|
| Runtime | Node.js (v20+) | TypeScript 사용 |
| Framework | NestJS | 모듈화된 구조, DI 지원 |
| ORM | Prisma | Type-safe 데이터베이스 접근 |

### 5.2 Blockchain
| 구분 | 기술 | 비고 |
|------|------|------|
| Web3 Library | ethers.js v6 또는 viem | ABI 인코딩/디코딩, RPC 통신 |

### 5.3 Infrastructure
| 구분 | 기술 | 비고 |
|------|------|------|
| Database | PostgreSQL | 메인 데이터 저장소 |
| Message Queue | Redis (Bull) 또는 RabbitMQ | 메시지 브로커 |
| Cache | Redis | 블록 높이, 세션 캐시 |

### 5.4 DevOps
| 구분 | 기술 | 비고 |
|------|------|------|
| Container | Docker | 컨테이너화 |
| Orchestration | Docker Compose / Kubernetes | 배포 환경에 따라 선택 |
| CI/CD | GitHub Actions | 자동화 파이프라인 |

---

## 6. 데이터 모델

### 6.1 주요 엔티티

#### Chain (체인)
```typescript
{
  id: string;
  name: string;           // "Ethereum", "Polygon" 등
  chainId: number;        // 1, 137 등
  rpcEndpoint: string;    // RPC URL
  wsEndpoint?: string;    // WebSocket URL (선택)
  isActive: boolean;
  lastProcessedBlock: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### ABI
```typescript
{
  id: string;
  chainId: string;
  contractAddress: string;
  name: string;           // 컨트랙트 이름
  abi: JSON;              // ABI JSON
  events: JSON;           // 추출된 이벤트 시그니처
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Hook
```typescript
{
  id: string;
  name: string;
  url: string;            // Webhook URL
  method: string;         // "POST"
  headers: JSON;          // 커스텀 헤더
  authType: string;       // "none", "api_key", "bearer"
  authValue?: string;     // 암호화된 인증 값
  filters: JSON;          // 트리거 조건
  retryCount: number;     // 최대 재시도 횟수
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### HookFilter (훅 필터 조건)
```typescript
{
  id: string;
  hookId: string;
  chainId: string;
  contractAddress?: string;  // 특정 컨트랙트 (선택)
  eventSignature?: string;   // 특정 이벤트 (선택)
  createdAt: Date;
}
```

#### HookLog (훅 호출 이력)
```typescript
{
  id: string;
  hookId: string;
  blockNumber: number;
  txHash: string;
  eventData: JSON;
  requestBody: JSON;
  responseStatus: number;
  responseBody?: string;
  attemptCount: number;
  status: string;         // "success", "failed", "pending"
  createdAt: Date;
}
```

---

## 7. API 스펙 (주요)

### 7.1 ABI 등록
```
POST /api/v1/abis

Request Body:
{
  "chainId": "string",
  "contractAddress": "0x...",
  "name": "MyContract",
  "abi": [...]
}

Response (201):
{
  "id": "uuid",
  "chainId": "string",
  "contractAddress": "0x...",
  "name": "MyContract",
  "events": [
    {
      "name": "Transfer",
      "signature": "0xddf252ad..."
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 7.2 훅 등록
```
POST /api/v1/hooks

Request Body:
{
  "name": "My Webhook",
  "url": "https://my-server.com/webhook",
  "headers": {
    "X-Custom-Header": "value"
  },
  "authType": "bearer",
  "authValue": "my-secret-token",
  "filters": [
    {
      "chainId": "ethereum-mainnet",
      "contractAddress": "0x...",
      "eventSignature": "Transfer(address,address,uint256)"
    }
  ],
  "retryCount": 3
}

Response (201):
{
  "id": "uuid",
  "name": "My Webhook",
  "url": "https://my-server.com/webhook",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 7.3 Webhook 호출 페이로드 (Hook → 외부 시스템)
```json
{
  "eventId": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "chain": {
    "id": "ethereum-mainnet",
    "name": "Ethereum",
    "chainId": 1
  },
  "block": {
    "number": 18500000,
    "hash": "0x...",
    "timestamp": 1700000000
  },
  "transaction": {
    "hash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "value": "0"
  },
  "event": {
    "name": "Transfer",
    "signature": "0xddf252ad...",
    "contractAddress": "0x...",
    "logIndex": 0,
    "args": {
      "from": "0x...",
      "to": "0x...",
      "value": "1000000000000000000"
    },
    "raw": {
      "topics": ["0x...", "0x...", "0x..."],
      "data": "0x..."
    }
  }
}
```

---

## 8. 마일스톤

### Phase 1: 기반 구축
- 프로젝트 초기 설정 (NestJS, TypeScript, ESLint, Prettier)
- 데이터베이스 스키마 설계 및 구축
- 기본 API 구조 구현

### Phase 2: 블록체인 연동
- Block Reader 구현 (단일 체인)
- 트랜잭션/이벤트 로그 파싱
- 메시지 큐 연동

### Phase 3: ABI 관리
- ABI Registry 구현
- ABI 기반 이벤트 디코딩
- 관리 API 구현

### Phase 4: 훅 시스템
- Hook Manager 구현
- Webhook 호출 및 재시도 로직
- 호출 이력 관리

### Phase 5: 운영 고도화
- 멀티체인 지원
- 모니터링/알림 시스템
- 성능 최적화

---

## 9. 위험 요소 및 대응 방안

| 위험 요소 | 영향도 | 대응 방안 |
|-----------|--------|-----------|
| RPC 노드 장애 | 높음 | 다중 RPC Endpoint 설정, Fallback 로직 |
| 메시지 큐 장애 | 높음 | 클러스터 구성, 메시지 영속성 |
| 블록 재구성(Reorg) | 중간 | Confirmation 대기, Reorg 감지 로직 |
| Webhook 호출 실패 | 중간 | 재시도 로직, DLQ 관리 |
| 대량 이벤트 발생 | 중간 | Rate Limiting, 큐 파티셔닝 |

---

## 10. 용어 정의

| 용어 | 설명 |
|------|------|
| ABI | Application Binary Interface, 스마트 컨트랙트와 상호작용하기 위한 인터페이스 정의 |
| Event Log | 스마트 컨트랙트에서 emit된 이벤트의 기록 |
| Topic | 이벤트 로그의 인덱싱된 파라미터, topic0은 이벤트 시그니처 해시 |
| Webhook | 특정 이벤트 발생 시 HTTP 요청을 통해 외부 시스템에 알림을 전송하는 메커니즘 |
| Reorg | 블록체인 재구성, 기존 블록이 다른 블록으로 대체되는 현상 |
| DLQ | Dead Letter Queue, 처리 실패한 메시지를 보관하는 별도 큐 |

---

## 11. 참고 자료

- [Ethereum JSON-RPC Specification](https://ethereum.org/en/developers/docs/apis/json-rpc/)
- [ethers.js Documentation](https://docs.ethers.org/v6/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Bull Queue Documentation](https://docs.bullmq.io/)

---

*문서 버전: 1.0*
*최초 작성일: 2024-01-28*
*최종 수정일: 2024-01-28*
