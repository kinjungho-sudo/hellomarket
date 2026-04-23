# CLAUDE.md — 헬로우가든마켓 독립몰 개발 지침서

> 이 파일은 Claude Code가 처음부터 끝까지 자율적으로 읽고 개발을 완성하기 위한 지침서입니다.
> 별도 확인 없이 이 문서만으로 전체 프로젝트를 완성하세요.
> 작성일: 2026-04-23 / 버전: v1.0

---

## 0. 개발 철학 & 규칙

1. **이 파일 하나만 읽고 전체를 완성한다** — 중간에 확인 요청 최소화
2. **단계별 순서를 반드시 지킨다** — 환경 세팅 → DB → 백엔드 → 프론트 순서
3. **RLS는 사용하지 않는다** — 권한 체크는 서버사이드 로직으로 처리
4. **hgm_ prefix를 모든 테이블에 반드시 사용한다** — 기존 Supabase DB 충돌 방지
5. **가상 시드 데이터를 반드시 입력한다** — MVP 시연용, 식물 상품 10종 이상
6. **모든 파일은 한국어 주석을 포함한다**
7. **에러 처리를 빠뜨리지 않는다** — 모든 API 호출에 try/catch 적용
8. **완료 후 README.md를 자동 생성한다** — 실행 방법, 환경변수 목록 포함
9. **각 STEP 완료 후 반드시 자가 검증을 실행한다** — 섹션 15 체크리스트 참조
10. **에러/실수 발생 시 즉시 MISTAKES.md에 기록한다** — 섹션 16 참조
11. **병렬 처리 가능한 작업은 서브에이전트로 분리한다** — 섹션 17 참조

---

## 1. 프로젝트 개요

### 배경
- 헬로우가든마켓(건민농원)은 **오프라인 메인 매장** 운영 중 (식물/묘목 판매)
- 네이버 스마트스토어 병행 운영 중이나 구조적 한계로 **독립몰 전환** 결정
- 스마트스토어 온라인 판매 20종 미만 / 실제 매장 보유 식물 수백 종
- 고객이 온라인에서 20종만 보고 이탈 → 매장 방문 유도 수단 없음

### 핵심 가치 제안
```
스마트스토어: 20종만 보고 이탈
독립몰: 수백 종 갤러리 구경 → 매장 방문 CTA → 오프라인 구매 → 재방문
수수료 0% + 고객 데이터 직접 소유
```

### 타겟 사용자
- **구매 패턴**: 탐색형 (구경하다가 마음에 들면 구매)
- **주 고객층**: 홈가드닝 관심 20~40대
- **유입 경로**: 인스타그램, 네이버 블로그

---

## 1-1. MoSCoW 우선순위

### Must Have (Phase 1 - MVP)
- [ ] 메인 홈 랜딩페이지
- [ ] 온라인 판매 상품 목록 / 상세 페이지 **(MVP: 10종 / 실제 52종은 Phase 2에서 확장)**
- [ ] 매장 식물 갤러리 (오프라인 전시용, 구매 불가)
- [ ] 신상품 입고 소식 페이지
- [ ] 묻고 답하기 페이지 (게시판형)
- [ ] 리뷰 이벤트 페이지 (블로그형)
- [ ] 구글 소셜 로그인
- [ ] 회원 기능 (주문 내역 조회, 위시리스트)
- [ ] 관리자 페이지 (상품/갤러리/Q&A/리뷰/주문 관리)
- [ ] 관리자 대시보드 (유입량, 판매량, 매출, 주문량)
- [ ] 텔레그램 주문 즉시 알림
- [ ] Vercel 배포

### Should Have (Phase 2)
- [ ] 온라인 판매 상품 52종 전체 등록 (스크린샷 → JSON 변환)
- [ ] 네이버 소셜 로그인
- [ ] 실제 결제 연동 (TossPayments)
- [ ] 배송 관리 기능 (운송장 입력, 배송 상태 추적)
- [ ] 시간대별 리포트 → 텔레그램 자동 전송
- [ ] QR코드 구매 (오프라인 매장 내 온라인 결제)
- [ ] 신상 입고 알림 수신 (회원 푸시/이메일)
- [ ] 가드닝 가이드 페이지

### Could Have (Phase 3)
- [ ] RSS 뉴스레터 (신상품 등록 / 할인 이벤트 자동 발송)
- [ ] 구매 완료 / 배송 진행 시 이메일 자동 발송
- [ ] 배송 상태 조회 페이지
- [ ] 오프라인 매장 판매 카운팅 (QR 기반 POS 연동)
- [ ] 회원 적립금 / 쿠폰 시스템

### Won't Have (현재 범위 외)
- 디스코드 연동
- 앱(iOS/Android) 네이티브 개발
- 해외 결제 / 글로벌 배송
- 다중 판매자 입점 구조

---

## 2. 기술 스택

| 영역 | 기술 | 비고 |
|---|---|---|
| 프론트엔드 | HTML / CSS / Vanilla JS | 반응형, 프레임워크 없이 구현 |
| 배포 | Vercel | GitHub 연동 자동 배포 |
| DB | Supabase | URL: https://gqynptpjomcqzxyykqic.supabase.co |
| 인증 | Supabase Auth | 네이버 / 구글 소셜 로그인 |
| 이미지 스토리지 | Supabase Storage | 버킷명: hgm-images |
| 알림 | Telegram Bot | 주문 즉시 알림 |
| 리포트 | Telegram Bot | 시간대별 자동 리포트 (Phase 2) |

---

## 3. 프로젝트 파일 구조

아래 구조를 그대로 생성하라:

```
hellogarden/
├── CLAUDE.md                  # 이 파일
├── README.md                  # 자동 생성
├── .env                       # 환경변수 (빈칸, 사용자가 채움)
├── .env.example               # 환경변수 예시
├── .gitignore
├── vercel.json                # Vercel 배포 설정
│
├── index.html                 # 홈 (랜딩)
├── shop.html                  # 쇼핑하기 (상품 목록)
├── product.html               # 상품 상세
├── new.html                   # 새로 들어왔어요 (입고 소식)
├── gallery.html               # 매장 구경하기 (오프라인 갤러리)
├── about.html                 # 매장 소개
├── qna.html                   # 묻고 답하기 (게시판)
├── review-event.html          # 리뷰 이벤트 (블로그형)
├── login.html                 # 로그인
├── mypage.html                # 마이페이지
│
├── admin/
│   ├── index.html             # 관리자 대시보드
│   ├── products.html          # 상품 관리
│   ├── gallery.html           # 갤러리 관리
│   ├── orders.html            # 주문 관리
│   ├── posts.html             # 입고 소식 관리
│   ├── qna.html               # 묻고 답하기 관리
│   ├── reviews.html           # 리뷰 이벤트 관리
│   └── settings.html          # 알림 설정
│
├── css/
│   ├── reset.css
│   ├── variables.css          # CSS 변수 (컬러, 폰트)
│   ├── common.css             # 공통 스타일
│   ├── components.css         # 버튼, 카드, 모달 등
│   └── admin.css              # 관리자 전용 스타일
│
├── js/
│   ├── config.js              # Supabase 클라이언트 초기화
│   ├── auth.js                # 인증 관련 함수
│   ├── api/
│   │   ├── products.js        # 상품 CRUD
│   │   ├── gallery.js         # 갤러리 CRUD
│   │   ├── orders.js          # 주문 처리
│   │   ├── posts.js           # 입고 소식 CRUD
│   │   ├── users.js           # 회원 관련
│   │   ├── analytics.js       # 유입/조회 통계
│   │   └── notifications.js   # 텔레그램/디스코드 알림
│   ├── pages/
│   │   ├── home.js
│   │   ├── shop.js
│   │   ├── product.js
│   │   ├── new.js
│   │   ├── gallery.js
│   │   ├── qna.js
│   │   ├── review-event.js
│   │   ├── login.js
│   │   ├── mypage.js
│   │   └── admin/
│   │       ├── dashboard.js
│   │       ├── products.js
│   │       ├── gallery.js
│   │       ├── orders.js
│   │       ├── posts.js
│   │       ├── qna.js
│   │       ├── reviews.js
│   │       └── settings.js
│   └── utils/
│       ├── format.js          # 가격 포맷, 날짜 포맷 등
│       ├── storage.js         # 이미지 업로드 헬퍼
│       └── cart.js            # 장바구니 (localStorage)
│
├── sql/
│   ├── 01_create_tables.sql   # 테이블 생성
│   └── 02_seed_data.sql       # 가상 시드 데이터
│
└── assets/
    ├── logo/                  # 브랜드 로고 (빈 폴더, 추후 추가)
    ├── icons/
    └── images/
        └── placeholder.svg    # 이미지 없을 때 기본 이미지
```

---

## 4. 환경변수 (.env)

`.env` 파일을 아래 형식으로 생성하고 값은 모두 빈칸으로 두라:

```env
# Supabase
SUPABASE_URL=https://gqynptpjomcqzxyykqic.supabase.co
SUPABASE_ANON_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Admin
ADMIN_PASSWORD=

# OAuth (Supabase Dashboard에서 설정)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
```

`.env.example`도 동일하게 생성하라 (값 빈칸 유지).

---

## 5. 디자인 시스템

### 컬러 팔레트 (variables.css에 정의)
```css
:root {
  /* 브랜드 메인 */
  --color-primary: #2d5a3d;       /* 딥 그린 - 메인 */
  --color-primary-light: #4a7c59; /* 미디엄 그린 */
  --color-primary-dark: #1a3d28;  /* 다크 그린 */

  /* 배경 */
  --color-bg: #faf7f0;            /* 크림 화이트 */
  --color-bg-card: #ffffff;
  --color-bg-section: #f5f0e8;    /* 크림 베이지 */

  /* 포인트 */
  --color-accent: #f5c842;        /* 옐로우 (해바라기 캐릭터) */
  --color-accent-dark: #d4a82a;

  /* 텍스트 */
  --color-text: #2c2c2c;
  --color-text-sub: #666666;
  --color-text-light: #999999;

  /* 상태 */
  --color-success: #4caf50;
  --color-warning: #ff9800;
  --color-danger: #f44336;
  --color-info: #2196f3;

  /* 상품 상태 뱃지 */
  --color-badge-sale: #2d5a3d;
  --color-badge-new: #f5c842;
  --color-badge-sold: #999999;
  --color-badge-season: #ff9800;

  /* 폰트 */
  --font-main: 'Noto Sans KR', sans-serif;
  --font-serif: 'Noto Serif KR', serif;

  /* 그림자 */
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);

  /* 반경 */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-full: 9999px;
}
```

### 폰트
```html
<!-- 모든 HTML 파일 <head>에 포함 -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Serif+KR:wght@400;600&display=swap" rel="stylesheet">
```

### 브랜드 로고
- `assets/logo/` 폴더에 로고 파일이 없을 경우 텍스트 로고로 대체
- 텍스트 로고: `Hello Garden Market` (Noto Serif KR, 딥그린)
- 해바라기 이모지(🌻)를 로고 옆에 임시 배치

### 공통 네비게이션
모든 페이지에 동일한 네비게이션 적용:
```
[로고] 홈 | 쇼핑하기 | 새로 들어왔어요 | 매장 구경하기 | 묻고 답하기 | 리뷰 이벤트 | 매장 소개    [로그인] [장바구니🛒]
```
- 모바일: 햄버거 메뉴
- 로그인 후: [로그인] → [마이페이지] + [로그아웃]
- 관리자 로그인 후: 상단에 [관리자 페이지] 버튼 추가

---

## 6. DB 스키마 (sql/01_create_tables.sql)

아래 SQL을 그대로 `sql/01_create_tables.sql`에 작성하라:

```sql
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
  -- 배송 정보 (Phase 2 준비)
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
  is_secret     boolean DEFAULT false,       -- 비밀글 여부
  is_answered   boolean DEFAULT false,       -- 답변 완료 여부
  answer        text,                        -- 관리자 답변
  answered_at   timestamptz,                 -- 답변 일시
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
```

---

## 7. 시드 데이터 (sql/02_seed_data.sql)

MVP 시연용 가상 데이터를 아래와 같이 생성하라:

```sql
-- =============================================
-- 헬로우가든마켓 MVP 시드 데이터
-- =============================================

-- 온라인 판매 상품 (10종)
INSERT INTO hgm_products (name, category, status, description, detail, price, delivery, is_new, is_best, lighting, water) VALUES
('몬스테라 델리시오사', '관엽식물', '판매중', '넓은 잎이 특징인 인기 관엽식물', '공기정화 효과가 뛰어나며 반음지에서도 잘 자랍니다. 실내 인테리어로 가장 인기 있는 식물 중 하나입니다.', 28000, 3000, true, true, '간접광', '주 1회'),
('스파티필럼 대품', '관엽식물', '판매중', '공기정화 1위 식물', '나사(NASA) 선정 공기정화식물 1위. 음지에서도 잘 자라며 꽃도 피웁니다.', 35000, 3000, false, true, '저광량 가능', '주 1~2회'),
('에케베리아 3종 세트', '다육식물', '판매중', '물을 자주 안 줘도 되는 다육이', '초보자도 쉽게 키울 수 있는 다육식물 세트입니다.', 19900, 3000, true, false, '직사광선', '2주 1회'),
('행운목', '관엽식물', '판매중', '행운을 가져다주는 인테리어 식물', '집들이 선물로 인기 있는 행운목입니다. 키우기 쉽고 오래 삽니다.', 22000, 3000, false, true, '간접광', '주 1회'),
('미니 장미 화분', '꽃나무', '판매중', '향기로운 미니 장미', '핑크/레드/화이트 색상 선택 가능. 베란다 가드닝에 최적입니다.', 15000, 3000, false, false, '직사광선', '주 2~3회'),
('북유럽 세라믹 화분 3P', '화분/용기', '판매중', '감성 인테리어 세라믹 화분', '크기별 3개 세트. 심플한 디자인으로 어떤 식물과도 잘 어울립니다.', 42000, 3000, true, false, NULL, NULL),
('필로덴드론 핑크 프린세스', '희귀식물', '시즌한정', '핑크 무늬가 아름다운 희귀 식물', '입고 수량이 매우 제한적입니다. 핑크빛 무늬잎이 특징입니다.', 89000, 3000, true, false, '간접광', '주 1회'),
('식물 전용 배양토 5L', '토양/비료', '판매중', '식물 생육에 최적화된 배양토', '배수성과 통기성이 뛰어난 프리미엄 배양토입니다.', 12900, 3000, false, false, NULL, NULL),
('스투키 (산세베리아)', '공기정화', '판매중', '밤에도 산소를 내뿜는 식물', '침실에 두기 좋은 공기정화식물. 물을 거의 안 줘도 됩니다.', 18000, 3000, false, true, '저광량 가능', '월 1회'),
('수경재배 히아신스 구근', '구근식물', '시즌한정', '봄 향기 가득한 히아신스', '수경재배로 쉽게 꽃을 피울 수 있습니다. 봄 시즌 한정 상품입니다.', 9900, 3000, true, false, '간접광', '수경재배');

-- 매장 갤러리 (15종 - 오프라인 전시용)
INSERT INTO hgm_gallery (name, category, status, price, show_price, description) VALUES
('올리브나무 대품', '나무류', '판매중', 120000, true, '지중해 감성의 올리브나무'),
('벵갈고무나무', '관엽식물', '판매중', 45000, true, '잎이 두껍고 윤기있는 고무나무'),
('극락조화', '꽃나무', '판매중', 55000, true, '열대식물의 여왕'),
('떡갈잎고무나무', '관엽식물', '판매중', 38000, true, '넓은 잎이 특징'),
('율마', '침엽수', '판매중', 25000, true, '향기로운 침엽수'),
('공중식물 틸란드시아', '공중식물', '판매중', NULL, false, '흙 없이도 자라는 신기한 식물'),
('아레카야자', '야자류', '판매중', 65000, true, '열대 분위기 연출'),
('파키라', '관엽식물', '판매중', 32000, true, '돈나무라고도 불리는 행운의 식물'),
('디펜바키아', '관엽식물', '품절', NULL, false, '무늬가 아름다운 관엽식물'),
('칼라데아 오나타', '희귀식물', '판매중', 78000, true, '핑크 줄무늬가 특징'),
('황금죽', '대나무류', '판매중', 29000, true, '인테리어용 황금죽'),
('수국 대품', '꽃나무', '시즌한정', 38000, true, '봄 시즌 한정 수국'),
('거베라 모둠', '꽃나무', '판매중', 15000, true, '화사한 색상의 거베라'),
('행잉플랜트 하트아이비', '행잉식물', '판매중', 18000, true, '하트 모양 잎이 귀여운 아이비'),
('레몬나무 소품', '과실수', '판매중', 35000, true, '실내에서도 레몬이 열리는 나무');

-- 입고 소식 포스트 (3개)
INSERT INTO hgm_posts (type, title, content, is_published) VALUES
('new_arrival', '🌿 봄 시즌 신상 입고 완료!', '따뜻한 봄을 맞아 새로운 식물들이 입고되었습니다. 히아신스, 수국, 미니 장미 등 봄꽃 식물들이 가득합니다. 매장을 방문하시면 훨씬 다양한 봄 식물들을 만나보실 수 있어요!', true),
('new_arrival', '🌵 희귀 다육식물 한정 입고', '필로덴드론 핑크 프린세스와 칼라데아 오나타가 한정 수량으로 입고되었습니다. 수량이 매우 적으니 서둘러 주세요!', true),
('guide', '🌱 초보자를 위한 식물 물주기 가이드', '식물을 처음 키우시는 분들이 가장 많이 실패하는 이유가 바로 물주기입니다. 식물별 올바른 물주기 방법을 알려드립니다.', true);

-- 알림 설정 기본값
INSERT INTO hgm_notification_settings (notify_on_order, notify_hourly_report) VALUES (true, false);

-- Q&A 샘플 데이터
INSERT INTO hgm_qna (title, content, is_secret, is_answered, answer, answered_at) VALUES
('몬스테라 배송 시 혹시 잎이 상하지 않나요?', '처음 식물을 온라인으로 구매하는데 배송 중에 잎이 상할까 걱정이에요.', false, true, '안녕하세요! 저희는 식물 전용 완충재와 박스로 꼼꼼하게 포장하여 발송합니다. 혹시 배송 중 손상이 발생하면 사진 첨부 후 문의 주시면 바로 처리해드립니다 🌿', now()),
('다육이 물주기 질문이요', '에케베리아 3종 세트 구매했는데 물은 얼마나 자주 줘야 하나요?', false, false, NULL, NULL),
('선물 포장 가능한가요?', '생일 선물로 구매하려는데 선물 포장 서비스 있나요?', false, true, '네, 선물 포장 요청 시 예쁘게 포장해서 보내드립니다! 주문 시 배송 메모란에 "선물 포장 요청"이라고 적어주세요 🎁', now());

-- 리뷰 이벤트 샘플 데이터 (user_id, order_id 없이 MVP 시연용)
INSERT INTO hgm_reviews (title, content, is_published) VALUES
('몬스테라 너무 예뻐요! 🌿', '포장도 꼼꼼하고 식물 상태도 완벽했어요. 집에 두니까 인테리어가 확 살아났습니다. 다음엔 스파티필럼도 사려고요!', true),
('다육이 세트 강추!', '물 자주 안 줘도 되는 식물 찾다가 구매했는데 너무 만족해요. 사무실에 두니까 동료들도 다 탐낸답니다 😄', true),
('선물용으로 완벽해요', '부모님 선물로 행운목 구매했는데 선물 포장도 해주시고 정말 감동이었어요. 부모님도 너무 좋아하셨습니다!', true);
```

---

## 8. JS 모듈 명세

### js/config.js
```javascript
// Supabase 클라이언트 초기화
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://gqynptpjomcqzxyykqic.supabase.co'
const SUPABASE_ANON_KEY = '' // .env에서 주입

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

### js/api/products.js 주요 함수
```javascript
// 구현할 함수 목록
getProducts({ category, status, isNew, isBest, limit, offset })  // 상품 목록
getProductById(id)                                                // 상품 상세
createProduct(data)                                               // 상품 등록 (관리자)
updateProduct(id, data)                                           // 상품 수정 (관리자)
deleteProduct(id)                                                 // 상품 삭제 (관리자)
incrementViewCount(id)                                            // 조회수 증가
```

### js/api/orders.js 주요 함수
```javascript
createOrder(userId, items, receiverInfo)    // 주문 생성
getOrdersByUser(userId)                     // 회원별 주문 목록
getOrderById(orderId)                       // 주문 상세
updateOrderStatus(orderId, status)          // 주문 상태 변경 (관리자)
generateOrderNumber()                       // 주문번호 생성 (HGM-YYYYMMDD-XXX)
```

### js/api/notifications.js 주요 함수
```javascript
sendTelegramOrderAlert(order)              // 주문 즉시 텔레그램 알림
sendDailyReport(stats)                     // 일일 리포트 전송
```

### js/utils/cart.js (localStorage 기반)
```javascript
addToCart(product, quantity)
removeFromCart(productId)
getCart()
clearCart()
getCartCount()
getCartTotal()
```

---

## 9. 페이지별 기능 명세

### index.html (홈 랜딩)
```
섹션 순서:
1. 히어로 배너
   - 브랜드 로고 + 슬로건: "일상에 초록을, 헬로우가든마켓"
   - 배경: 딥그린 그라디언트
   - CTA 버튼: "쇼핑하기" → /shop.html

2. 신상 입고 하이라이트
   - is_new=true 상품 최대 4개
   - "새로 들어왔어요 더보기" → /new.html

3. 온라인 베스트셀러
   - is_best=true 상품 최대 6개
   - 상품 카드 클릭 → /product.html?id=xxx

4. 매장 방문 유도 배너 (핵심 CTA)
   - "온라인에 없는 수백 종이 매장에 있어요"
   - 배경: 크림/베이지
   - CTA: "매장 구경하기" → /gallery.html

5. 가드닝 가이드 미리보기
   - 최근 포스트 3개 (type='guide')

6. 인스타그램 연결 배너
   - "@hellogarden_official 팔로우하기"
   - 인스타그램 외부 링크

7. 매장 정보
   - 운영시간, 주소, 지도 (카카오맵 또는 네이버 지도 iframe)
```

### shop.html (쇼핑하기)
```
기능:
- 카테고리 필터 탭 (전체/관엽식물/다육식물/꽃나무/화분·용기/희귀식물/토양·비료)
- 상태 필터 (판매중/품절/시즌한정)
- 정렬 (최신순/인기순/낮은가격순/높은가격순)
- 상품 카드 그리드 (3열 → 모바일 2열 → 최소 1열)
- 위시리스트 하트 버튼 (로그인 필요)
- 장바구니 담기 버튼
- 무한 스크롤 또는 페이지네이션
```

### product.html (상품 상세)
```
기능:
- 상품 이미지 (없으면 placeholder)
- 상품명, 카테고리, 가격, 배송비
- 상품 상태 뱃지
- 광량/물주기 정보 아이콘
- 상세 설명
- 수량 선택 (+/-)
- 장바구니 담기 버튼
- 위시리스트 버튼
- 관련 상품 (같은 카테고리 4개)
- 조회수 자동 증가 (hgm_analytics insert)
```

### new.html (새로 들어왔어요)
```
기능:
- 입고 소식 포스트 목록 (type='new_arrival')
- 포스트 클릭 시 상세 내용 모달 또는 상세 페이지
- 연결 상품 있으면 "바로 구매하기" 버튼 표시
- 최신순 정렬
```

### gallery.html (매장 구경하기)
```
기능:
- 오프라인 전시 식물 갤러리 (hgm_gallery)
- 카테고리 필터
- 상태 뱃지 (판매중/품절/시즌한정)
- 가격 공개 여부에 따라 가격 표시/숨김
- 구매 버튼 없음 (온라인 판매 아님)
- 하단 고정 CTA 배너: "이 식물들을 직접 보러 오세요 📍 매장 위치 보기"
- 이미지 없을 때 식물 이모지 placeholder
```

### login.html (로그인)
```
기능:
- 구글 로그인 버튼 (Supabase OAuth) — Phase 1
- 네이버 로그인 버튼 — Phase 2 (현재 비활성화, UI만 표시)
- 로그인 후 이전 페이지로 리다이렉트
- 이미 로그인 상태면 mypage.html로 리다이렉트
```

### mypage.html (마이페이지)
```
기능:
- 회원 정보 표시 (이름, 이메일, 가입일)
- 주문 내역 목록 (최신순)
- 주문 상태별 탭 (전체/주문완료/배송중/배송완료)
- 위시리스트 목록 (상품 카드)
- 알림 설정 토글 (신상 입고 알림, 할인 이벤트 알림)
- 로그아웃 버튼
```

### qna.html (묻고 답하기)
```
구조: 게시판형
기능:
- 글 목록 (번호 / 제목 / 작성자 / 작성일 / 답변여부)
- 답변 완료된 글은 뱃지 표시 [답변완료]
- 글 상세 보기 (모달 또는 상세 페이지)
- 글쓰기 버튼 (로그인 필요)
- 비밀글 설정 가능 (작성자 + 관리자만 열람)
- 페이지네이션 (10건씩)
- 관리자 답변 표시 (답변 영역 별도 구분)
```

### review-event.html (리뷰 이벤트)
```
구조: 블로그형 (카드 그리드)
기능:
- 리뷰 카드 목록 (썸네일 이미지 + 제목 + 작성자 + 날짜)
- 카드 클릭 시 상세 페이지 또는 모달
- 상세 내용: 이미지 + 텍스트 + 구매 상품 태그
- 이벤트 안내 배너 (상단 고정)
  - "리뷰 작성 시 다음 구매 5% 할인 쿠폰 증정"
- 리뷰 작성 버튼 (로그인 + 구매 이력 필요)
- 최신순 / 인기순 정렬
- 좋아요 버튼
```

---

## 10. 관리자 페이지 명세 (/admin)

### 접근 제어
- URL: `/admin/index.html`
- `hgm_users.role = 'admin'` 인 경우만 접근 허용
- 비로그인 또는 일반 회원 접근 시 → `/login.html` 리다이렉트
- JS에서 세션 확인 후 role 체크

### admin/index.html (대시보드)
```
카드 섹션:
- 오늘 주문 수 / 오늘 매출
- 이번 주 주문 수 / 이번 주 매출
- 이번 달 주문 수 / 이번 달 매출
- 총 회원 수 / 오늘 신규 회원

차트 섹션:
- 시간대별 주문 수 (24시간 바 차트)
- 카테고리별 판매량 (파이 차트)
- 최근 7일 매출 추이 (라인 차트)
- Chart.js 사용

최근 주문 테이블:
- 최근 10건
- 주문번호 / 상품명 / 금액 / 상태 / 주문시각

실시간 재고 현황:
- 품절 임박 / 품절 상품 목록
```

### admin/products.html (상품 관리)
```
기능:
- 상품 목록 테이블
- 상품 등록 폼 (모달)
  - 이미지 업로드 (Supabase Storage → hgm-images 버킷)
  - 이름/카테고리/가격/배송비/상태/설명/상세/광량/물주기
  - 신상품/베스트 체크박스
  - 발행/임시저장 토글
- 상품 수정 (인라인 또는 모달)
- 상품 삭제 (확인 다이얼로그)
- 상태 일괄 변경
```

### admin/orders.html (주문 관리)
```
기능:
- 주문 목록 테이블 (상태별 탭)
- 주문 상세 모달
- 주문 상태 변경 드롭다운
- 운송장 번호 입력 필드 (Phase 2용, 비활성화 표시)
- 주문 검색 (주문번호, 회원명)
- 날짜 범위 필터
```

### admin/settings.html (알림 설정)
```
기능:
- 텔레그램 Bot Token 입력
- 텔레그램 Chat ID 입력
- 텔레그램 연결 테스트 버튼
- 주문 즉시 알림 ON/OFF 토글
- 저장 버튼
```

### admin/qna.html (묻고 답하기 관리)
```
기능:
- Q&A 목록 테이블 (미답변/답변완료 탭)
- 미답변 글 상단 강조 표시
- 답변 작성 모달 (텍스트 에디터)
- 답변 완료 시 is_answered = true 자동 변경
- 비밀글 내용 관리자는 열람 가능
- 글 삭제 (확인 다이얼로그)
```

### admin/reviews.html (리뷰 이벤트 관리)
```
기능:
- 리뷰 목록 테이블
- 발행/숨김 토글
- 리뷰 삭제 (확인 다이얼로그)
- 이벤트 배너 문구 수정
```

---

## 11. 텔레그램 알림 포맷

### 주문 즉시 알림
```
🛒 새 주문이 들어왔어요!

📋 주문번호: HGM-20260423-001
👤 주문자: 홍길동
📦 상품:
  - 몬스테라 델리시오사 x1 (28,000원)
  - 식물 배양토 5L x2 (25,800원)
💰 총 결제금액: 53,800원
📍 배송지: 서울시 은평구 xxx
⏰ 주문시각: 2026-04-23 14:32
```

### 일일 리포트
```
📊 헬로우가든 일일 리포트
📅 2026-04-23

─────────────────
🌅 오전 (06~12): 3건 / 84,000원
☀️ 오후 (12~18): 7건 / 196,000원
🌙 저녁 (18~24): 2건 / 56,000원
─────────────────
📦 오늘 총 주문: 12건
💰 오늘 총 매출: 336,000원
👥 오늘 방문자: 142명
🔥 오늘 인기상품: 몬스테라 델리시오사
```

---

## 12. 개발 착수 순서 (자율 완성형)

Claude Code는 아래 순서대로 개발을 진행하라. 각 단계 완료 후 다음 단계로 이동:

```
STEP 1. 프로젝트 폴더 구조 생성
STEP 2. .env / .env.example / .gitignore / vercel.json 생성
STEP 3. css/variables.css + reset.css + common.css 작성
STEP 4. sql/01_create_tables.sql + sql/02_seed_data.sql 작성
STEP 5. js/config.js + js/utils/* 작성
STEP 6. js/api/* 전체 작성
STEP 7. 공통 네비게이션/푸터 컴포넌트 작성
STEP 8. index.html (홈 랜딩) 완성
STEP 9. shop.html + product.html 완성
STEP 10. new.html + gallery.html + about.html 완성
STEP 11. login.html + mypage.html 완성
STEP 12. admin/* 전체 완성
STEP 13. 텔레그램/디스코드 알림 연동 완성
STEP 14. 전체 반응형 점검
STEP 15. README.md 자동 생성
```

---

## 13. README.md 자동 생성 내용

개발 완료 후 아래 내용으로 README.md를 생성하라:

```markdown
# 🌿 헬로우가든마켓 독립몰

## 시작하기

### 1. 환경변수 설정
.env 파일을 열고 아래 값을 채워주세요:
- SUPABASE_ANON_KEY: Supabase 대시보드 → Settings → API
- TELEGRAM_BOT_TOKEN: @BotFather에서 발급
- TELEGRAM_CHAT_ID: @userinfobot에서 확인
- DISCORD_WEBHOOK_URL: 디스코드 채널 설정 → 연동

### 2. DB 테이블 생성
Supabase 대시보드 → SQL Editor에서 아래 파일 순서대로 실행:
1. sql/01_create_tables.sql
2. sql/02_seed_data.sql

### 3. Supabase Storage 버킷 생성
Supabase 대시보드 → Storage → New Bucket
- 버킷명: hgm-images
- Public: true

### 4. 소셜 로그인 설정
Supabase 대시보드 → Authentication → Providers
- Google: 활성화 후 Client ID/Secret 입력
- Naver: 커스텀 OAuth 설정

### 5. Vercel 배포
GitHub에 푸시 후 Vercel에서 Import
환경변수를 Vercel 대시보드에도 동일하게 설정

### 6. 관리자 계정 설정
Supabase SQL Editor에서 실행:
UPDATE hgm_users SET role = 'admin' WHERE email = '관리자이메일';
```

---

## 15. STEP별 자가 검증 체크리스트

> 각 STEP 완료 후 아래 체크리스트를 실행하라.
> 하나라도 FAIL이면 수정 후 재검증. PASS 확인 후 다음 STEP 진행.

### STEP 1-2 (환경 세팅) 검증
```
[ ] 폴더 구조가 섹션 3과 100% 일치하는가
[ ] .env 파일에 SUPABASE_URL이 정확히 입력되었는가
[ ] .env가 .gitignore에 포함되어 있는가
[ ] .env.example이 존재하는가
[ ] vercel.json이 존재하는가
```

### STEP 3 (CSS) 검증
```
[ ] variables.css에 섹션 5의 모든 CSS 변수가 정의되어 있는가
[ ] --color-primary: #2d5a3d 값이 정확한가
[ ] reset.css가 box-sizing: border-box를 포함하는가
[ ] 모바일 breakpoint (768px, 480px)가 정의되어 있는가
```

### STEP 4 (DB) 검증
```
[ ] 모든 테이블명에 hgm_ prefix가 붙어 있는가
[ ] hgm_products 테이블의 필수 컬럼 (id, name, category, price)이 존재하는가
[ ] CHECK 제약조건이 올바르게 정의되었는가
[ ] 인덱스가 생성되었는가
[ ] 시드 데이터가 10종 이상 입력되었는가
[ ] 기존 DB 테이블과 이름 충돌이 없는가 (hgm_ prefix 확인)
```

### STEP 5-6 (JS 모듈) 검증
```
[ ] config.js에 Supabase URL이 올바르게 설정되었는가
[ ] 모든 API 함수에 try/catch가 적용되었는가
[ ] 모든 함수에 한국어 주석이 있는가
[ ] cart.js가 localStorage를 사용하는가
[ ] auth.js에 관리자 role 체크 로직이 있는가
```

### STEP 7-11 (프론트 페이지) 검증
```
[ ] 모든 HTML 파일에 공통 네비게이션이 포함되어 있는가
[ ] 모든 페이지가 모바일 반응형인가 (768px 이하)
[ ] 로그인 페이지에서 비로그인 상태 감지 후 리다이렉트가 작동하는가
[ ] 관리자 페이지 접근 시 role 체크가 작동하는가
[ ] 이미지 없을 때 placeholder가 표시되는가
[ ] 장바구니 카운트가 네비게이션에 표시되는가
[ ] 모든 CTA 버튼의 링크가 올바른가
```

### STEP 12 (관리자) 검증
```
[ ] 대시보드 차트가 Chart.js로 렌더링되는가
[ ] 상품 등록 폼에서 이미지 업로드가 작동하는가 (Supabase Storage)
[ ] 상품 삭제 시 확인 다이얼로그가 표시되는가
[ ] 주문 상태 변경이 DB에 반영되는가
[ ] 알림 설정 저장이 hgm_notification_settings에 반영되는가
```

### STEP 13 (알림) 검증
```
[ ] 텔레그램 테스트 메시지 전송이 성공하는가
[ ] 주문 생성 시 텔레그램 알림이 발송되는가
[ ] 알림 포맷이 섹션 11과 일치하는가
[ ] Q&A 답변 등록 시 알림이 발송되는가
```

### STEP 14 (반응형) 검증
```
[ ] 모든 페이지를 480px 너비에서 확인 — 가로 스크롤 없음
[ ] 모든 페이지를 768px 너비에서 확인 — 레이아웃 정상
[ ] 네비게이션 햄버거 메뉴가 모바일에서 작동하는가
[ ] 상품 카드 그리드가 모바일에서 1~2열로 변경되는가
[ ] 관리자 대시보드가 모바일에서 읽을 수 있는가
```

### 최종 검증 (STEP 15 전)
```
[ ] 모든 페이지에서 콘솔 에러가 없는가
[ ] 모든 내부 링크가 작동하는가 (404 없음)
[ ] Supabase 연결이 정상인가
[ ] 시드 데이터가 프론트에 정상 표시되는가
[ ] README.md가 생성되었는가
[ ] MISTAKES.md가 생성되었는가
```

---

## 16. Mistakes Ledger (MISTAKES.md)

> 개발 중 발생하는 모든 에러/실수를 아래 형식으로 `MISTAKES.md`에 기록하라.
> 동일한 실수를 반복하지 않기 위한 학습 저장소.
> 작업 시작 시 이 파일을 먼저 읽고 과거 실수를 확인하라.

### MISTAKES.md 파일 초기 생성 내용
```markdown
# MISTAKES.md — 헬로우가든마켓 에러 및 실수 기록

> 작업 시작 전 반드시 이 파일을 읽어 과거 실수를 확인할 것.
> 에러/실수 발생 즉시 아래 형식으로 추가할 것.

---

## 기록 형식

### [날짜] 에러/실수 제목
- **발생 위치**: 파일명 또는 STEP 번호
- **증상**: 어떤 문제가 발생했는가
- **원인**: 왜 발생했는가
- **해결**: 어떻게 해결했는가
- **재발 방지**: 앞으로 어떻게 예방할 것인가

---

## 사전 등록 — 자주 발생하는 실수 패턴

### [공통] hgm_ prefix 누락
- **발생 위치**: SQL 작성 시
- **증상**: 기존 DB 테이블과 이름 충돌
- **원인**: prefix 없이 테이블명 작성
- **해결**: 모든 테이블명 앞에 hgm_ 추가
- **재발 방지**: SQL 작성 전 체크리스트 확인

### [공통] .env 값 하드코딩
- **발생 위치**: JS 파일
- **증상**: API Key가 소스코드에 노출
- **원인**: 환경변수 대신 직접 값 입력
- **해결**: 반드시 환경변수 또는 config.js 통해서만 참조
- **재발 방지**: config.js 외 파일에서 직접 키 입력 금지

### [공통] try/catch 누락
- **발생 위치**: API 호출 함수
- **증상**: 런타임 에러 시 앱 전체 중단
- **원인**: 에러 처리 코드 미작성
- **해결**: 모든 async 함수에 try/catch 추가
- **재발 방지**: API 함수 작성 후 try/catch 존재 여부 즉시 확인

### [공통] 관리자 role 체크 누락
- **발생 위치**: admin/*.html
- **증상**: 일반 회원이 관리자 페이지 접근 가능
- **원인**: 페이지 로드 시 role 검증 코드 미작성
- **해결**: 모든 admin 페이지 최상단에 role 체크 로직 추가
- **재발 방지**: admin 페이지 생성 즉시 접근 제어 코드 먼저 작성

### [Supabase] anon key 미설정 시 무한 로딩
- **발생 위치**: js/config.js
- **증상**: 페이지가 로딩만 되고 데이터 미표시
- **원인**: SUPABASE_ANON_KEY가 빈칸인 상태로 요청
- **해결**: .env에 anon key 입력 후 재시작
- **재발 방지**: 초기 실행 시 환경변수 유효성 체크 함수 실행
```

### 에러 발생 시 처리 흐름
```
에러 발생
  ↓
1. MISTAKES.md에 즉시 기록
2. 기존 기록 중 동일/유사 패턴 있는지 확인
3. 해결책 적용
4. 재발 방지 항목 업데이트
5. 해당 STEP 검증 체크리스트 재실행
```

---

## 17. 서브에이전트 병렬 개발 전략

> 독립적으로 작업 가능한 모듈은 서브에이전트로 분리하여 병렬 처리한다.
> 의존성이 있는 작업은 반드시 순서를 지킨다.

### 병렬 처리 가능한 작업 그룹

```
[메인 에이전트] 전체 조율 및 통합 담당

병렬 그룹 A — 기반 작업 (STEP 1~4 완료 후 동시 시작)
├── [서브에이전트 A1] CSS 시스템 구축
│   └── reset.css / variables.css / common.css / components.css / admin.css
│
├── [서브에이전트 A2] JS API 모듈 구축
│   └── js/api/* 전체 (products, gallery, orders, posts, users, analytics, notifications)
│
└── [서브에이전트 A3] JS 유틸 & 설정
    └── js/config.js / js/auth.js / js/utils/*

병렬 그룹 B — 페이지 개발 (그룹 A 완료 후 동시 시작)
├── [서브에이전트 B1] 고객 페이지 (상단 퍼널)
│   └── index.html / shop.html / product.html
│
├── [서브에이전트 B2] 고객 페이지 (콘텐츠/회원)
│   └── new.html / gallery.html / about.html / qna.html / review-event.html / login.html / mypage.html
│
└── [서브에이전트 B3] 관리자 페이지 전체
    └── admin/index.html ~ admin/settings.html (qna.html, reviews.html 포함)

병렬 그룹 C — 마무리 (그룹 B 완료 후 동시 시작)
├── [서브에이전트 C1] 텔레그램 연동 완성 및 테스트
└── [서브에이전트 C2] 전체 반응형 점검 및 크로스 브라우저 테스트
```

### 서브에이전트 공통 지침
```
1. 작업 시작 전 MISTAKES.md를 반드시 읽는다
2. 작업 완료 후 섹션 15의 해당 STEP 체크리스트를 실행한다
3. 에러 발생 시 MISTAKES.md에 즉시 기록한다
4. 다른 서브에이전트의 작업 영역을 침범하지 않는다
5. 공통 파일(config.js, variables.css) 수정 시 메인 에이전트에 보고한다
6. 완료 보고 형식: "STEP X 완료 — 검증 결과: 전체 PASS / N개 FAIL (수정 완료)"
```

### 의존성 맵
```
STEP 1,2 (환경)
    ↓
STEP 3,4 (CSS + DB) ← 병렬 가능
    ↓
STEP 5,6 (JS 모듈) ← config.js 먼저, 나머지 병렬
    ↓
STEP 7 (공통 컴포넌트) ← 단독 실행 필수
    ↓
STEP 8~12 (페이지들) ← 그룹별 병렬 가능
    ↓
STEP 13,14 (알림 + 반응형) ← 병렬 가능
    ↓
STEP 15 (README + 최종 검증) ← 단독 실행 필수
```

---

## 14. 미결 사항 (판매자 협의 후 업데이트)

- [ ] 브랜드 로고 파일 수령 → `assets/logo/`에 추가
- [ ] 매장 위치 / 운영시간 확정
- [ ] 매장 갤러리 가격 공개 여부 최종 결정
- [ ] 인스타그램 계정명 확정 (@hellogarden_official 추정)
- [ ] 실제 상품 이미지 및 데이터 수집 완료 후 시드 데이터 교체
- [ ] 네이버 OAuth 개발자 센터 앱 등록 (Client ID/Secret 발급)
- [ ] 구글 OAuth Cloud Console 앱 등록
- [ ] 텔레그램 Bot 생성 및 Token 발급
- [ ] Vercel 도메인 연결 (커스텀 도메인 구매 여부)
