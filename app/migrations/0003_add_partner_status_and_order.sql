-- partners 테이블에 활성화 상태와 출력 순서를 저장하기 위한 스키마 확장
ALTER TABLE partners ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE partners ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
