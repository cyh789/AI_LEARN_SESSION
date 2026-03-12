# Implementation Plan: 증권 시장 스냅샷 웹앱

## Summary

구조는 `정적 프론트엔드 + Node 데이터 게이트웨이`로 간다.

- 프론트엔드는 파일 기반 `HTML + CSS + JavaScript`로 유지한다.
- 서버는 외부 시세 공급자와 통신하고, 최신 데이터를 캐시하고, 브라우저에 스냅샷과 스트림을 제공한다.
- 1차 범위는 `코스피`, `코스닥`, `코스피200`, 대표 종목 몇 개의 거의 실시간 표시다.

## Requirements

1. 외부 증권 API를 서버에서 호출해 시장 데이터를 수집
2. 초기 진입 시 최신 스냅샷 REST 제공
3. 장중에는 스트림 기반 갱신 제공
4. 연결 상태, 지연 상태, 오류 상태 표시
5. 관심 자산 및 `Long / Short / Watch` 메모 저장
6. 모바일/데스크톱 반응형 UI

## Provider Strategy

### Phase 1

- `KIS(한국투자 Open API)`를 국내 증시 주 공급자로 사용
- 대상:
  - `KOSPI`
  - `KOSDAQ`
  - `KOSPI200`
  - 대표 종목 예시 `005930`, `000660`

### Phase 2

- `Upbit WebSocket` 연동으로 크립토 확장
- 글로벌 지수 공급자 추가

## Critical Files

### New Files

- `file_based_app/package.json` - 서버 의존성과 실행 스크립트 정의
- `file_based_app/.env.example` - 공급자 키와 환경변수 예시
- `file_based_app/index.html` - 대시보드 화면 마크업
- `file_based_app/styles.css` - 반응형 대시보드 스타일
- `file_based_app/app.js` - 프론트 초기 로딩, SSE 연결, 렌더링, 로컬 상태 저장
- `file_based_app/constants.js` - 자산 라벨, 상태 상수, 포맷터
- `file_based_app/server.js` - 정적 파일 서빙 + API 엔드포인트 + SSE 브로드캐스트
- `file_based_app/providers/kis-client.js` - KIS 토큰 발급, 접속키 발급, REST/WS 연동
- `file_based_app/providers/upbit-client.js` - 2차용 크립토 공급자 어댑터
- `file_based_app/services/market-cache.js` - 최신 시세 메모리 캐시와 stale 계산
- `file_based_app/services/stream-broker.js` - SSE 연결 관리와 브로드캐스트
- `file_based_app/services/market-normalizer.js` - 공급자별 원본 응답을 내부 포맷으로 변환

### Modified Files

- `file_based_app/README.md` - 실시간 데이터 수집 구조 반영
- `file_based_app/spec.md` - 서버 게이트웨이 요구사항 반영
- `file_based_app/plan.md` - 구현 계획 반영

### Reference Files

- `AI_LEARN_SESSION/weather_app/server.js` - 간단한 Node 서버 구조 참고
- `AI_LEARN_SESSION/weather_app/app.js` - 브라우저 상태 관리와 렌더링 패턴 참고

## Architecture

### User Flow

```text
브라우저에서 index.html 진입
  -> app.js bootstrap()
  -> GET /api/market/snapshot
  -> 초기 카드 렌더링
  -> GET /api/market/stream (SSE 연결)
  -> 서버가 변경분 push
  -> 카드 부분 업데이트
  -> 사용자가 관심 자산, Long/Short/Watch, 메모 저장
  -> localStorage 저장
```

### Server Flow

```text
server.js 시작
  -> 환경변수 로드
  -> kis-client 초기화
  -> 토큰 발급
  -> WebSocket 접속키 발급
  -> 초기 스냅샷 REST 수집
  -> market-cache 적재
  -> KIS 실시간 채널 구독
  -> 새 데이터 수신
  -> market-normalizer 변환
  -> market-cache 갱신
  -> stream-broker 로 SSE broadcast
```

### API Surface

```text
GET /api/market/snapshot
  -> 최신 자산 목록 + connectionStatus + lastUpdatedAt 반환

GET /api/market/stream
  -> SSE 연결
  -> quote, status 이벤트 push
```

### Internal Data Shape

```text
asset = {
  symbol: "KOSPI",
  name: "코스피",
  category: "domestic-index",
  price: 2785.42,
  change: 12.31,
  changeRate: 0.44,
  direction: "up",
  marketStatus: "open",
  updatedAt: "2026-03-12T09:15:03+09:00",
  provider: "kis"
}
```

### Real-Time Status Rules

```text
fresh:
  lastTickAgeMs < 3_000

delayed:
  3_000 <= lastTickAgeMs < 15_000

stale:
  15_000 <= lastTickAgeMs < 60_000

disconnected:
  lastTickAgeMs >= 60_000
  or upstream websocket disconnected without recovery
```

### Market Session Rules

```text
preopen:
  정규장 시작 전

open:
  국내 정규 거래시간

afterhours:
  코스피200 야간선물 등 별도 야간 데이터 소스 활성 시간

closed:
  정규장 종료 후 야간 데이터 소스 비활성 시간

weekend:
  토요일, 일요일, 또는 공급자 기준 휴장일
```

### Fallback Rules

```text
1. 공급자 장애 시 마지막 정상 price/change/changeRate/updatedAt 유지
2. 상태만 stale 또는 disconnected 로 변경
3. 화면에는 마지막 수신 시각과 재연결 상태를 함께 노출
4. 복구 후 첫 정상 tick 수신 시 즉시 최신 값으로 동기화
5. 장애 중 추정값이나 0 값으로 덮어쓰지 않음
```

## Implementation Steps

### Step 1: Project Skeleton

- `package.json` 생성
- `server.js`에 정적 파일 서빙과 기본 API 라우트 뼈대 작성
- `index.html`, `styles.css`, `app.js`에 기본 대시보드 레이아웃 구성

### Step 2: KIS Authentication and Snapshot Loader

- `kis-client.js`에 토큰 발급 로직 추가
- 접속키 발급 및 공통 요청 헤더 구성
- 초기 스냅샷용 REST 호출 구현
- 응답을 내부 포맷으로 정규화해 `market-cache`에 적재

### Step 3: Real-Time Stream Intake

- 서버에서 KIS WebSocket 연결 구현
- 대상 자산 구독 로직 구현
- 수신 메시지 파싱, 오류 처리, heartbeat 처리 추가
- 연결 종료 시 재연결 백오프 로직 추가

### Step 4: Snapshot API and SSE Broker

- `GET /api/market/snapshot` 구현
- `GET /api/market/stream` SSE 구현
- 새 시세 수신 시 연결된 모든 클라이언트에 변경분 브로드캐스트
- `fresh < 3초`, `stale >= 15초`, `disconnected >= 60초` 기준의 상태 계산 로직 추가
- `preopen`, `open`, `afterhours`, `closed`, `weekend` 시장 상태 계산 로직 추가
- 공급자 장애 시 마지막 정상 데이터를 유지하는 fallback 로직 추가

### Step 5: Frontend Data Consumption

- 초기 진입 시 `/api/market/snapshot` 호출
- SSE 연결 후 `quote`, `status` 이벤트를 받아 부분 렌더링
- 연결 상태 배지와 마지막 수신 시각 표시
- `fresh`, `delayed`, `stale`, `disconnected` 상태 배지 표시
- `장중`, `장마감`, `야간선물`, `주말` 상태 표시
- 오류/지연/재연결 메시지 표시

### Step 6: Personal State Features

- 관심 자산 pin/unpin
- `Long`, `Short`, `Watch` 상태 선택
- 한 줄 메모 저장
- 위 상태를 `localStorage`에 유지

### Step 7: Hardening

- 공급자 장애 시 fallback UI 정리
- 비거래 시간 표시
- 실시간 상태 계산이 클라이언트와 서버에서 동일하게 동작하는지 검증
- 모바일/데스크톱 반응형 마감
- 추후 `Upbit`나 글로벌 공급자 추가가 가능하도록 provider interface 정리

## Verification

### Install

```bash
npm install
```

### Build Check

```bash
node --check app.js
node --check server.js
node --check providers/kis-client.js
node --check services/market-cache.js
```

### Run

```bash
npm run dev
```

### Manual Test

```text
1. 서버 시작 후 /api/market/snapshot 에 코스피, 코스닥, 코스피200 데이터가 있는지 확인
2. 브라우저 첫 진입 시 초기 카드가 렌더링되는지 확인
3. /api/market/stream 연결 후 새 시세가 들어오면 페이지 전체 새로고침 없이 숫자가 바뀌는지 확인
4. 마지막 수신 후 `3초 미만`, `15초 이상`, `60초 이상` 구간에서 상태가 각각 기대값대로 변하는지 확인
5. 네트워크를 끊거나 서버를 재시작했을 때 마지막 정상 가격은 유지되고 `stale` 또는 `disconnected` 상태가 보이는지 확인
6. 장중, 장마감, 야간선물, 주말 상태가 시간대에 맞게 표시되는지 확인
7. 관심 자산과 메모를 저장한 뒤 새로고침해도 유지되는지 확인
```

## Notes

- 브라우저가 외부 증권 API를 직접 호출하는 구조는 채택하지 않는다.
- 1차는 실시간성 확보가 목표이므로 데이터 소스 수를 무리하게 늘리지 않는다.
- 공급자 라이선스와 사용 약관 검토는 공개 서비스 전 필수다.
