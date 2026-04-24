// Vercel Serverless Function — 신상 입고 알림 이메일 발송
// POST /api/send-notify
// Body: { post: { title, content, image_url }, notifyType: 'notify_new' | 'notify_sale' }

import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'nodejs' }

const RESEND_API_KEY   = process.env.RESEND_API_KEY
const FROM_EMAIL       = 'onboarding@resend.dev'
const SUPABASE_URL     = process.env.SUPABASE_URL || 'https://gqynptpjomcqzxyykqic.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // CORS
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
  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' })
  }

  try {
    const { post, notifyType = 'notify_new' } = req.body || {}
    if (!post || !post.title) {
      return res.status(400).json({ error: 'post.title이 필요합니다.' })
    }

    // Service Role 키로 Supabase 접근 (RLS 우회)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 알림 수신 동의 회원 목록 조회
    const { data: users, error: usersError } = await supabase
      .from('hgm_users')
      .select('id, name, email')
      .eq(notifyType, true)
      .not('email', 'is', null)

    if (usersError) throw new Error('회원 목록 조회 실패: ' + usersError.message)
    if (!users || users.length === 0) {
      return res.status(200).json({ success: true, sent: 0, message: '알림 수신 동의 회원 없음' })
    }

    // 이메일 HTML 템플릿 생성
    function makeEmailHtml(userName, post) {
      const contentPreview = (post.content || '').slice(0, 200)
      const imageBlock = post.image_url
        ? `<img src="${post.image_url}" alt="입고 이미지" style="width:100%;max-width:480px;border-radius:12px;margin:16px 0;" />`
        : ''
      return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#faf7f0;font-family:'Apple SD Gothic Neo',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

        <!-- 헤더 -->
        <tr><td style="background:linear-gradient(135deg,#1a3d28,#2d5a3d);padding:32px 36px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">🌿</div>
          <div style="color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.03em;">헬로우가든마켓</div>
          <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;">Hello Garden Market</div>
        </td></tr>

        <!-- 본문 -->
        <tr><td style="padding:32px 36px;">
          <p style="color:#666;font-size:15px;margin:0 0 8px;">안녕하세요, ${userName}님 👋</p>
          <h2 style="color:#2d5a3d;font-size:20px;font-weight:900;margin:0 0 20px;letter-spacing:-0.03em;">
            새로운 식물이 입고되었어요! 🌱
          </h2>

          <div style="background:#f5f0e8;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
            <div style="font-size:16px;font-weight:800;color:#2c2c2c;margin-bottom:8px;">${post.title}</div>
            ${imageBlock}
            ${contentPreview ? `<p style="color:#666;font-size:14px;line-height:1.7;margin:0;">${contentPreview}${post.content && post.content.length > 200 ? '...' : ''}</p>` : ''}
          </div>

          <div style="text-align:center;margin-top:24px;">
            <a href="https://hellowgardenmarket.vercel.app/new.html"
               style="display:inline-block;background:#2d5a3d;color:#fff;font-size:15px;font-weight:800;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:-0.02em;">
              입고 소식 보러가기 →
            </a>
          </div>
        </td></tr>

        <!-- 푸터 -->
        <tr><td style="background:#f5f0e8;padding:20px 36px;text-align:center;border-top:1px solid rgba(0,0,0,0.06);">
          <p style="color:#999;font-size:12px;margin:0 0 6px;">
            헬로우가든마켓 · 신상 입고 알림 수신에 동의하셨습니다.
          </p>
          <p style="color:#bbb;font-size:11px;margin:0;">
            마이페이지 → 알림 설정에서 수신을 해제할 수 있습니다.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
    }

    // Resend로 이메일 발송 (순차 처리, 실패해도 계속 진행)
    let sentCount = 0
    const errors = []

    for (const user of users) {
      if (!user.email) continue
      const userName = user.name || user.email.split('@')[0]

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `Hello Garden Market <${FROM_EMAIL}>`,
            to: [user.email],
            subject: `[Hello Garden Market] ${post.title}`,
            html: makeEmailHtml(userName, post),
          }),
        })

        const result = await response.json()
        if (!response.ok) {
          errors.push({ email: user.email, error: result.message || '발송 실패' })
        } else {
          sentCount++
        }
      } catch (err) {
        errors.push({ email: user.email, error: err.message })
      }
    }

    return res.status(200).json({
      success: true,
      total: users.length,
      sent: sentCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('[send-notify] 오류:', err)
    return res.status(500).json({ error: err.message })
  }
}
