# 온에어 플래너 (On-Air Planner)

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

## 데이터베이스 마이그레이션 (DB 구조 변경)

앱의 기능이 추가되어 DB 테이블 구조가 변경(마이그레이션)될 경우, 로컬과 원격 DB 모두 업데이트가 필요합니다.

### 1. 로컬(개발) 환경 마이그레이션
Docker 컨테이너를 구동 중일 때, 아래 명령어로 로컬 DB를 업데이트할 수 있습니다:
```bash
docker exec -it js-scheduler-app-1 npm run db:migrate:local
```

### 2. 프로덕션(원격) 환경 마이그레이션
코드를 Github에 푸시(Push)하여 배포할 때, Cloudflare에 있는 실제 데이터베이스 구조도 동일하게 업데이트해야 합니다. 푸시 직전/직후에 호스트(WSL) 터미널의 `app` 폴더 내에서 아래 명령어를 실행해 주세요:

```bash
# 1. (최초 1회) Cloudflare 로그인
npx wrangler login

# 2. 원격 DB 마이그레이션 실행
npx wrangler d1 migrations apply DB --remote
```

> [!NOTE]
> **마이그레이션 작동 원리**
> - **npx 명령어:** 내 PC에 무언가를 영구 설치하는 것이 아니라, 프로젝트 폴더(`node_modules`)에 설치된 `wrangler` 도구를 1회성으로 안전하게 실행합니다.
> - **DB 추적 원리:** `app/wrangler.toml` 파일에 적혀있는 `database_id`를 읽어들여 전 세계에 단 하나뿐인 사용자님의 데이터베이스를 찾아갑니다.
> - **인증 원리:** `npx wrangler login`을 통해 발급된 보안 토큰을 사용하여 안전하게 원격 DB 구조를 변경합니다. 도커(Docker) 컨테이너 내부는 브라우저 창을 띄울 수 없어 로그인이 먹통이 되므로, 안전하고 깔끔한 호스트(WSL) 환경에서 실행하는 것이 권장됩니다.

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
