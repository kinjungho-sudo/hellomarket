// 관리자 인증 유틸
// UID 허용 목록 + 비밀번호(hgm_notification_settings.admin_password) 이중 검증

import { supabase } from '/js/config.js'

const ALLOWED_UIDS = ['2013c141-5736-4b4c-8202-b423cffdb29a']

const SESSION_KEY = 'hgm_admin_auth'
const SESSION_TTL = 8 * 60 * 60 * 1000 // 8시간

/** 현재 로그인한 Supabase 유저 UID가 허용 목록에 있는지 확인 */
async function isAllowedUid() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  return ALLOWED_UIDS.includes(user.id)
}

/** 관리자 비밀번호 검증 + UID 검증 후 세션 저장 */
export async function adminLogin(password) {
  try {
    // UID 검증 먼저
    if (!(await isAllowedUid())) {
      return { error: '접근 권한이 없는 계정입니다.' }
    }

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

/** 관리자 세션이 유효한지 확인 (세션 TTL만 검사 — UID는 로그인 시 1회 검증) */
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
export async function requireAdminAuth() {
  if (!isAdminAuthed()) {
    window.location.href = '/admin/login.html'
    return
  }
  // 세션이 있어도 UID가 허용 목록에 없으면 강제 로그아웃
  if (!(await isAllowedUid())) {
    adminLogout()
    window.location.href = '/admin/login.html'
  }
}
