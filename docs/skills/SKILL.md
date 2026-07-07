---
name: create-sync-handler
description: 홈쇼핑 스케쥴러의 D1 데이터 저장 및 Google Sheets/Calendar 단방향 동기화 백엔드 API 핸들러 코드를 작성하는 스킬입니다.
---
# 홈쇼핑 스케쥴러 - 동기화 핸들러 생성 스킬 (create-sync-handler)

이 스킬은 홈쇼핑 스케쥴러 프로젝트에서 스케줄(일정) 등록 API 엔드포인트(`onRequestPost`)를 작성할 때 호출되어 사용됩니다.

## 1. 개요 및 목적
홈쇼핑 판매 및 출고 일정을 구조화된 데이터로 D1 데이터베이스에 저장하고, 저장 성공 시 Google Sheets와 Google Calendar API에 단방향 동기화하는 백엔드 코드를 자동 생성합니다. 외부 API 연동 과정에서 실패(Error)가 발생하더라도 D1의 핵심 스케줄 데이터가 롤백되지 않고 `sync_failed` 상태로 로그를 남길 수 있도록 예외 처리를 엄격히 적용하는 보일러플레이트 코드를 제공합니다.

## 2. 핵심 구현 지침

### 1) 인증 및 보안 검증
- 모든 D1 쿼리 및 외부 API 연동 호출 전에 사용자의 유효 세션 쿠키를 우선 검증합니다.
- 인증되지 않은 요청의 경우, D1 조회나 Google API 호출 등의 자원 소모성 동작을 수행하지 않고 즉각 `401 Unauthorized`를 반환합니다.

### 3) Cloudflare D1 저장
- 요청 본문(body) 데이터를 받아 Cloudflare D1 바인딩 객체인 `context.env.DB`를 활용하여 `schedules` 테이블에 데이터를 인서트합니다.

### 4) Google Sheets & Calendar 연동 (단방향 동기화)
- D1 저장 완료 후 비동기로 Google Sheets API (`POST /values:append`)를 호출하여 행을 추가합니다.
- Google Calendar API (`POST /events`)를 호출하여 판매 일정을 캘린더 이벤트로 등록합니다.

### 5) 예외 처리 (Error Handling) 및 복구 로직
- Google Sheets 또는 Calendar API 중 하나라도 실패할 경우, D1의 일정을 지우거나 전체 요청을 실패 처리하지 마십시오.
- D1 레코드의 동기화 상태 필드를 `sync_failed`로 마킹하고, 실패 로그 테이블(`sync_logs`)에 에러 메시지와 발생 시간을 인서트하여 나중에 재시도(Retry)할 수 있도록 합니다.

## 3. 출력 포맷
- TypeScript 기반의 Cloudflare Pages Functions 규격에 맞는 API 핸들러 구조
- 세부 비동기 에러 핸들링 코드가 전부 포함된 실전형 백엔드 코드
