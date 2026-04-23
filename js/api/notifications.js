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
    if (!settings.is_enabled) return { success: false, reason: '알림 비활성화 상태' }
    if (!settings.bot_token || !settings.chat_id) throw new Error('Bot Token 또는 Chat ID가 설정되지 않았습니다.')

    const url = `https://api.telegram.org/bot${settings.bot_token}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.chat_id,
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
    // 주문 상품 목록 텍스트 생성
    const itemLines = (order.hgm_order_items || order.items || [])
      .map((item) => `  📦 ${item.product_name} x${item.quantity} (${item.price?.toLocaleString()}원)`)
      .join('\n')

    // 주문 시각 포맷
    const orderTime = new Date(order.created_at).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
    })

    // 텔레그램 메시지 포맷
    const message = [
      '🛒 <b>새 주문이 들어왔어요!</b>',
      '',
      `📋 주문번호: ${order.order_number}`,
      `👤 주문자: ${order.receiver_name}`,
      itemLines,
      `💰 총 결제금액: ${order.total_amount?.toLocaleString()}원`,
      `⏰ 주문시각: ${orderTime}`,
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
