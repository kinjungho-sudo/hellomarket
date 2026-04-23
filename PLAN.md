# 헬로우가든마켓 독립몰 개발 계획서

## 목표
- **한 줄 요약**: 오프라인 식물 매장(건민농원)의 독립 온라인 몰 구축
- **핵심 문제**: 네이버 스마트스토어에서 20종만 노출 → 방문자 이탈, 수수료 발생, 고객 데이터 미보유
- **성공 기준**: 온라인 상품 노출 수 확대 + 매장 방문 CTA 전환율 향상 + 수수료 0%

## 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| Frontend | HTML / CSS / Vanilla JS | 프레임워크 없이 빠른 배포, Vercel 정적 호스팅 |
| Database | Supabase (PostgreSQL) | 인증·스토리지·DB 통합, 무료 플랜 |
| Auth | Supabase Auth (Google OAuth) | 소셜 로그인 간편 구현 |
| Storage | Supabase Storage (hgm-images) | 상품 이미지 업로드 |
| 알림 | Telegram Bot API | 주문 즉시 알림 |
| 배포 | Vercel | GitHub 연동 자동 배포 |

## 기능 목록

### Must Have (Phase 1 — MVP) ✅ 완료
1. 메인 홈 랜딩페이지 (히어로, 신상품, 베스트, 매장 유도 CTA)
2. 온라인 판매 상품 목록 / 상세 페이지 (MVP 10종)
3. 매장 식물 갤러리 (오프라인 전시용, 구매 불가)
4. 신상품 입고 소식 페이지
5. 묻고 답하기 (게시판형, 비밀글 지원)
6. 리뷰 이벤트 (블로그형, 좋아요)
7. 구글 소셜 로그인 (Supabase OAuth)
8. 장바구니 (localStorage)
9. 회원 기능 (주문 내역, 위시리스트, 알림 설정)
10. 관리자 페이지 (상품·갤러리·Q&A·리뷰·주문·입고소식 관리)
11. 관리자 대시보드 (통계 카드, Chart.js 차트)
12. 텔레그램 주문 즉시 알림
13. Vercel 배포 설정

### Should Have (Phase 2)
1. 온라인 판매 상품 52종 전체 등록
2. 네이버 소셜 로그인
3. 실제 결제 연동 (TossPayments)
4. 배송 관리 (운송장 입력, 상태 추적)
5. 시간대별 리포트 → 텔레그램 자동 전송
6. 신상 입고 알림 수신 (회원 푸시)

### Could Have (Phase 3)
1. RSS 뉴스레터 자동 발송
2. 배송 상태 조회 페이지
3. 회원 적립금 / 쿠폰 시스템

## 파일 구조

```
hellowgardenmarket/
├── index.html / shop.html / product.html / cart.html
├── new.html / gallery.html / about.html
├── qna.html / review-event.html / login.html / mypage.html
├── admin/          (대시보드, 상품, 갤러리, 주문, 입고소식, Q&A, 리뷰, 알림설정)
├── css/            (reset, variables, common, components, admin)
├── js/
│   ├── config.js   ← SUPABASE_ANON_KEY 여기 입력
│   ├── auth.js
│   ├── api/        (products, gallery, orders, posts, users, analytics, notifications, qna, reviews)
│   ├── pages/admin/
│   └── utils/      (cart, format, storage, session)
├── sql/            (01_create_tables.sql, 02_seed_data.sql)
└── assets/images/  (placeholder.svg)
```

## Phase 1 구현 현황

| 파일 | 상태 |
|---|---|
| DB 스키마 (12개 테이블) | ✅ 완료 |
| 시드 데이터 (상품 10종 + 갤러리 15종) | ✅ 완료 |
| CSS 디자인 시스템 | ✅ 완료 |
| JS API 모듈 9개 | ✅ 완료 |
| 고객 페이지 11개 | ✅ 완료 |
| 관리자 페이지 8개 | ✅ 완료 |
| 텔레그램 알림 연동 | ✅ 완료 |
| Vercel 배포 설정 | ✅ 완료 |

## 미결 사항 (Phase 2 착수 전 확정 필요)

- [ ] 브랜드 로고 파일 수령 → `assets/logo/`
- [ ] 매장 주소 / 운영시간 확정 → `about.html`, `index.html` 업데이트
- [ ] 인스타그램 계정명 확정
- [ ] SUPABASE_ANON_KEY 입력 → `js/config.js`
- [ ] Google OAuth Client ID/Secret 발급
- [ ] Telegram Bot Token / Chat ID 발급
- [ ] Supabase Storage 버킷 `hgm-images` 생성 (Public: true)
- [ ] 관리자 계정 role 설정 (`UPDATE hgm_users SET role = 'admin' WHERE email = '...'`)
