CREATE TABLE allowed_users (
  email TEXT PRIMARY KEY,
  added_by TEXT,
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
