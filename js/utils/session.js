// 세션 ID 관리 — 비로그인 방문자 추적용 (analytics 연동)

const SESSION_KEY = 'hgm_session_id'

/**
 * 세션 ID 반환 (없으면 새로 생성)
 * sessionStorage 기반 — 브라우저 탭 단위로 유지
 * @returns {string} UUID v4 형식의 세션 ID
 */
export function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}
