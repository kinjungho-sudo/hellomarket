-- =============================================
-- 관리자 비밀번호 컬럼 추가
-- hgm_notification_settings 테이블에 admin_password 저장
-- =============================================

ALTER TABLE hgm_notification_settings
  ADD COLUMN IF NOT EXISTS admin_password text;

-- 기본 비밀번호 설정 (반드시 변경하세요)
UPDATE hgm_notification_settings
SET admin_password = 'hgm2026!'
WHERE admin_password IS NULL;
