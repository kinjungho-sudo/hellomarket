// Vercel Serverless Function — 일일 판매 리포트 텔레그램 발송
// Vercel Cron: 매일 22:00 KST (13:00 UTC) 자동 실행
// GET /api/daily-report  (Cron 호출 또는 수동 호출 모두 지원)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gqynptpjomcqzxyykqic.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CRON_SECRET = process.env.CRON_SECRET

export default async function handler(req, res) {
  // CRON_SECRET이 설정된 경우 Authorization 헤더로 검증
  if (CRON_SECRET) {
    const auth = req.headers['authorization']
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const report = await buildDailyReport(supabase)
    const message = formatReportMessage(report)
    await sendTelegram(supabase, message)

    return res.status(200).json({ success: true, summary: report.summary })
  } catch (err) {
    console.error('[daily-report] 리포트 생성 실패:', err)
    return res.status(500).json({ error: err.message })
  }
}

// ── 리포트 데이터 집계 ──────────────────────────────────────────────

async function buildDailyReport(supabase) {
  const now = new Date()
  // KST 기준 오늘 날짜 (UTC+9)
  const kstOffset = 9 * 60 * 60 * 1000
  const kstNow = new Date(now.getTime() + kstOffset)
  const todayKST = kstNow.toISOString().slice(0, 10) // 'YYYY-MM-DD'

  // 오늘 00:00 ~ 23:59:59 KST → UTC 변환
  const dayStart = new Date(`${todayKST}T00:00:00+09:00`).toISOString()
  const dayEnd   = new Date(`${todayKST}T23:59:59+09:00`).toISOString()

  // 1. 오늘 주문 전체 조회 (취소 포함, 구분 표시)
  const { data: orders, error: ordersErr } = await supabase
    .from('hgm_orders')
    .select('*, hgm_order_items(product_name, quantity, price)')
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd)
    .order('created_at', { ascending: true })

  if (ordersErr) throw ordersErr

  const activeOrders  = orders.filter(o => o.status !== '취소')
  const cancelOrders  = orders.filter(o => o.status === '취소')

  // 2. 총 매출 / 주문 수
  const totalRevenue  = activeOrders.reduce((s, o) => s + (o.total_price || 0), 0)
  const totalCount    = activeOrders.length
  const cancelCount   = cancelOrders.length
  const cancelRevenue = cancelOrders.reduce((s, o) => s + (o.total_price || 0), 0)

  // 3. 시간대별 집계 (오전 06~12 / 오후 12~18 / 저녁 18~24 / 새벽 00~06)
  const timeSlots = {
    '새벽 (00~06시)': { count: 0, revenue: 0 },
    '오전 (06~12시)': { count: 0, revenue: 0 },
    '오후 (12~18시)': { count: 0, revenue: 0 },
    '저녁 (18~24시)': { count: 0, revenue: 0 },
  }
  for (const o of activeOrders) {
    const kstHour = new Date(new Date(o.created_at).getTime() + kstOffset).getUTCHours()
    const slot =
      kstHour < 6  ? '새벽 (00~06시)' :
      kstHour < 12 ? '오전 (06~12시)' :
      kstHour < 18 ? '오후 (12~18시)' : '저녁 (18~24시)'
    timeSlots[slot].count++
    timeSlots[slot].revenue += o.total_price || 0
  }

  // 4. 상품별 판매 순위
  const productMap = {}
  for (const o of activeOrders) {
    for (const item of (o.hgm_order_items || [])) {
      const key = item.product_name
      if (!productMap[key]) productMap[key] = { qty: 0, revenue: 0 }
      productMap[key].qty     += item.quantity || 1
      productMap[key].revenue += (item.price || 0) * (item.quantity || 1)
    }
  }
  const productRank = Object.entries(productMap)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5) // TOP 5

  // 5. 결제 수단별 집계
  const paymentMap = {}
  for (const o of activeOrders) {
    const method = o.payment_method || '미정'
    paymentMap[method] = (paymentMap[method] || 0) + 1
  }

  // 6. 회원/비회원 비율
  const guestCount  = activeOrders.filter(o => o.is_guest).length
  const memberCount = totalCount - guestCount

  // 7. 오늘 신규 가입 회원 수
  const { count: newUsers } = await supabase
    .from('hgm_users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd)

  return {
    date: todayKST,
    summary: { totalCount, totalRevenue, cancelCount, cancelRevenue },
    timeSlots,
    productRank,
    paymentMap,
    memberCount,
    guestCount,
    newUsers: newUsers || 0,
    orders: activeOrders,
  }
}

// ── 메시지 포맷 ────────────────────────────────────────────────────

function formatReportMessage(r) {
  const fmt   = (n) => Number(n || 0).toLocaleString('ko-KR')
  const pct   = (n, total) => total ? `${Math.round((n / total) * 100)}%` : '0%'
  const { date, summary, timeSlots, productRank, paymentMap, memberCount, guestCount, newUsers } = r

  // 시간대별 블록
  const timeLines = Object.entries(timeSlots)
    .map(([label, { count, revenue }]) => {
      const bar = '█'.repeat(Math.min(count, 10)) || '─'
      return `  ${label}: ${bar} ${count}건 / ${fmt(revenue)}원`
    })
    .join('\n')

  // 상품 TOP 5
  const productLines = productRank.length
    ? productRank.map(([name, { qty, revenue }], i) =>
        `  ${i + 1}위 ${name}  ${qty}개 · ${fmt(revenue)}원`
      ).join('\n')
    : '  (주문 없음)'

  // 결제 수단
  const paymentLines = Object.entries(paymentMap).length
    ? Object.entries(paymentMap).map(([m, c]) => `  ${m}: ${c}건`).join('\n')
    : '  (주문 없음)'

  // 취소 블록 (취소 건수 있을 때만)
  const cancelBlock = summary.cancelCount > 0
    ? `\n⚠️ <b>취소 내역</b>\n  취소 ${summary.cancelCount}건 / 환불 예정 ${fmt(summary.cancelRevenue)}원\n`
    : ''

  return [
    `📊 <b>헬로우가든 일일 판매 리포트</b>`,
    `📅 ${date} (22:00 마감 기준)`,
    '',
    '══════════════════════',
    `🧾 <b>총 주문</b>: ${summary.totalCount}건`,
    `💰 <b>총 매출</b>: ${fmt(summary.totalRevenue)}원`,
    cancelBlock,
    '──────────────────────',
    '🕐 <b>시간대별 주문</b>',
    timeLines,
    '',
    '──────────────────────',
    '🏆 <b>상품 판매 순위 TOP 5</b>',
    productLines,
    '',
    '──────────────────────',
    '💳 <b>결제 수단</b>',
    paymentLines,
    '',
    '──────────────────────',
    '👥 <b>주문자 유형</b>',
    `  회원: ${memberCount}건 (${pct(memberCount, summary.totalCount)})`,
    `  비회원: ${guestCount}건 (${pct(guestCount, summary.totalCount)})`,
    `  신규 가입: ${newUsers}명`,
    '══════════════════════',
    summary.totalCount === 0
      ? '오늘은 주문이 없었습니다. 내일 파이팅! 🌱'
      : `오늘도 수고하셨습니다 🌻`,
  ].filter(s => s !== undefined).join('\n')
}

// ── 텔레그램 전송 ──────────────────────────────────────────────────

async function sendTelegram(supabase, message) {
  const { data: settings } = await supabase
    .from('hgm_notification_settings')
    .select('telegram_bot_token, telegram_chat_id')
    .single()

  if (!settings?.telegram_bot_token || !settings?.telegram_chat_id) {
    throw new Error('텔레그램 Bot Token 또는 Chat ID가 설정되지 않았습니다.')
  }

  const url = `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:    settings.telegram_chat_id,
      text:       message,
      parse_mode: 'HTML',
    }),
  })

  const result = await resp.json()
  if (!result.ok) throw new Error(result.description || '텔레그램 전송 실패')
  return result
}
