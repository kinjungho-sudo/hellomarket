// Vercel Serverless Function — TossPayments 결제 검증 + 주문 저장
// POST /api/confirm-payment
// Body: { paymentKey, orderId, amount, orderData }
//   orderData: { userId, items, receiverInfo }

import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'nodejs' }

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gqynptpjomcqzxyykqic.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function generateOrderNumber() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 900) + 100)
  return `HGM-${y}${m}${d}-${rand}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { paymentKey, orderId, amount, orderData } = req.body || {}

  if (!paymentKey || !orderId || !amount || !orderData) {
    return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' })
  }

  // 1. TossPayments 서버 측 결제 승인 요청
  const encoded = Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')
  let tossResult
  try {
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
    tossResult = await tossRes.json()
    if (!tossRes.ok) {
      console.error('[confirm-payment] TossPayments 승인 실패:', tossResult)
      return res.status(400).json({ error: tossResult.message || '결제 승인에 실패했습니다.' })
    }
  } catch (err) {
    console.error('[confirm-payment] TossPayments 요청 오류:', err)
    return res.status(500).json({ error: '결제 서버 통신 오류가 발생했습니다.' })
  }

  // 2. Supabase에 주문 저장 (service role key로 RLS 우회)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { userId, items, receiverInfo } = orderData
  const orderNumber = generateOrderNumber()

  try {
    const { data: order, error: orderErr } = await supabase
      .from('hgm_orders')
      .insert([{
        order_number: orderNumber,
        user_id: userId,
        total_amount: amount,
        status: 'confirmed',
        receiver_name: receiverInfo.name,
        receiver_phone: receiverInfo.phone,
        receiver_address: receiverInfo.address,
        receiver_address_detail: receiverInfo.addressDetail || '',
        receiver_zipcode: receiverInfo.zipcode,
        delivery_memo: receiverInfo.deliveryMemo || '',
        payment_key: tossResult.paymentKey,
        payment_method: tossResult.method,
      }])
      .select()
      .single()

    if (orderErr) throw orderErr

    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      price: item.price,
    }))

    const { error: itemsErr } = await supabase.from('hgm_order_items').insert(orderItems)
    if (itemsErr) throw itemsErr

    return res.status(200).json({
      success: true,
      orderNumber,
      orderId: order.id,
      amount,
      paymentMethod: tossResult.method,
    })
  } catch (err) {
    console.error('[confirm-payment] 주문 저장 실패:', err)
    // 결제는 됐으나 DB 저장 실패 → 관리자 알림 필요 (토스 paymentKey 기록)
    return res.status(500).json({
      error: '주문 저장 중 오류가 발생했습니다. 고객센터로 문의해 주세요.',
      paymentKey: tossResult.paymentKey,
    })
  }
}
