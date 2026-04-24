-- =============================================
-- hgm_reviews 테이블에 별점(rating) 컬럼 추가
-- =============================================

ALTER TABLE hgm_reviews
  ADD COLUMN IF NOT EXISTS rating int2 DEFAULT 5 CHECK (rating BETWEEN 1 AND 5);
