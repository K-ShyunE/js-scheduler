# 배포

## 호스팅 대상

React 프론트엔드는 Cloudflare Pages에 배포하고, 서버 API는 Cloudflare
Pages Functions로 처리합니다.

Cloudflare D1은 Pages 프로젝트에 바인딩해서 데이터베이스로 사용합니다.

## 환경 변수 전략

Cloudflare에 `.env` 파일 자체를 배포하지 않습니다.

다음처럼 구분합니다.

- 로컬 개발: git에서 제외된 `.dev.vars` 또는 `.env`.
- 프로덕션: Cloudflare Pages의 Variables and Secrets.

Vite의 `VITE_` 접두사가 붙은 값은 브라우저 번들에 포함될 수 있습니다.
따라서 공개되어도 되는 프론트엔드 값에만 `VITE_`를 사용합니다.

민감한 값에는 절대 `VITE_`를 붙이지 않습니다.

## 추천 프로덕션 변수

Secret으로 등록할 값:

```txt
GOOGLE_CLIENT_SECRET
SESSION_SECRET
TOKEN_ENCRYPTION_KEY
ALLOWED_EMAILS
```

일반 변수 또는 낮은 민감도의 값:

```txt
GOOGLE_CLIENT_ID
GOOGLE_REDIRECT_URI
APP_BASE_URL
```

민감도가 낮은 값이라도 운영상 명확성을 위해 Cloudflare 프로젝트 변수에
등록해 관리할 수 있습니다.

## Cloudflare 리소스 계획

추천 리소스:

- Cloudflare Pages 프로젝트.
- 앱 데이터를 저장할 D1 데이터베이스.
- 짧은 OAuth state 값을 저장할 선택적 KV namespace.
- OAuth와 세션 키를 저장할 Cloudflare 프로젝트 secret.

OAuth state는 서명된 짧은 수명의 쿠키로도 처리할 수 있습니다. KV는 구현을
단순하게 만들 때만 사용합니다.

## 무료 사용량 보호

앱은 인증되지 않은 트래픽에 비싼 작업을 수행하지 않아야 합니다.

규칙:

- 정적 자산은 Pages가 직접 제공합니다.
- Functions는 `/api/*`에서만 실행합니다.
- API route는 D1 또는 Google 호출 전에 세션을 확인합니다.
- OAuth callback은 token 교환 전에 `state`를 검증합니다.
- 동기화 endpoint는 세션과 허용 사용자를 요구합니다.
- 로그인 시작 endpoint는 단순하고 rate limit에 유리하게 유지합니다.

선택적 보호:

- Cloudflare Bot Fight Mode.
- Cloudflare WAF custom rules.
- Cloudflare Turnstile.

## 배포 흐름

1. 로컬에서 개발합니다.
2. `.env` 또는 `.dev.vars` 없이 소스 코드만 커밋합니다.
3. 저장소를 Cloudflare Pages에 연결합니다.
4. build command와 output directory를 설정합니다.
5. D1 데이터베이스를 생성하고 바인딩합니다.
6. 프로덕션 Variables and Secrets를 추가합니다.
7. preview 배포를 확인합니다.
8. Google OAuth callback domain을 테스트합니다.
9. production으로 배포합니다.

## 로컬 개발 메모

로컬 개발에서는 다음을 먼저 준비합니다.

- OAuth 완성 전 UI 작업을 위한 mock 데이터.
- 데이터베이스 작업을 위한 로컬 D1 migration.
- route와 callback URL 준비 후 Google OAuth 테스트.

이렇게 하면 핵심 UI와 데이터베이스 동작이 안정된 뒤 인증과 Google 연동을
붙일 수 있습니다.
