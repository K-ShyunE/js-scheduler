# 아키텍처

## 전체 구조

```txt
브라우저
  -> Cloudflare Pages 정적 자산
  -> /api/* Cloudflare Pages Functions
       -> Cloudflare D1
       -> Google OAuth / Sheets / Calendar API
```

프론트엔드는 Cloudflare Pages에서 제공되는 React 단일 페이지 앱입니다.
백엔드 로직은 Cloudflare Pages Functions 또는 Workers에서 실행합니다.
D1은 앱의 주 데이터베이스로 사용하고, Google Sheets와 Google Calendar는
공유 및 백업 성격의 외부 연동 대상으로 사용합니다.

## 이 구조를 선택하는 이유

이 프로젝트는 사용자가 적고 상시 실행되는 전통적인 서버가 필요하지
않습니다. Cloudflare Pages와 Functions를 사용하면 저렴하고 빠르게 운영할
수 있으면서도 OAuth secret, Google refresh token, 데이터베이스 접근을
브라우저 밖에 안전하게 둘 수 있습니다.

## 주요 프론트엔드 화면

- `Login`: Google 로그인 진입 화면.
- `Dashboard`: 예정 판매, 예정 출고, 최근 동기화 상태.
- `ScheduleCreate`: 판매 및 출고 일정 등록 폼.
- `ScheduleList`: 검색과 필터가 가능한 일정 테이블.
- `Partners`: 공급 업체, 브랜드, 홈쇼핑 채널 관리.
- `AccountStatus`: Google 연결 및 동기화 상태.
- `Settings`: 추후 필요한 운영 설정.

## 주요 API 영역

- `GET /api/session`: 현재 인증된 사용자 정보 반환.
- `POST /api/auth/google/start`: Google OAuth 시작.
- `GET /api/auth/google/callback`: OAuth callback 처리.
- `POST /api/auth/logout`: 앱 세션 종료.
- `GET /api/schedules`: 일정 목록 조회.
- `POST /api/schedules`: 일정 생성 및 Google 작성 실행 또는 예약.
- `GET /api/channels`: 홈쇼핑 채널 목록 조회.
- `POST /api/channels`: 홈쇼핑 채널 생성.
- `GET /api/partners`: 공급 업체 또는 파트너 목록 조회.
- `POST /api/partners`: 공급 업체 또는 파트너 생성.
- `POST /api/sync/:scheduleId/retry`: 실패한 Google 작성 재시도.

## 요청 보호

OAuth 시작과 callback을 제외한 모든 API는 유효한 세션을 요구해야 합니다.

중요 규칙:

```txt
세션 없음 -> D1 읽기/쓰기 없음, Google API 호출 없음
```

이 규칙은 인증되지 않은 크롤러가 Cloudflare 무료 사용량을 소모하는 것을
줄이고, 앱 데이터를 보호합니다.

## 동기화 전략

초기 전략은 로컬 우선 단방향 동기화입니다.

1. 일정을 D1에 저장합니다.
2. Google Sheets에 행을 생성합니다.
3. Google Calendar에 일정을 생성합니다.
4. 생성된 Google 객체 ID와 동기화 결과를 D1에 저장합니다.

이 방식은 빠르고 예측 가능합니다. 완전한 양방향 동기화는 실제 업무
가치가 복잡도보다 크다고 판단될 때 나중에 추가합니다.

## 오류 처리

Google 작성이 실패했을 때 일정 생성 전체를 조용히 실패시키면 안 됩니다.

추천 동작:

- D1 저장은 성공했지만 Google 작성이 실패하면 일정 기록은 유지합니다.
- 해당 일정을 `sync_failed` 상태로 표시합니다.
- 오류 메시지를 동기화 로그 테이블에 저장합니다.
- UI에서 재시도 액션을 제공합니다.

이렇게 하면 데이터 손실을 막고 연동 실패를 추적할 수 있습니다.

## 코드 주석 정책

나중에 코드 리뷰할 때 의사결정을 이해하는 데 필요한 곳에 주석을 남깁니다.

- OAuth `state`와 PKCE 검증 이유.
- 인증되지 않은 API 요청이 D1 접근 전에 반환되는 이유.
- refresh token을 저장 전에 암호화하는 이유.
- D1을 앱의 주 데이터베이스로 보는 이유.
- Google 동기화를 단방향으로 시작하는 이유.

코드가 이미 말하고 있는 내용을 반복하는 주석은 피합니다.
