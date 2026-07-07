INSERT OR IGNORE INTO partners (
  id, name, type, contact_name, contact_phone, memo, created_at, updated_at
) VALUES
  (
    'partner_01',
    'Dyson Korea',
    'supplier',
    '김현우',
    '010-1234-5678',
    '생활가전 주력 공급 업체',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'partner_02',
    'Luminous Global Media',
    'agency',
    '박지민',
    '010-2222-3344',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

INSERT OR IGNORE INTO channels (
  id, name, alias, type, is_active, display_order, created_at, updated_at
) VALUES
  (
    'channel_01',
    'Home Shopping+',
    'HS+',
    'home_shopping',
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'channel_02',
    'Live TV 01',
    'LTV1',
    'home_shopping',
    1,
    2,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'channel_03',
    'Global 24',
    'G24',
    'live_commerce',
    1,
    3,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

INSERT OR IGNORE INTO products (
  id, name, brand_name, model_name, partner_id, created_at, updated_at
) VALUES
  (
    'product_01',
    'V15 디텍트 앱솔루트 엑스트라',
    '다이슨',
    'V15 Detect',
    'partner_01',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'product_02',
    '에어랩 멀티 스타일러 롱',
    '다이슨',
    'Airwrap Long',
    'partner_01',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

INSERT OR IGNORE INTO schedules (
  id,
  product_id,
  partner_id,
  channel_id,
  sale_date,
  sale_start_time,
  sale_end_time,
  shipment_date,
  quantity,
  status,
  sync_status,
  created_at,
  updated_at
) VALUES
  (
    'schedule_01',
    'product_01',
    'partner_01',
    'channel_01',
    '2026-07-10',
    '20:00',
    '21:00',
    '2026-07-12',
    180,
    'scheduled',
    'synced',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'schedule_02',
    'product_02',
    'partner_01',
    'channel_02',
    '2026-07-13',
    '14:00',
    '15:00',
    '2026-07-15',
    120,
    'shipping_ready',
    'sync_pending',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

INSERT OR IGNORE INTO sync_logs (
  id, schedule_id, target, operation, status, message, created_at
) VALUES
  (
    'sync_01',
    'schedule_01',
    'sheets',
    'create',
    'success',
    'Google Sheets 행 작성 완료',
    CURRENT_TIMESTAMP
  ),
  (
    'sync_02',
    'schedule_01',
    'calendar',
    'create',
    'success',
    'Google Calendar 일정 생성 완료',
    CURRENT_TIMESTAMP
  );

