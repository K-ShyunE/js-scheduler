CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  picture_url TEXT,
  google_sub TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE TABLE google_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  google_email TEXT NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('supplier', 'brand', 'logistics', 'agency')),
  contact_name TEXT,
  contact_phone TEXT,
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  alias TEXT,
  type TEXT NOT NULL CHECK (type IN ('home_shopping', 'live_commerce', 'online')),
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  model_name TEXT,
  partner_id TEXT NOT NULL,
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners (id)
);

CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  sale_date TEXT NOT NULL,
  sale_start_time TEXT NOT NULL,
  sale_end_time TEXT NOT NULL,
  shipment_date TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'scheduled', 'sold', 'shipping_ready', 'shipped', 'cancelled')
  ),
  memo TEXT,
  google_sheet_row_id TEXT,
  google_calendar_event_id TEXT,
  sync_status TEXT NOT NULL CHECK (
    sync_status IN ('not_synced', 'synced', 'sync_failed', 'sync_pending')
  ),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products (id),
  FOREIGN KEY (partner_id) REFERENCES partners (id),
  FOREIGN KEY (channel_id) REFERENCES channels (id),
  FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE TABLE sync_logs (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('sheets', 'calendar')),
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'retry')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  message TEXT NOT NULL,
  google_object_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules (id)
);

CREATE INDEX idx_schedules_sale_date ON schedules (sale_date);
CREATE INDEX idx_schedules_shipment_date ON schedules (shipment_date);
CREATE INDEX idx_schedules_sync_status ON schedules (sync_status);
CREATE INDEX idx_products_partner_id ON products (partner_id);
CREATE INDEX idx_sync_logs_schedule_id ON sync_logs (schedule_id);

