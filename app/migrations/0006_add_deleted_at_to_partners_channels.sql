-- channels와 partners 테이블에 논리적 삭제(Soft Delete) 기능을 지원하기 위한 컬럼 추가
ALTER TABLE channels ADD COLUMN deleted_at TEXT;
ALTER TABLE partners ADD COLUMN deleted_at TEXT;
