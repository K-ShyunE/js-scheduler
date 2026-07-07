# Luminous Scheduler

홈쇼핑 판매 일정과 출고 일정을 관리하는 개인용 업무 도구입니다.

## 현재 구현 상태

현재 단계는 Cloudflare 연결 전 로컬 프로토타입입니다.

- React 19 + Vite + TypeScript 프로젝트 구조
- Tailwind 기반 디자인 토큰
- Stitch 초안 분위기를 반영한 대시보드 shell
- mock 데이터 기반 대시보드, 일정 등록, 검색 목록, 업체/채널 관리, 계정 상태 화면
- 일정 등록 폼 검증 schema
- 나중에 실제 `/api/*`로 교체하기 쉬운 mock API 계층
- D1 초기 schema migration 초안
- 서명된 세션 쿠키 기반 API 보호
- Google OAuth 전 단계의 로컬 개발 로그인

## Cloudflare보다 로컬 구현을 먼저 진행한 이유

Cloudflare Pages, D1, Google OAuth는 계정 권한과 외부 설정이 필요합니다.
그래서 사용자 개입 없이 가능한 범위에서는 먼저 UI, 데이터 모델, mock API를
완성하고, 이후 D1과 OAuth를 연결하는 순서가 더 안전합니다.

현재 구현 순서:

1. 화면과 데이터 흐름을 mock으로 검토합니다.
2. D1 schema와 `/api/*`를 붙입니다.
3. session 보호를 추가합니다.
4. Google OAuth와 Sheets/Calendar 작성을 연결합니다.
5. Cloudflare Pages에 배포합니다.

## 실행 방법

이 PC에서는 현재 `node`와 `npm`이 PATH에서 확인되지 않았습니다. Node.js를
설치하거나 PATH를 잡은 뒤 아래 명령을 실행합니다.

```bash
npm install
npm run dev
```

Docker Compose로 실행할 경우:

```bash
docker compose up --build
```

빌드 확인:

```bash
npm run build
```

## 환경 변수

로컬 개발에서는 `.env` 또는 `.dev.vars`를 사용할 수 있습니다. 실제 값은
커밋하지 않습니다.

예시는 [.env.example](./.env.example)에 있습니다.

프로덕션에서는 `.env` 파일을 업로드하지 않고 Cloudflare Pages의 Variables
and Secrets에 등록합니다.

## Cloudflare 준비 파일

- [migrations/0001_initial.sql](./migrations/0001_initial.sql): D1 초기 schema.
- [seed/dev.sql](./seed/dev.sql): 로컬 D1 확인용 개발 seed 데이터.
- [wrangler.toml](./wrangler.toml): 로컬 D1과 Cloudflare Pages Functions 실행 설정.
  Cloudflare 원격 D1을 만든 뒤 `database_id`를 실제 값으로 교체합니다.

로컬 D1 API 확인 순서:

```bash
npm run db:migrate:local
npm run db:seed:local
```

그 다음 Cloudflare Pages Functions 개발 서버를 실행합니다. 빌드된 Pages
환경에서는 기본적으로 실제 `/api/*`를 사용합니다.

```bash
npm run cf:dev
```

일반 `npm run dev`는 빠른 화면 개발을 위해 mock API를 기본으로 사용합니다.
Google OAuth와 D1 API를 같이 확인할 때는 `npm run dev` 대신 `npm run cf:dev`만
실행합니다. 이 서버는 `.env`의 로컬 callback URI와 맞추기 위해 `5173` 포트를
사용합니다.

## 인증 개발 상태

현재 실제 Google OAuth는 아직 연결하지 않았습니다. 대신 Cloudflare Pages
Functions 환경에서는 로컬 개발 로그인으로 세션 흐름을 확인합니다.

- 세션 없음: `/api/channels`, `/api/schedules` 같은 보호 API는 D1 접근 전 `401` 반환.
- 개발 로그인: `/api/auth/dev-login`이 로컬 환경에서만 세션 쿠키 발급.
- 로그아웃: `/api/auth/logout`이 세션 쿠키 삭제.

프로덕션에서는 `DEV_AUTH_ENABLED`를 켜지 않습니다. 다음 단계에서 Google OAuth
callback이 이 개발 로그인 역할을 대체합니다.

## 문서

문서는 읽는 순서대로 [docs](./docs)에 정리되어 있습니다.
