-- =============================================
-- 헬로우가든마켓 DB 스키마
-- 모든 테이블명 hgm_ prefix 사용 (기존 DB 충돌 방지)
-- RLS 미사용 - 서버사이드 권한 체크로 대체
-- =============================================

-- 1. 온라인 판매 상품
CREATE TABLE IF NOT EXISTS hgm_products (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,
  category      text NOT NULL,
  status        text DEFAULT '판매중' CHECK (status IN ('판매중','품절','시즌한정')),
  description   text,
  detail        text,
  price         int4 NOT NULL,
  delivery      int4 DEFAULT 3000,
  image_url     text,
  is_new        boolean DEFAULT false,
  is_best       boolean DEFAULT false,
  is_published  boolean DEFAULT true,
  lighting      text,
  water         text,
  sort_order    int4 DEFAULT 0,
  view_count    int4 DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 2. 매장 전시 식물 (오프라인 갤러리)
CREATE TABLE IF NOT EXISTS hgm_gallery (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,
  category      text,
  status        text DEFAULT '판매중' CHECK (status IN ('판매중','품절','시즌한정')),
  price         int4,
  show_price    boolean DEFAULT false,
  image_url     text,
  description   text,
  is_published  boolean DEFAULT true,
  sort_order    int4 DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 3. 회원
CREATE TABLE IF NOT EXISTS hgm_users (
  id            uuid PRIMARY KEY,
  email         text UNIQUE,
  name          text,
  phone         text,
  provider      text CHECK (provider IN ('naver','google','email')),
  role          text DEFAULT 'user' CHECK (role IN ('user','admin')),
  notify_new    boolean DEFAULT false,
  notify_sale   boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 4. 주문
CREATE TABLE IF NOT EXISTS hgm_orders (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number    text UNIQUE,
  user_id         uuid REFERENCES hgm_users(id),
  total_price     int4,
  status          text DEFAULT '주문완료' CHECK (
                    status IN ('주문완료','결제완료','배송준비','배송중','배송완료','취소')
                  ),
  payment_method  text,
  payment_status  text DEFAULT '미결제' CHECK (payment_status IN ('미결제','결제완료','환불')),
  receiver_name   text,
  receiver_phone  text,
  address         text,
  address_detail  text,
  zipcode         text,
  delivery_memo   text,
  tracking_number text,
  shipped_at      timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 5. 주문 상품
CREATE TABLE IF NOT EXISTS hgm_order_items (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      uuid REFERENCES hgm_orders(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES hgm_products(id),
  product_name  text,
  quantity      int4 DEFAULT 1,
  price         int4,
  created_at    timestamptz DEFAULT now()
);

-- 6. 위시리스트
CREATE TABLE IF NOT EXISTS hgm_wishlist (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES hgm_users(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES hgm_products(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- 7. 입고 소식 / 가드닝 가이드 포스트
CREATE TABLE IF NOT EXISTS hgm_posts (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type          text NOT NULL CHECK (type IN ('new_arrival','guide')),
  title         text NOT NULL,
  content       text,
  image_url     text,
  product_id    uuid REFERENCES hgm_products(id),
  is_published  boolean DEFAULT false,
  view_count    int4 DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 8. 유입/조회 통계
CREATE TABLE IF NOT EXISTS hgm_analytics (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type    text CHECK (
                  event_type IN ('page_view','product_view','gallery_view',
                                 'add_to_cart','purchase','wishlist_add')
                ),
  product_id    uuid REFERENCES hgm_products(id),
  user_id       uuid REFERENCES hgm_users(id),
  session_id    text,
  page          text,
  referrer      text,
  created_at    timestamptz DEFAULT now()
);

-- 9. 알림 설정
CREATE TABLE IF NOT EXISTS hgm_notification_settings (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_bot_token    text,
  telegram_chat_id      text,
  discord_webhook_url   text,
  notify_on_order       boolean DEFAULT true,
  notify_hourly_report  boolean DEFAULT false,
  report_hours          text DEFAULT '09,12,18,22',
  updated_at            timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_hgm_products_category ON hgm_products(category);
CREATE INDEX IF NOT EXISTS idx_hgm_products_status ON hgm_products(status);
CREATE INDEX IF NOT EXISTS idx_hgm_orders_user_id ON hgm_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_hgm_orders_status ON hgm_orders(status);
CREATE INDEX IF NOT EXISTS idx_hgm_analytics_event_type ON hgm_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_hgm_analytics_created_at ON hgm_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_hgm_posts_type ON hgm_posts(type);

-- 10. 묻고 답하기 (Q&A)
CREATE TABLE IF NOT EXISTS hgm_qna (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES hgm_users(id),
  title         text NOT NULL,
  content       text NOT NULL,
  is_secret     boolean DEFAULT false,
  is_answered   boolean DEFAULT false,
  answer        text,
  answered_at   timestamptz,
  view_count    int4 DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 11. 리뷰 이벤트
CREATE TABLE IF NOT EXISTS hgm_reviews (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES hgm_users(id),
  order_id      uuid REFERENCES hgm_orders(id),
  product_id    uuid REFERENCES hgm_products(id),
  title         text NOT NULL,
  content       text NOT NULL,
  image_url     text,
  like_count    int4 DEFAULT 0,
  is_published  boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 12. 리뷰 좋아요
CREATE TABLE IF NOT EXISTS hgm_review_likes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id     uuid REFERENCES hgm_reviews(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES hgm_users(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hgm_qna_user_id ON hgm_qna(user_id);
CREATE INDEX IF NOT EXISTS idx_hgm_qna_is_answered ON hgm_qna(is_answered);
CREATE INDEX IF NOT EXISTS idx_hgm_reviews_product_id ON hgm_reviews(product_id);
