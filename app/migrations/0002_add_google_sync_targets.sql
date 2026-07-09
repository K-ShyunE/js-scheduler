-- google_connections 테이블에 spreadsheet_id와 calendar_id를 저장하기 위한 스키마 확장
ALTER TABLE google_connections ADD COLUMN spreadsheet_id TEXT;
ALTER TABLE google_connections ADD COLUMN calendar_id TEXT;
