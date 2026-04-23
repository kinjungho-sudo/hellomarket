import { supabase } from '../config.js'
import { sendOrderAlert } from './notifications.js'

const SUPABASE_URL = 'https://gqynptpjomcqzxyykqic.supabase.co'

// 주문 완료 이메일 발송 (Edge Function 호출)
async function sendOrderEmail(orderId, toEmail) {
  try {
    if (!toEmail) return
    await fetch(`${SUPABASE_URL}/functions/v1/send-order-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, to_email: toEmail }),
    })
  } catch (e) {
    console.warn('[sendOrderEmail] 이메일 발송 실패:', e)
  }
}

// 신규 상품 알림 이메일 발송 (Edge Function 호출, 관리자 전용)
export async function sendNewProductEmail(productId) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-new-product-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    })
    return await res.json()
  } catch (e) {
    console.warn('[sendNewProductEmail] 이메일 발송 실패:', e)
    return { error: String(e) }
  }
}

/**
 * 주문번호 생성 (HGM-YYYYMMDD-XXX 형식)
 * 예: HGM-20260423-001
 */
export function generateOrderNumber() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  // 랜덤 3자리 숫자 + 타임스탬프 조합으로 유일성 확보
  const random = String(Math.floor(Math.random() * 900) + 100)
  return `HGM-${year}${month}${day}-${random}`
}

/**
 * 주문 생성
 * @param {string} userId - 주문자 유저 ID
 * @param {Array} items - 주문 상품 목록
 *   [{ productId, productName, quantity, price }]
 * @param {Object} receiverInfo - 수령자 정보
 *   { name, phone, address, addressDetail, zipcode, deliveryMemo }
 */
export async function createOrder(userId, items, receiverInfo) {
  try {
    // 총 결제금액 계산
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    // 주문 번호 생성
    const orderNumber = generateOrderNumber()

    // 1. hgm_orders 테이블에 주문 헤더 삽입
    const orderRowFull = {
      order_number:   orderNumber,
      user_id:        userId || null,
      is_guest:       !userId,
      orderer_name:   receiverInfo.ordererName || receiverInfo.name,
      orderer_email:  receiverInfo.ordererEmail || null,
      total_price:    totalAmount,
      status:         '주문완료',
      receiver_name:  receiverInfo.name,
      receiver_phone: receiverInfo.phone,
      address:        receiverInfo.address,
      address_detail: receiverInfo.addressDetail || '',
      zipcode:        receiverInfo.zipcode || '',
      delivery_memo:  receiverInfo.deliveryMemo || '',
    }

    let { data: order, error: orderError } = await supabase
      .from('hgm_orders')
      .insert([orderRowFull])
      .select()
      .single()

    // is_guest / orderer 컬럼이 DB에 없을 경우 해당 컬럼 제외 후 재시도
    if (orderError && orderError.message && orderError.message.includes('column')) {
      const { is_guest, orderer_name, orderer_email, ...orderRowBase } = orderRowFull
      const retry = await supabase.from('hgm_orders').insert([orderRowBase]).select().single()
      order = retry.data
      orderError = retry.error
    }

    if (orderError) throw orderError

    // 2. hgm_order_items 테이블에 주문 상품 일괄 삽입
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      price: item.price,
    }))

    const { error: itemsError } = await supabase.from('hgm_order_items').insert(orderItems)

    if (itemsError) throw itemsError

    const result = { ...order, items: orderItems }

    // 텔레그램 주문 알림 발송 (실패해도 주문은 정상 처리)
    sendOrderAlert(result).catch((e) => console.warn('[createOrder] 텔레그램 알림 실패:', e))

    // 주문 완료 이메일 발송 (주문자 이메일이 있을 때만)
    const recipientEmail = receiverInfo.ordererEmail || receiverInfo.email || null
    if (recipientEmail) {
      sendOrderEmail(order.id, recipientEmail).catch((e) => console.warn('[createOrder] 이메일 발송 실패:', e))
    }

    return result
  } catch (err) {
    console.error('[createOrder] 주문 생성 실패:', err)
    return { error: err.message }
  }
}

/**
 * 회원별 주문 목록 조회 (최신순)
 * @param {string} userId - 유저 ID
 */
export async function getOrdersByUser(userId) {
  try {
    const { data, error } = await supabase
      .from('hgm_orders')
      .select('*, hgm_order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getOrdersByUser] 회원 주문 목록 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 주문 단건 조회 (주문 상품 포함)
 * @param {number|string} orderId - 주문 ID
 */
export async function getOrderById(orderId) {
  try {
    const { data, error } = await supabase
      .from('hgm_orders')
      .select('*, hgm_order_items(*)')
      .eq('id', orderId)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getOrderById] 주문 단건 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 주문 상태 변경 (관리자 전용)
 * @param {number|string} orderId - 주문 ID
 * @param {string} status - 변경할 상태 (pending, confirmed, shipping, delivered, cancelled)
 */
export async function updateOrderStatus(orderId, status) {
  try {
    const { data, error } = await supabase
      .from('hgm_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[updateOrderStatus] 주문 상태 변경 실패:', err)
    return { error: err.message }
  }
}

/**
 * 전체 주문 목록 조회 (관리자 전용, 필터/페이지네이션 지원)
 * @param {Object} options - 조회 옵션
 * @param {string} [options.status] - 주문 상태 필터
 * @param {string} [options.startDate] - 시작 날짜 (ISO 형식)
 * @param {string} [options.endDate] - 종료 날짜 (ISO 형식)
 * @param {string} [options.search] - 주문번호 또는 주문자명 검색
 * @param {number} [options.limit=20] - 페이지당 조회 수
 * @param {number} [options.offset=0] - 시작 오프셋
 */
export async function getAllOrders({ status, startDate, endDate, search, guestOnly, limit = 20, offset = 0 } = {}) {
  try {
    let query = supabase
      .from('hgm_orders')
      .select('*, hgm_order_items(*)', { count: 'exact' })
      .order('created_at', { ascending: false })

    // 상태 필터 적용
    if (status) {
      query = query.eq('status', status)
    }

    // 비회원 필터
    if (guestOnly) {
      query = query.eq('is_guest', true)
    }

    // 날짜 범위 필터 적용
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // 주문번호, 수령자명, 주문자명, 이메일로 검색
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,receiver_name.ilike.%${search}%,orderer_name.ilike.%${search}%,orderer_email.ilike.%${search}%`)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) throw error
    return { data, count }
  } catch (err) {
    console.error('[getAllOrders] 전체 주문 목록 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 대시보드용 주문 통계 조회
 * 오늘 / 이번 주 / 이번 달의 주문 수와 매출을 반환
 * @returns {{ today, week, month }} - 각 기간별 { count, revenue }
 */
export async function getOrderStats() {
  try {
    const now = new Date()

    // 오늘 시작 시각
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    // 이번 주 시작 (일요일 기준)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    // 이번 달 시작
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // 취소 제외한 주문만 집계
    const { data, error } = await supabase
      .from('hgm_orders')
      .select('created_at, total_price')
      .neq('status', '취소')

    if (error) throw error

    // 통계 집계 헬퍼 함수
    const calcStats = (orders, fromDate) => {
      const filtered = orders.filter((o) => new Date(o.created_at) >= new Date(fromDate))
      return {
        count: filtered.length,
        revenue: filtered.reduce((sum, o) => sum + (o.total_price || 0), 0),
      }
    }

    return {
      today: calcStats(data, todayStart),
      week: calcStats(data, weekStart.toISOString()),
      month: calcStats(data, monthStart),
    }
  } catch (err) {
    console.error('[getOrderStats] 주문 통계 조회 실패:', err)
    return { error: err.message }
  }
}
