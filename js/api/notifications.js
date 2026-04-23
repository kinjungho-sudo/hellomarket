// 텔레그램 알림 전송 모듈
// Bot Token과 Chat ID는 hgm_notification_settings 테이블에서 가져옴
import { supabase } from '../config.js'

/**
 * 알림 설정 조회 (hgm_notification_settings 테이블)
 * @returns {{ bot_token, chat_id, is_enabled }} - 텔레그램 설정 값
 */
export async function getNotificationSettings() {
  try {
    const { data, error } = await supabase
      .from('hgm_notification_settings')
      .select('*')
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getNotificationSettings] 알림 설정 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 알림 설정 저장 (관리자 전용)
 * @param {Object} data - 설정 데이터 ({ bot_token, chat_id, is_enabled })
 */
export async function saveNotificationSettings(data) {
  try {
    // upsert: 설정이 이미 있으면 업데이트, 없으면 삽입
    const { data: saved, error } = await supabase
      .from('hgm_notification_settings')
      .upsert([{ ...data, updated_at: new Date().toISOString() }])
      .select()
      .single()

    if (error) throw error
    return saved
  } catch (err) {
    console.error('[saveNotificationSettings] 알림 설정 저장 실패:', err)
    return { error: err.message }
  }
}

/**
 * 텔레그램 메시지 전송
 * Telegram Bot API: https://api.telegram.org/bot{token}/sendMessage
 * @param {string} message - 전송할 메시지 (HTML 마크다운 지원)
 */
export async function sendTelegram(message) {
  try {
    // DB에서 봇 설정 가져오기
    const settings = await getNotificationSettings()
    if (settings.error) throw new Error('알림 설정을 불러올 수 없습니다.')
    if (!settings.telegram_bot_token || !settings.telegram_chat_id) throw new Error('Bot Token 또는 Chat ID가 설정되지 않았습니다.')

    const url = `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.telegram_chat_id,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    const result = await response.json()
    if (!result.ok) throw new Error(result.description || '텔레그램 전송 실패')

    return { success: true, message_id: result.result?.message_id }
  } catch (err) {
    console.error('[sendTelegram] 텔레그램 메시지 전송 실패:', err)
    return { error: err.message }
  }
}

/**
 * 주문 알림 발송
 * 새 주문이 들어왔을 때 관리자에게 텔레그램 알림을 보냄
 * @param {Object} order - 주문 객체 (hgm_orders + hgm_order_items 포함)
 */
export async function sendOrderAlert(order) {
  try {
    // 주문 알림 활성화 여부 확인
    const settings = await getNotificationSettings()
    if (!settings.error && !settings.notify_on_order) {
      return { success: false, reason: '주문 알림 비활성화 상태' }
    }

    const fmt = (n) => Number(n || 0).toLocaleString('ko-KR')
    const orderTime = new Date(order.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    const items = order.hgm_order_items || order.items || []

    // 상품 목록 (상품명 / 수량 / 단가 / 소계)
    const itemLines = items.map((item) => {
      const subtotal = (item.price || 0) * (item.quantity || 1)
      return `  • ${item.product_name}\n    ${item.quantity}개 × ${fmt(item.price)}원 = <b>${fmt(subtotal)}원</b>`
    }).join('\n')

    // 상품 합계 (단가 × 수량 합산)
    const productTotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)
    // 배송비 = 총 결제금액 - 상품 합계 (역산)
    const deliveryFee = Math.max(0, (order.total_price || 0) - productTotal)

    // 배송 방식 표시
    const deliveryMethod = order.delivery_method || '택배 배송'

    // 결제 수단
    const paymentMethod = order.payment_method || '미정'
    const paymentStatus = order.payment_status || '미결제'

    // 주문자 구분 (회원/비회원)
    const ordererLabel = order.is_guest ? '비회원 주문' : '회원 주문'
    const ordererName = order.orderer_name || order.receiver_name || '—'
    const ordererEmail = order.orderer_email ? `\n  이메일: ${order.orderer_email}` : ''

    // 배송지
    const fullAddress = [order.address, order.address_detail].filter(Boolean).join(' ')

    const message = [
      `🛒 <b>새 주문이 들어왔어요!</b>  [${ordererLabel}]`,
      '',
      '─────────────────────',
      `📋 <b>주문번호:</b> ${order.order_number}`,
      `⏰ <b>주문시각:</b> ${orderTime}`,
      '',
      '👤 <b>주문자 정보</b>',
      `  이름: ${ordererName}`,
      `  연락처: ${order.receiver_phone || '—'}${ordererEmail}`,
      '',
      '📦 <b>주문 상품</b>',
      itemLines,
      '',
      '🚚 <b>배송 정보</b>',
      `  배송 방식: ${deliveryMethod}`,
      `  받는 분: ${order.receiver_name || '—'}`,
      `  연락처: ${order.receiver_phone || '—'}`,
      `  주소: ${fullAddress || '—'}`,
      `  우편번호: ${order.zipcode || '—'}`,
      `  배송 메모: ${order.delivery_memo || '없음'}`,
      '',
      '💳 <b>결제 정보</b>',
      `  결제 수단: ${paymentMethod}`,
      `  결제 상태: ${paymentStatus}`,
      `  상품 금액: ${fmt(productTotal)}원`,
      `  배송비: ${deliveryFee > 0 ? fmt(deliveryFee) + '원' : '무료'}`,
      `  <b>총 결제금액: ${fmt(order.total_price || productTotal + deliveryFee)}원</b>`,
      '─────────────────────',
    ].join('\n')

    return await sendTelegram(message)
  } catch (err) {
    console.error('[sendOrderAlert] 주문 알림 발송 실패:', err)
    return { error: err.message }
  }
}

/**
 * 텔레그램 연결 테스트 (관리자 설정 페이지용)
 * 입력한 Bot Token과 Chat ID가 정상 동작하는지 확인
 * @param {string} botToken - 테스트할 봇 토큰
 * @param {string} chatId - 테스트할 채팅 ID
 */
export async function testTelegramConnection(botToken, chatId) {
  try {
    if (!botToken || !chatId) throw new Error('Bot Token과 Chat ID를 모두 입력해주세요.')

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '✅ 헬로우가든마켓 알림 연결 테스트 성공!',
        parse_mode: 'HTML',
      }),
    })

    const result = await response.json()
    if (!result.ok) throw new Error(result.description || '연결 테스트 실패')

    return { success: true }
  } catch (err) {
    console.error('[testTelegramConnection] 텔레그램 연결 테스트 실패:', err)
    return { error: err.message }
  }
}

/**
 * Q&A 답변 알림 발송
 * 관리자가 Q&A에 답변했을 때 해당 유저에게 알림 (텔레그램 채널 공지)
 * @param {Object} qna - Q&A 객체 ({ title, answer, user_name 등 })
 */
export async function sendQnaAnswerAlert(qna) {
  try {
    const message = [
      '💬 <b>Q&A 답변이 등록되었어요!</b>',
      '',
      `📝 제목: ${qna.title}`,
      `👤 작성자: ${qna.user_name || '고객'}`,
      `💡 답변: ${qna.answer}`,
    ].join('\n')

    return await sendTelegram(message)
  } catch (err) {
    console.error('[sendQnaAnswerAlert] Q&A 답변 알림 발송 실패:', err)
    return { error: err.message }
  }
}

/**
 * 시간대별 리포트 발송
 * 관리자가 수동으로 버튼을 눌러 실행 (자동 스케줄은 브라우저 비종료 필요로 미구현)
 */
export async function sendHourlyReport() {
  try {
    const settings = await getNotificationSettings()
    if (settings.error) throw new Error('알림 설정을 불러올 수 없습니다.')
    if (!settings.telegram_bot_token || !settings.telegram_chat_id) throw new Error('텔레그램 설정이 없습니다.')

    // 오늘 날짜 범위 (KST 기준)
    const now = new Date()
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const todayStr = kst.toISOString().slice(0, 10)
    const todayStart = todayStr + 'T00:00:00+09:00'
    const todayEnd   = todayStr + 'T23:59:59+09:00'

    // 오늘 주문 조회
    const { data: orders, error: oErr } = await supabase
      .from('hgm_orders')
      .select('total_price, created_at, status')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
    if (oErr) throw oErr

    // 오늘 페이지뷰 조회
    const { count: visits } = await supabase
      .from('hgm_analytics')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'page_view')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)

    const fmt = (n) => Number(n || 0).toLocaleString('ko-KR')

    // 시간대별 집계 (오전/오후/저녁)
    const bySlot = { morning: { count: 0, revenue: 0 }, afternoon: { count: 0, revenue: 0 }, evening: { count: 0, revenue: 0 } }
    for (const o of (orders || [])) {
      const h = new Date(new Date(o.created_at).getTime() + 9*60*60*1000).getUTCHours()
      const slot = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
      bySlot[slot].count++
      bySlot[slot].revenue += o.total_price || 0
    }

    const totalOrders  = (orders || []).length
    const totalRevenue = (orders || []).reduce((s, o) => s + (o.total_price || 0), 0)
    const dateStr = kst.toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' })
    const timeStr = kst.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' })

    const message = [
      `📊 <b>헬로우가든 일일 리포트</b>`,
      `📅 ${dateStr} · ${timeStr} 기준`,
      '',
      '─────────────────────',
      `🌅 오전 (00~12시): <b>${bySlot.morning.count}건</b> / ${fmt(bySlot.morning.revenue)}원`,
      `☀️ 오후 (12~18시): <b>${bySlot.afternoon.count}건</b> / ${fmt(bySlot.afternoon.revenue)}원`,
      `🌙 저녁 (18~24시): <b>${bySlot.evening.count}건</b> / ${fmt(bySlot.evening.revenue)}원`,
      '─────────────────────',
      `📦 오늘 총 주문: <b>${totalOrders}건</b>`,
      `💰 오늘 총 매출: <b>${fmt(totalRevenue)}원</b>`,
      `👥 오늘 방문자: <b>${visits || 0}명</b>`,
    ].join('\n')

    return await sendTelegram(message)
  } catch (err) {
    console.error('[sendHourlyReport] 리포트 발송 실패:', err)
    return { error: err.message }
  }
}
