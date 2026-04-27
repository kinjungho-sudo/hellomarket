// 관리자 인증 유틸 — Google OAuth + UID 허용목록 기반
// admin/1234 하드코딩 잠금 및 sessionStorage 비밀번호 세션 완전 제거

import { supabase } from '/js/config.js'

const ALLOWED_UIDS = ['2013c141-5736-4b4c-8202-b423cffdb29a']

/** 현재 로그인한 Supabase 유저 UID가 허용 목록에 있는지 확인 */
async function isAllowedUid() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  return ALLOWED_UIDS.includes(user.id)
}

/** 관리자가 아니면 로그인 페이지로 리다이렉트 */
export async function requireAdminAuth() {
  const allowed = await isAllowedUid()
  if (!allowed) {
    window.location.href = '/admin/login.html'
  }
}

/** 로그아웃 — Supabase 세션 종료 */
export async function adminLogout() {
  await supabase.auth.signOut()
  window.location.href = '/admin/login.html'
}
