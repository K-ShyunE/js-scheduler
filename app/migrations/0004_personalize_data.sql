-- channels, partners, products 테이블에 user_id 컬럼 추가
ALTER TABLE channels ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE partners ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE products ADD COLUMN user_id TEXT REFERENCES users(id);
