// 포맷 유틸리티 함수 모음

/**
 * 가격 포맷 (숫자 → '28,000원')
 * @param {number} price
 * @returns {string}
 */
export function formatPrice(price) {
  if (price == null || isNaN(price)) return '-'
  return Number(price).toLocaleString('ko-KR') + '원'
}

/**
 * 날짜 포맷 (ISO → 'YYYY-MM-DD')
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch {
    return '-'
  }
}

/**
 * 날짜 포맷 (ISO → 'YYYY-MM-DD HH:MM')
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
  } catch {
    return '-'
  }
}

/**
 * 상대 날짜 ('3일 전', '방금 전')
 * @param {string} dateStr
 * @returns {string}
 */
export function formatRelativeDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const sec = Math.floor(diff / 1000)
    if (sec < 60) return '방금 전'
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}분 전`
    const hour = Math.floor(min / 60)
    if (hour < 24) return `${hour}시간 전`
    const day = Math.floor(hour / 24)
    if (day < 30) return `${day}일 전`
    const month = Math.floor(day / 30)
    if (month < 12) return `${month}개월 전`
    return `${Math.floor(month / 12)}년 전`
  } catch {
    return '-'
  }
}

/**
 * 주문번호 생성 (HGM-20260423-001)
 * @returns {string}
 */
export function generateOrderNumber() {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `HGM-${date}-${rand}`
}

/**
 * 파일 사이즈 포맷 (bytes → 'KB', 'MB')
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes == null || isNaN(bytes)) return '-'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

/**
 * 텍스트 말줄임 (n자 이상이면 '...')
 * @param {string} text
 * @param {number} n - 최대 글자 수 (기본 50)
 * @returns {string}
 */
export function truncate(text, n = 50) {
  if (!text) return ''
  if (text.length <= n) return text
  return text.slice(0, n) + '...'
}
