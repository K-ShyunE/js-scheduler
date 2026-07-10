-- google_connections 테이블에 출고일정 캘린더 ID를 저장하기 위한 컬럼 추가
ALTER TABLE google_connections ADD COLUMN shipment_calendar_id TEXT;

-- schedules 테이블에 출고일정 구글 캘린더 이벤트 ID를 저장하기 위한 컬럼 추가
ALTER TABLE schedules ADD COLUMN google_calendar_shipment_event_id TEXT;
