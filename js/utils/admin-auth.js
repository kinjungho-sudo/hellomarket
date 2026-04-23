// 관리자 비밀번호 인증 유틸
// 비밀번호는 Supabase hgm_notification_settings 테이블의 admin_password 컬럼에 저장

import { supabase } from '/js/config.js'

const SESSION_KEY = 'hgm_admin_auth'
const SESSION_TTL = 8 * 60 * 60 * 1000 // 8시간

/** 관리자 비밀번호 검증 후 세션 저장 */
export async function adminLogin(password) {
  try {
    const { data, error } = await supabase
      .from('hgm_notification_settings')
      .select('admin_password')
      .limit(1)
      .single()

    if (error) throw error

    const storedPw = data?.admin_password || ''
    if (!storedPw) return { error: '관리자 비밀번호가 설정되지 않았습니다.' }
    if (password !== storedPw) return { error: '비밀번호가 올바르지 않습니다.' }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ at: Date.now() }))
    return { success: true }
  } catch (err) {
    console.error('[adminLogin]', err)
    return { error: '서버 오류가 발생했습니다.' }
  }
}

/** 관리자 세션이 유효한지 확인 */
export function isAdminAuthed() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const { at } = JSON.parse(raw)
    return Date.now() - at < SESSION_TTL
  } catch {
    return false
  }
}

/** 관리자 세션 삭제 (로그아웃) */
export function adminLogout() {
  sessionStorage.removeItem(SESSION_KEY)
}

/** 관리자가 아니면 로그인 페이지로 리다이렉트 */
export function requireAdminAuth() {
  if (!isAdminAuthed()) {
    window.location.href = '/admin/login.html'
  }
}
