// 인증 관련 함수 모음 — Supabase Auth 기반 ES Module
import { supabase } from './config.js'

/**
 * 현재 세션 조회
 * @returns {Promise<{session: object|null, error: object|null}>}
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    return { session: data?.session ?? null, error }
  } catch (err) {
    console.error('[HGM] getSession 오류:', err)
    return { session: null, error: err }
  }
}

/**
 * 구글 소셜 로그인 (Supabase OAuth)
 * 로그인 성공 후 /login.html?callback=1 로 리다이렉트 → 거기서 관리자 여부 판단
 */
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/login.html?callback=1' }
    })
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('[HGM] signInWithGoogle 오류:', err)
    return { data: null, error: err }
  }
}

/**
 * 로그인한 사용자를 hgm_users에 upsert (최초 로그인 시 row 생성)
 */
export async function upsertUserProfile(user) {
  try {
    const { error } = await supabase
      .from('hgm_users')
      .upsert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name ?? user.email,
        provider: 'google',
      }, { onConflict: 'id', ignoreDuplicates: false })
    if (error) throw error
  } catch (err) {
    console.error('[HGM] upsertUserProfile 오류:', err)
  }
}

/**
 * 로그아웃
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (err) {
    console.error('[HGM] signOut 오류:', err)
    return { error: err }
  }
}

/**
 * 인증 상태 변경 리스너
 * @param {Function} callback - (event, session) => void
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}

/**
 * 관리자 여부 확인 (hgm_users.role = 'admin')
 * @returns {Promise<boolean>}
 */
export async function isAdmin() {
  try {
    // 1. 현재 세션에서 userId 획득
    const { session } = await getSession()
    if (!session?.user?.id) return false

    // 2. hgm_users에서 role 조회
    const { data, error } = await supabase
      .from('hgm_users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (error) throw error

    // 3. role === 'admin' 반환
    return data?.role === 'admin'
  } catch (err) {
    console.error('[HGM] isAdmin 오류:', err)
    return false
  }
}

/**
 * 로그인 상태가 아니면 login.html로 리다이렉트
 */
export async function requireLogin() {
  const { session } = await getSession()
  if (!session) {
    window.location.href = '/login.html'
  }
}

/**
 * 관리자가 아니면 리다이렉트
 * - 비로그인: loginRedirect 저장 후 login.html
 * - 일반 회원: index.html
 */
export async function requireAdmin() {
  const { session } = await getSession()
  if (!session) {
    sessionStorage.setItem('loginRedirect', window.location.pathname)
    window.location.href = '/login.html'
    return
  }
  // hgm_users row가 없을 경우 자동 생성
  await upsertUserProfile(session.user)
  const admin = await isAdmin()
  if (!admin) {
    window.location.href = '/index.html'
  }
}

/**
 * 공통 네비게이션 UI 업데이트 (로그인/로그아웃 버튼)
 * - 로그인 상태이면 마이페이지/로그아웃 표시, 아니면 로그인 표시
 * - 관리자이면 "관리자 페이지" 버튼 추가
 */
export async function updateNavAuth() {
  try {
    const { session } = await getSession()
    const navAuthEl = document.getElementById('nav-auth')
    if (!navAuthEl) return

    // 기존 자식 요소 제거 후 DOM API로 재구성 (XSS 방지)
    navAuthEl.textContent = ''

    if (session) {
      // 관리자 여부 확인
      const admin = await isAdmin()

      // 관리자 페이지 버튼 (관리자인 경우)
      if (admin) {
        const adminLink = document.createElement('a')
        adminLink.href = '/admin/index.html'
        adminLink.className = 'btn btn-admin'
        adminLink.textContent = '관리자 페이지'
        navAuthEl.appendChild(adminLink)
      }

      // 마이페이지 링크
      const mypageLink = document.createElement('a')
      mypageLink.href = '/mypage.html'
      mypageLink.className = 'nav-link'
      mypageLink.textContent = '마이페이지'
      navAuthEl.appendChild(mypageLink)

      // 로그아웃 버튼
      const logoutBtn = document.createElement('button')
      logoutBtn.className = 'btn btn-ghost'
      logoutBtn.id = 'btn-logout'
      logoutBtn.textContent = '로그아웃'
      logoutBtn.addEventListener('click', async () => {
        await signOut()
        window.location.href = '/index.html'
      })
      navAuthEl.appendChild(logoutBtn)
    } else {
      // 로그인 링크
      const loginLink = document.createElement('a')
      loginLink.href = '/login.html'
      loginLink.className = 'btn btn-primary'
      loginLink.textContent = '로그인'
      navAuthEl.appendChild(loginLink)
    }
  } catch (err) {
    console.error('[HGM] updateNavAuth 오류:', err)
  }
}
