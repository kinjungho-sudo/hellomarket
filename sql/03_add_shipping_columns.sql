-- =============================================
-- hgm_users 테이블에 기본 배송 정보 컬럼 추가
-- 주문 시 입력한 배송 정보를 저장해 다음 주문 시 자동 채움
-- =============================================

ALTER TABLE hgm_users
  ADD COLUMN IF NOT EXISTS default_zipcode        text,
  ADD COLUMN IF NOT EXISTS default_address        text,
  ADD COLUMN IF NOT EXISTS default_address_detail text,
  ADD COLUMN IF NOT EXISTS default_delivery_memo  text;
