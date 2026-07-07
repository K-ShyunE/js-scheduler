# 데이터 모델

## 데이터 소유권

Cloudflare D1을 애플리케이션의 주 데이터베이스로 사용합니다.

MVP에서는 Google Sheets와 Google Calendar를 공유 및 백업 화면으로
취급합니다. 처음부터 Google을 원본으로 삼아 양방향 동기화를 구현하면
충돌 처리, 삭제 처리, 권한 문제, 실패 케이스가 크게 늘어나므로 초기
범위에서는 피합니다.

## 핵심 엔티티

### users

허용된 이메일로 로그인에 성공한 사용자입니다.

추천 필드:

- `id`
- `email`
- `name`
- `picture_url`
- `google_sub`
- `created_at`
- `last_login_at`

### google_connections

Google OAuth token과 연결 상태를 저장합니다.

추천 필드:

- `id`
- `user_id`
- `google_email`
- `encrypted_refresh_token`
- `scope`
- `expires_at`
- `created_at`
- `updated_at`

refresh token은 반드시 암호화해서 저장합니다.

### partners

공급 업체, 브랜드, 비즈니스 파트너를 나타냅니다.

추천 필드:

- `id`
- `name`
- `type`
- `contact_name`
- `contact_phone`
- `memo`
- `created_at`
- `updated_at`

### channels

홈쇼핑 채널 또는 판매 채널입니다.

추천 필드:

- `id`
- `name`
- `alias`
- `type`
- `is_active`
- `display_order`
- `created_at`
- `updated_at`

### products

판매 및 출고 일정에 연결되는 상품입니다.

추천 필드:

- `id`
- `name`
- `brand_name`
- `model_name`
- `partner_id`
- `memo`
- `created_at`
- `updated_at`

### schedules

가장 중요한 업무 기록입니다.

추천 필드:

- `id`
- `product_id`
- `partner_id`
- `channel_id`
- `sale_date`
- `sale_start_time`
- `sale_end_time`
- `shipment_date`
- `quantity`
- `status`
- `memo`
- `google_sheet_row_id`
- `google_calendar_event_id`
- `sync_status`
- `created_by`
- `created_at`
- `updated_at`

추천 상태 값:

- `draft`: 임시 저장.
- `scheduled`: 판매 예정.
- `sold`: 판매 완료.
- `shipping_ready`: 출고 준비.
- `shipped`: 출고 완료.
- `cancelled`: 취소.

추천 동기화 상태 값:

- `not_synced`: 아직 동기화되지 않음.
- `synced`: 동기화 완료.
- `sync_failed`: 동기화 실패.
- `sync_pending`: 동기화 대기.

### sync_logs

Google 연동 시도에 대한 감사 로그입니다.

추천 필드:

- `id`
- `schedule_id`
- `target`
- `operation`
- `status`
- `message`
- `google_object_id`
- `created_at`

추천 대상 값:

- `sheets`
- `calendar`

추천 작업 값:

- `create`
- `update`
- `delete`
- `retry`

## MVP 등록 폼 필드

초기 일정 등록 폼에서 수집할 정보:

- 상품명.
- 브랜드 또는 공급 업체.
- 홈쇼핑 채널.
- 판매일.
- 판매 시작 시간.
- 판매 종료 시간.
- 출고일.
- 수량.
- 메모.

나중에 추가할 수 있는 선택 필드:

- 발주 번호.
- 택배사.
- 송장 번호.
- 담당자.
- 원가 또는 정산 금액.
- 첨부 링크.
