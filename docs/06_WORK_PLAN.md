# 작업 계획

## Phase 0: 프로젝트 초기 설정

목표: 깔끔한 React 프로젝트 기반을 만듭니다.

작업:

- Vite React TypeScript 프로젝트 초기화.
- Tailwind CSS 추가.
- linting 및 formatting 설정.
- 기본 폴더 구조 추가.
- 라우트 shell과 placeholder 페이지 추가.
- Stitch 디자인 파일을 기준으로 design token 추가.

산출물:

- 빈 대시보드 shell이 로컬에서 실행됩니다.

## Phase 1: 디자인 시스템과 레이아웃

목표: 업로드된 디자인 방향을 재사용 가능한 UI 컴포넌트로 옮깁니다.

작업:

- 사이드바와 상단바가 있는 app shell 구현.
- 버튼, input, card, status badge, table 스타일 구현.
- mock 데이터 기반 대시보드 구현.
- mock 데이터 기반 일정 목록 화면 구현.
- mock 데이터 기반 일정 등록 화면 구현.
- mock 데이터 기반 채널 및 업체 관리 화면 구현.

산출물:

- 인증이나 데이터베이스 없이도 리뷰할 수 있는 시각적 프로토타입.

## Phase 2: 로컬 데이터 모델과 Mock API

목표: 실제 인프라 연결 전에 앱 동작을 먼저 정의합니다.

작업:

- TypeScript 도메인 타입 정의.
- Zod 검증 schema 정의.
- mock 데이터 fixture 작성.
- API client 추상화 작성.
- 폼과 테이블을 mock API 함수에 연결.
- 일정 생성, 목록, 검색 상호작용 추가.

산출물:

- 로컬 mock 데이터만으로 최종 제품처럼 동작하는 앱.

## Phase 3: Cloudflare D1 백엔드

목표: 실제 애플리케이션 데이터를 저장합니다.

작업:

- Cloudflare Pages Functions 구조 추가.
- D1 schema migration 추가.
- schedules API 구현.
- channels API 구현.
- partners API 구현.
- sync log API 구현.
- 서버 측 검증 추가.

산출물:

- 앱에서 D1에 일정을 생성하고 조회할 수 있습니다.

## Phase 4: 세션과 접근 제어

목표: Google 연동 전에 실제 데이터를 보호합니다.

작업:

- 필요하면 임시 local/dev session 처리 추가.
- 서버 측 session middleware 추가.
- 인증되지 않은 API 요청이 D1 접근 전에 반환되는지 확인.
- 로그인 화면 추가.
- 접근 거부 화면 추가.

산출물:

- 보호된 API와 화면이 실제 Google OAuth 연결을 받을 준비가 됩니다.
- 현재 구현 상태: 서명된 세션 쿠키, API 미들웨어, 로컬 개발 로그인까지 완료.

## Phase 5: Google OAuth

목표: 하나의 Google 행위로 앱 로그인과 연동 권한을 처리합니다.

작업:

- Google OAuth client 생성.
- OAuth start endpoint 추가.
- OAuth callback endpoint 추가.
- `state`와 허용 이메일 검증.
- 암호화된 refresh token 저장.
- 앱 session cookie 발급.
- 로그아웃 추가.

산출물:

- 허용된 Google 사용자가 로그인해서 앱에 접근할 수 있습니다.

## Phase 6: Google Sheets와 Calendar 작성

목표: 등록된 일정 데이터를 Google로 전달합니다.

작업:

- Google access token refresh 구현.
- 일정 생성 후 Google Sheet 행 생성.
- 일정 생성 후 Google Calendar 일정 생성.
- Google 객체 ID를 D1에 저장.
- sync status와 sync log 추가.
- 실패한 동기화 재시도 추가.

산출물:

- 일정을 등록하면 D1에 저장되고 Google Sheets와 Calendar에도 작성됩니다.

## Phase 7: 리뷰, 보강, 배포

목표: 개인용 production 사용 준비를 마칩니다.

작업:

- 크롤러와 무료 사용량 보호 검토.
- secret 처리 검토.
- 검증과 API 동작에 대한 기본 테스트 추가.
- Cloudflare production variables와 secrets 추가.
- Cloudflare Pages 배포.
- production domain에서 OAuth callback 테스트.
- 일정 등록 end-to-end 테스트.

산출물:

- 초기 사용자를 위한 production-ready 개인 앱.

## 추천 구현 순서

인증과 Google 연동은 의도적으로 후반에 배치합니다.

추천 순서:

1. 시각적 shell을 만듭니다.
2. mock 데이터로 폼과 테이블을 만듭니다.
3. D1과 실제 CRUD API를 붙입니다.
4. session check로 API를 보호합니다.
5. Google OAuth를 추가합니다.
6. Google Sheets와 Calendar 작성을 추가합니다.
7. 배포하고 보강합니다.

이 순서는 OAuth와 Google API의 복잡도를 도입하기 전에 디자인, 데이터 모델,
앱 동작을 먼저 리뷰할 수 있게 해줍니다.
