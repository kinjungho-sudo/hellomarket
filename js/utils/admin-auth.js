// 관리자 인증 유틸 — Google OAuth 로그인 여부만 확인

import { supabase } from '/js/config.js'

/** 관리자가 아니면 로그인 페이지로 리다이렉트 */
export async function requireAdminAuth() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    window.location.href = '/admin/login.html'
  }
}

/** 로그아웃 — Supabase 세션 종료 */
export async function adminLogout() {
  await supabase.auth.signOut()
  window.location.href = '/admin/login.html'
}
