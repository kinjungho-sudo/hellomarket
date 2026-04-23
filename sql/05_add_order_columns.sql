-- =============================================
-- hgm_orders 테이블에 비회원/주문자 정보 컬럼 추가
-- =============================================

ALTER TABLE hgm_orders
  ADD COLUMN IF NOT EXISTS is_guest      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS orderer_name  text,
  ADD COLUMN IF NOT EXISTS orderer_email text;
