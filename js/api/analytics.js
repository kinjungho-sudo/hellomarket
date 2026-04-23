import { supabase } from '../config.js'

/**
 * 이벤트 기록 — 사용자 행동 추적
 * @param {Object} params - 이벤트 파라미터
 * @param {string} params.eventType - 이벤트 유형
 *   ('page_view' | 'product_view' | 'gallery_view' | 'add_to_cart' | 'purchase' | 'wishlist_add')
 * @param {number|string} [params.productId] - 관련 상품 ID
 * @param {string} [params.userId] - 유저 ID (비로그인 시 null)
 * @param {string} [params.sessionId] - 세션 ID
 * @param {string} [params.page] - 현재 페이지 경로
 * @param {string} [params.referrer] - 유입 경로
 */
export async function trackEvent({ eventType, productId, userId, sessionId, page, referrer }) {
  try {
    const { data, error } = await supabase.from('hgm_analytics').insert([
      {
        event_type: eventType,
        product_id: productId || null,
        user_id: userId || null,
        session_id: sessionId || null,
        page: page || window?.location?.pathname || null,
        referrer: referrer || document?.referrer || null,
        created_at: new Date().toISOString(),
      },
    ])

    if (error) throw error
    return { success: true }
  } catch (err) {
    // 트래킹 오류는 조용히 실패 처리 (UX 방해 방지)
    console.warn('[trackEvent] 이벤트 기록 실패 (무시됨):', err)
    return { error: err.message }
  }
}

/**
 * 오늘 방문자 수 조회 (page_view 이벤트 기준 고유 세션 수)
 */
export async function getTodayVisitors() {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('hgm_analytics')
      .select('session_id')
      .eq('event_type', 'page_view')
      .gte('created_at', todayStart.toISOString())

    if (error) throw error

    // 고유 세션 ID 수 집계
    const uniqueSessions = new Set(data.map((row) => row.session_id).filter(Boolean))
    return uniqueSessions.size
  } catch (err) {
    console.error('[getTodayVisitors] 오늘 방문자 수 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 시간대별 주문 통계 (관리자 대시보드용)
 * 특정 날짜의 0~23시 주문 건수와 매출을 시간대별로 반환
 * @param {string} date - 조회 날짜 (YYYY-MM-DD 형식, 기본값: 오늘)
 */
export async function getHourlyOrderStats(date) {
  try {
    // 조회 날짜 설정 (없으면 오늘)
    const targetDate = date || new Date().toISOString().split('T')[0]
    const startTime = `${targetDate}T00:00:00.000Z`
    const endTime = `${targetDate}T23:59:59.999Z`

    const { data, error } = await supabase
      .from('hgm_orders')
      .select('created_at, total_price')
      .gte('created_at', startTime)
      .lte('created_at', endTime)
      .neq('status', '취소')

    if (error) throw error

    // 0~23시 시간대 배열 초기화
    const hourlyStats = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
      revenue: 0,
    }))

    // 시간대별 집계
    data.forEach((order) => {
      const hour = new Date(order.created_at).getHours()
      hourlyStats[hour].count += 1
      hourlyStats[hour].revenue += order.total_price || 0
    })

    return hourlyStats
  } catch (err) {
    console.error('[getHourlyOrderStats] 시간대별 주문 통계 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 카테고리별 판매량 통계 (관리자 대시보드용)
 * 완료된 주문 기준으로 카테고리별 판매 수량과 매출을 집계
 */
export async function getCategoryStats() {
  try {
    // 주문 상품과 상품 카테고리를 조인하여 집계
    const { data, error } = await supabase
      .from('hgm_order_items')
      .select('quantity, price, hgm_products(category)')
      .not('hgm_products', 'is', null)

    if (error) throw error

    // 카테고리별 집계
    const statsMap = {}
    data.forEach((item) => {
      const category = item.hgm_products?.category || '미분류'
      if (!statsMap[category]) {
        statsMap[category] = { category, count: 0, revenue: 0 }
      }
      statsMap[category].count += item.quantity || 0
      statsMap[category].revenue += (item.price || 0) * (item.quantity || 0)
    })

    // 매출 내림차순 정렬
    return Object.values(statsMap).sort((a, b) => b.revenue - a.revenue)
  } catch (err) {
    console.error('[getCategoryStats] 카테고리별 판매량 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 최근 7일 매출 통계 (관리자 대시보드용)
 * 오늘부터 7일 전까지 날짜별 주문 수와 매출을 반환
 */
export async function getWeeklyRevenueStats() {
  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('hgm_orders')
      .select('created_at, total_price')
      .gte('created_at', sevenDaysAgo.toISOString())
      .neq('status', '취소')
      .order('created_at', { ascending: true })

    if (error) throw error

    // 날짜별 통계 맵 초기화 (최근 7일)
    const statsMap = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo)
      d.setDate(sevenDaysAgo.getDate() + i)
      const dateKey = d.toISOString().split('T')[0]
      statsMap[dateKey] = { date: dateKey, count: 0, revenue: 0 }
    }

    // 날짜별 집계
    data.forEach((order) => {
      const dateKey = order.created_at.split('T')[0]
      if (statsMap[dateKey]) {
        statsMap[dateKey].count += 1
        statsMap[dateKey].revenue += order.total_price || 0
      }
    })

    return Object.values(statsMap)
  } catch (err) {
    console.error('[getWeeklyRevenueStats] 주간 매출 통계 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 인기 상품 Top N 조회 (조회수 기준)
 * @param {number} [limit=5] - 조회할 상품 수
 */
export async function getTopProducts(limit = 5) {
  try {
    const { data, error } = await supabase
      .from('hgm_products')
      .select('id, name, category, price, image_url, view_count')
      .order('view_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getTopProducts] 인기 상품 조회 실패:', err)
    return { error: err.message }
  }
}
