# Google 연동

## 연동 목표

운영자는 Google 로그인과 Google 연동을 하나의 행위로 느껴야 합니다. 허용된
Google 계정으로 로그인하면, 별도 설정 없이 앱이 Google Sheets와 Google
Calendar에 일정 데이터를 작성할 수 있어야 합니다.

## 추천 OAuth 흐름

Cloudflare Functions에서 Google OAuth를 처리합니다.

로그인용 요청 scope:

- `openid`
- `email`
- `profile`

연동용 요청 scope:

- 일정 행 작성을 위한 Google Sheets scope.
- 일정 생성 및 수정을 위한 Google Calendar scope.

OAuth 요청에는 다음을 사용합니다.

- `access_type=offline`
- refresh token이 필요할 때 `prompt=consent`
- `state` 검증
- 구현상 무리가 없다면 PKCE

## 접근 제어

Google이 사용자 프로필을 반환하면 callback 함수에서 이메일을 허용 목록과
비교합니다.

추천 환경 변수:

```txt
ALLOWED_EMAILS=user1@example.com,user2@example.com
```

허용되지 않은 이메일이면:

- 앱 세션을 만들지 않습니다.
- refresh token을 저장하지 않습니다.
- 접근 거부 화면을 보여줍니다.

## Secret 저장

secret은 절대 프론트엔드 번들에 넣지 않습니다.

프로덕션 값은 Cloudflare Pages 프로젝트 설정의 Variables and Secrets에
등록합니다.

추천 secret 값:

```txt
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://example.com/api/auth/google/callback
SESSION_SECRET=...
TOKEN_ENCRYPTION_KEY=...
ALLOWED_EMAILS=...
```

로컬 개발에서는 `.dev.vars` 또는 `.env`를 사용할 수 있지만, 이 파일들은
커밋하지 않습니다.

## MVP 동기화 방식

처음에는 앱에서 Google로 쓰는 단방향 동기화로 시작합니다.

추천 흐름:

1. 사용자가 일정 등록 폼을 제출합니다.
2. API가 입력값을 검증합니다.
3. API가 일정을 D1에 저장합니다.
4. API가 Google Sheets에 행을 작성합니다.
5. API가 Google Calendar에 일정을 생성합니다.
6. API가 Google 객체 ID와 동기화 상태를 D1에 저장합니다.

이 방식은 완전한 양방향 동기화보다 훨씬 단순하고, 현재의 다이어리 대체
업무 흐름에 잘 맞습니다.

## 처음부터 양방향 동기화를 하지 않는 이유

양방향 동기화는 가능하지만 복잡도가 크게 증가합니다.

다음 질문들에 대한 정책이 필요합니다.

- 누군가 Google Sheet를 직접 수정하면 어떻게 처리할 것인가?
- Google Calendar 일정이 삭제되면 어떻게 처리할 것인가?
- 앱 데이터와 Google 데이터가 다를 때 어느 쪽을 우선할 것인가?
- 중복 데이터는 어떻게 감지할 것인가?
- 부분 실패는 어떻게 재시도할 것인가?
- Google webhook 만료와 갱신은 어떻게 관리할 것인가?

현재 업무는 앱에서 일정을 등록하는 흐름이 중심이므로, MVP에서는 단방향
동기화가 더 안전합니다.

## 향후 동기화 단계

### Level 1: 단방향 생성

일정 등록 시 Sheet 행과 Calendar 일정을 생성합니다.

복잡도: 낮음.

### Level 2: 단방향 수정

앱에서 일정을 수정하면 저장된 Google ID를 이용해 Sheet 행과 Calendar
일정을 갱신합니다.

복잡도: 중간.

### Level 3: 수동 가져오기

관리자가 Google 데이터를 수동으로 가져오거나 비교할 수 있게 합니다.

복잡도: 중상.

### Level 4: 완전한 양방향 동기화

Google 쪽 변경을 자동 감지하고 충돌을 해결합니다.

복잡도: 높음.

추천은 Level 1을 먼저 만들고, 일정 수정이 중요해지는 시점에 Level 2를
추가하는 것입니다.
