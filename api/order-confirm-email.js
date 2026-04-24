// Vercel Serverless Function — 주문 완료 이메일 발송
// POST /api/order-confirm-email
// Body: { order: { order_number, total_price, receiver_name, address, items, ... }, toEmail: string }

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = 'onboarding@resend.dev'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY가 설정되지 않았습니다.' })
  }

  try {
    const { order, toEmail } = req.body || {}
    if (!order || !toEmail) {
      return res.status(400).json({ error: 'order와 toEmail이 필요합니다.' })
    }

    const html = makeOrderEmailHtml(order)

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Hello Garden Market <${FROM_EMAIL}>`,
        to: [toEmail],
        subject: `[Hello Garden Market] Order Confirmed - ${order.order_number}`,
        html,
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      return res.status(500).json({ error: result.message || '이메일 발송 실패' })
    }

    return res.status(200).json({ success: true, id: result.id })
  } catch (err) {
    console.error('[order-confirm-email] 오류:', err)
    return res.status(500).json({ error: err.message })
  }
}

function makeOrderEmailHtml(order) {
  const fmt = (n) => Number(n || 0).toLocaleString('ko-KR')
  const items = order.items || order.hgm_order_items || []

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid #f0ebe0; font-size:14px; color:#2c2c2c;">${item.product_name || '상품'}</td>
      <td style="padding:10px 0; border-bottom:1px solid #f0ebe0; font-size:14px; color:#666; text-align:center;">${item.quantity}개</td>
      <td style="padding:10px 0; border-bottom:1px solid #f0ebe0; font-size:14px; color:#2c2c2c; text-align:right; font-weight:700;">${fmt(item.price * item.quantity)}원</td>
    </tr>
  `).join('')

  const fullAddress = [order.address, order.address_detail].filter(Boolean).join(' ')
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#faf7f0;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

        <!-- 헤더 -->
        <tr><td style="background:linear-gradient(135deg,#1a3d28,#2d5a3d);padding:32px 36px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">🌿</div>
          <div style="color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.03em;">Hello Garden Market</div>
          <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;">헬로우가든마켓</div>
        </td></tr>

        <!-- 주문 완료 메시지 -->
        <tr><td style="padding:32px 36px 0;">
          <h2 style="color:#2d5a3d;font-size:20px;font-weight:900;margin:0 0 8px;letter-spacing:-0.03em;">
            주문이 완료되었습니다! 🎉
          </h2>
          <p style="color:#666;font-size:14px;margin:0 0 24px;line-height:1.7;">
            ${order.receiver_name || '고객'}님, 주문해주셔서 감사합니다.<br>
            주문 내역을 확인해보세요.
          </p>

          <!-- 주문 번호 -->
          <div style="background:#f5f0e8;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
            <div style="font-size:12px;color:#999;margin-bottom:4px;">주문번호</div>
            <div style="font-size:16px;font-weight:900;color:#2d5a3d;letter-spacing:0.02em;">${order.order_number}</div>
            <div style="font-size:12px;color:#999;margin-top:4px;">${orderDate}</div>
          </div>

          <!-- 주문 상품 -->
          <div style="margin-bottom:24px;">
            <div style="font-size:13px;font-weight:800;color:#2c2c2c;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">주문 상품</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr>
                  <th style="font-size:12px;color:#999;font-weight:600;text-align:left;padding-bottom:8px;border-bottom:2px solid #f0ebe0;">상품명</th>
                  <th style="font-size:12px;color:#999;font-weight:600;text-align:center;padding-bottom:8px;border-bottom:2px solid #f0ebe0;">수량</th>
                  <th style="font-size:12px;color:#999;font-weight:600;text-align:right;padding-bottom:8px;border-bottom:2px solid #f0ebe0;">금액</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <div style="text-align:right;padding-top:12px;font-size:16px;font-weight:900;color:#2d5a3d;">
              총 ${fmt(order.total_price)}원
            </div>
          </div>

          <!-- 배송 정보 -->
          <div style="background:#f5f0e8;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <div style="font-size:13px;font-weight:800;color:#2c2c2c;margin-bottom:12px;">배송 정보</div>
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr><td style="font-size:13px;color:#999;padding:3px 0;width:70px;">받는 분</td><td style="font-size:13px;color:#2c2c2c;font-weight:600;">${order.receiver_name || '—'}</td></tr>
              <tr><td style="font-size:13px;color:#999;padding:3px 0;">연락처</td><td style="font-size:13px;color:#2c2c2c;">${order.receiver_phone || '—'}</td></tr>
              <tr><td style="font-size:13px;color:#999;padding:3px 0;">주소</td><td style="font-size:13px;color:#2c2c2c;">${fullAddress || '—'}</td></tr>
              ${order.delivery_memo ? `<tr><td style="font-size:13px;color:#999;padding:3px 0;">배송 메모</td><td style="font-size:13px;color:#2c2c2c;">${order.delivery_memo}</td></tr>` : ''}
            </table>
          </div>

          <!-- CTA -->
          <div style="text-align:center;margin-bottom:32px;">
            <a href="https://hellowgardenmarket.vercel.app/mypage.html"
               style="display:inline-block;background:#2d5a3d;color:#fff;font-size:14px;font-weight:800;padding:13px 28px;border-radius:10px;text-decoration:none;">
              주문 내역 확인하기 →
            </a>
          </div>
        </td></tr>

        <!-- 푸터 -->
        <tr><td style="background:#f5f0e8;padding:20px 36px;text-align:center;border-top:1px solid rgba(0,0,0,0.06);">
          <p style="color:#999;font-size:12px;margin:0 0 4px;">헬로우가든마켓 · 식물과 함께하는 일상</p>
          <p style="color:#bbb;font-size:11px;margin:0;">문의사항은 마이페이지 → 묻고 답하기를 이용해주세요.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
