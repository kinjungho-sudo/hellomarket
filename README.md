# 🌿 헬로우가든마켓 독립몰

> 헬로우가든마켓(건민농원) 공식 온라인 독립몰 — 식물/묘목 온라인 판매 + 매장 방문 유도

## 🛠 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | HTML / CSS / Vanilla JS (ES Modules) |
| 데이터베이스 | Supabase (PostgreSQL) |
| 인증 | Supabase Auth (Google OAuth) |
| 이미지 스토리지 | Supabase Storage (hgm-images 버킷) |
| 알림 | Telegram Bot API |
| 배포 | Vercel |

## 🚀 시작하기

### 1. 환경변수 설정

`js/config.js` 를 열고 아래 값을 채워주세요:

```javascript
const SUPABASE_ANON_KEY = '여기에_Supabase_anon_key_입력'
```

Supabase 대시보드 → Settings → API → **anon public** 키를 복사해서 입력하세요.

> ⚠️ `.env` 파일은 참고용이며, 이 프로젝트는 Vanilla JS + Vercel 정적 배포이므로 `js/config.js`에 직접 입력합니다.

### 2. DB 테이블 생성

Supabase 대시보드 → SQL Editor에서 아래 파일을 **순서대로** 실행하세요:

1. `sql/01_create_tables.sql` — 테이블 + 인덱스 생성
2. `sql/02_seed_data.sql` — MVP 시연용 가상 데이터 입력

### 3. Supabase Storage 버킷 생성

Supabase 대시보드 → Storage → **New Bucket**
- 버킷명: `hgm-images`
- Public: **true** (공개 버킷)

### 4. 구글 소셜 로그인 설정

Supabase 대시보드 → Authentication → Providers → **Google** 활성화
- Google Cloud Console에서 OAuth 2.0 클라이언트 생성
- Client ID / Client Secret 입력
- Authorized redirect URIs: `https://gqynptpjomcqzxyykqic.supabase.co/auth/v1/callback`

### 5. 관리자 계정 설정

Supabase SQL Editor에서 실행:
```sql
UPDATE hgm_users SET role = 'admin' WHERE email = '관리자이메일@example.com';
```

소셜 로그인 1회 후 위 SQL로 role을 admin으로 변경하세요.

### 6. 텔레그램 알림 설정

1. [@BotFather](https://t.me/BotFather) 에서 봇 생성 → Token 발급
2. [@userinfobot](https://t.me/userinfobot) 에서 Chat ID 확인
3. 관리자 페이지 → 알림 설정에서 입력 후 연결 테스트

### 7. Vercel 배포

```bash
# GitHub에 푸시 후 Vercel에서 Import
# 별도 빌드 명령어 없음 (정적 파일)
```

## 📁 파일 구조

```
hellowgardenmarket/
├── index.html          # 홈 (랜딩)
├── shop.html           # 쇼핑하기 (상품 목록)
├── product.html        # 상품 상세
├── cart.html           # 장바구니
├── new.html            # 새로 들어왔어요
├── gallery.html        # 매장 구경하기
├── about.html          # 매장 소개
├── qna.html            # 묻고 답하기
├── review-event.html   # 리뷰 이벤트
├── login.html          # 로그인
├── mypage.html         # 마이페이지
├── admin/              # 관리자 페이지
│   ├── index.html      # 대시보드
│   ├── products.html   # 상품 관리
│   ├── gallery.html    # 갤러리 관리
│   ├── orders.html     # 주문 관리
│   ├── posts.html      # 입고 소식 관리
│   ├── qna.html        # Q&A 관리
│   ├── reviews.html    # 리뷰 관리
│   └── settings.html   # 알림 설정
├── css/                # 스타일시트
├── js/                 # JavaScript
│   ├── config.js       # Supabase 클라이언트 ← ANON KEY 여기 입력
│   ├── auth.js         # 인증 함수
│   ├── api/            # Supabase API 모듈
│   └── utils/          # 유틸 함수 (cart, format, storage)
├── sql/                # DB 스키마 + 시드 데이터
└── assets/             # 이미지/아이콘
```

## 🗄 DB 테이블 목록

모든 테이블은 `hgm_` prefix 사용 (기존 Supabase DB 충돌 방지)

| 테이블 | 설명 |
|---|---|
| `hgm_products` | 온라인 판매 상품 |
| `hgm_gallery` | 매장 전시 식물 (오프라인 갤러리) |
| `hgm_users` | 회원 정보 |
| `hgm_orders` | 주문 |
| `hgm_order_items` | 주문 상품 |
| `hgm_wishlist` | 위시리스트 |
| `hgm_posts` | 입고 소식 / 가드닝 가이드 |
| `hgm_analytics` | 유입/조회 통계 |
| `hgm_qna` | 묻고 답하기 |
| `hgm_reviews` | 리뷰 이벤트 |
| `hgm_review_likes` | 리뷰 좋아요 |
| `hgm_notification_settings` | 텔레그램 알림 설정 |

## ✅ Phase 1 기능 목록

- [x] 메인 홈 랜딩페이지
- [x] 온라인 판매 상품 목록 / 상세 페이지 (MVP: 10종)
- [x] 매장 식물 갤러리 (오프라인 전시용)
- [x] 신상품 입고 소식 페이지
- [x] 묻고 답하기 (게시판형)
- [x] 리뷰 이벤트 (블로그형)
- [x] 구글 소셜 로그인
- [x] 장바구니 (localStorage)
- [x] 회원 기능 (주문 내역, 위시리스트)
- [x] 관리자 페이지 (상품/갤러리/Q&A/리뷰/주문 관리)
- [x] 관리자 대시보드 (통계, 차트)
- [x] 텔레그램 주문 즉시 알림
- [x] Vercel 배포 설정

## 🔒 보안 사항

- `SUPABASE_ANON_KEY`는 공개 키로, 외부 노출이 허용됩니다 (Supabase 설계 방식)
- 관리자 기능은 서버사이드 role 체크로 보호 (JS에서 `requireAdmin()`)
- 이미지 업로드는 로그인된 관리자만 가능

## 📌 미결 사항 (Phase 2 준비)

- [ ] 실제 결제 연동 (TossPayments)
- [ ] 네이버 소셜 로그인
- [ ] 배송 관리 (운송장, 배송 추적)
- [ ] 실제 상품 이미지 및 52종 전체 데이터
- [ ] 브랜드 로고 파일 (`assets/logo/`)
- [ ] 매장 주소 / 운영시간 확정
- [ ] 인스타그램 계정 확정

---

Made with 💚 for 헬로우가든마켓(건민농원)
