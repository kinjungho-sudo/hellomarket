// admin/orders.js — 주문 관리 페이지 스크립트
import { requireAdminAuth, adminLogout } from '/js/utils/admin-auth.js'
import { supabase } from '/js/config.js'
import { getAllOrders, updateOrderStatus } from '/js/api/orders.js'

requireAdminAuth()

try {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const el = document.getElementById('admin-user-name')
    if (el) el.textContent = user.email
  }
} catch (e) { console.error('[orders] 유저 정보 조회 실패:', e) }

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  adminLogout(); window.location.href = '/admin/login.html'
})
document.getElementById('menu-toggle')?.addEventListener('click', () => {
  document.getElementById('admin-sidebar')?.classList.toggle('open')
  document.getElementById('sidebar-overlay')?.classList.toggle('active')
})
document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
  document.getElementById('admin-sidebar')?.classList.remove('open')
  document.getElementById('sidebar-overlay')?.classList.remove('active')
})

const fmt = (n) => (n ?? 0).toLocaleString('ko-KR')

let currentStatus = ''
let guestOnly = false   // 비회원 필터
let currentPage = 1
const PAGE_SIZE = 20
let currentOrderId = null

const STATUS_CLASS = {
  '주문완료': 'status-pending',
  '결제완료': 'status-shipping',
  '배송준비': 'status-shipping',
  '배송중':   'status-shipping',
  '배송완료': 'status-complete',
  '취소':     'status-cancel',
}

/**
 * 택배사별 배송조회 URL 반환
 * @param {string} carrier - 택배사명
 * @param {string} trackingNo - 운송장 번호
 * @returns {string} 배송조회 URL
 */
function getTrackingUrl(carrier, trackingNo) {
  const no = encodeURIComponent(trackingNo)
  switch (carrier) {
    case 'CJ대한통운':
      return `https://trace.cjlogistics.com/next/tracking.html?wblNo=${no}`
    case '롯데택배':
      return `https://www.lotteglogis.com/open/tracking?invno=${no}`
    case '한진택배':
      return `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText=${no}`
    case '우체국택배':
      return `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${no}`
    default:
      // 기타 / 로젠택배 / 편의점택배 → 통합 조회 사이트
      return `https://www.tracker.delivery/#kr-epost/${no}`
  }
}

async function initPage() {
  await loadOrders()
  setupEventListeners()
}

async function loadOrders() {
  const tbody = document.getElementById('orders-body')
  if (!tbody) return
  tbody.textContent = ''

  try {
    const search    = document.getElementById('filter-search')?.value?.trim()
    const startDate = document.getElementById('filter-start')?.value
    const endDate   = document.getElementById('filter-end')?.value

    const result = await getAllOrders({
      status:    currentStatus || undefined,
      search:    search || undefined,
      startDate: startDate || undefined,
      endDate:   endDate ? endDate + 'T23:59:59' : undefined,
      guestOnly: guestOnly || undefined,
      limit:     PAGE_SIZE,
      offset:    (currentPage - 1) * PAGE_SIZE,
    })
    if (result.error) throw new Error(result.error)
    const orders = result.data ?? []

    if (orders.length === 0) {
      const tr = tbody.insertRow()
      const td = tr.insertCell()
      td.colSpan = 7
      td.textContent = '주문이 없습니다.'
      td.style.cssText = 'text-align:center; padding:40px; color:var(--color-text-light)'
      return
    }

    orders.forEach(function(o) {
      const items = o.hgm_order_items ?? []
      const itemSummary = items.length > 0
        ? items[0].product_name + (items.length > 1 ? ' 외 ' + (items.length - 1) + '건' : '')
        : '—'
      const orderDate = new Date(o.created_at).toLocaleString('ko-KR', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })

      // 주문자 표시: 비회원이면 [비회원] 뱃지
      const ordererDisplay = o.is_guest
        ? (o.orderer_name || o.receiver_name || '—')
        : (o.receiver_name || '—')

      const tr = tbody.insertRow()

      // 주문번호
      const tdNum = tr.insertCell()
      const numLink = document.createElement('a')
      numLink.href = '#'
      numLink.textContent = o.order_number ?? '—'
      numLink.style.cssText = 'color:var(--color-primary); font-weight:600; font-size:13px;'
      numLink.addEventListener('click', function(e) { e.preventDefault(); openOrderDetail(o) })
      tdNum.appendChild(numLink)

      // 주문자 (비회원 뱃지)
      const tdName = tr.insertCell()
      tdName.textContent = ordererDisplay
      if (o.is_guest) {
        const badge = document.createElement('span')
        badge.textContent = '비회원'
        badge.style.cssText = 'margin-left:4px; font-size:10px; font-weight:700; color:#fff; background:#999; border-radius:4px; padding:1px 5px; vertical-align:middle;'
        tdName.appendChild(badge)
      }

      const tdItem  = tr.insertCell(); tdItem.textContent = itemSummary; tdItem.style.fontSize = '13px'
      const tdAmt   = tr.insertCell(); tdAmt.textContent  = fmt(o.total_price) + '원'

      const tdStatus = tr.insertCell()
      const badge = document.createElement('span')
      badge.className = 'status-badge ' + (STATUS_CLASS[o.status] ?? 'status-pending')
      badge.textContent = o.status ?? '—'
      tdStatus.appendChild(badge)

      const tdDate = tr.insertCell(); tdDate.textContent = orderDate; tdDate.style.fontSize = '12px'

      // 인라인 상태 변경 select
      const tdAction = tr.insertCell()
      const sel = document.createElement('select')
      sel.className = 'admin-input'
      sel.style.cssText = 'height:30px; font-size:12px; width:90px;'
      ;['주문완료','결제완료','배송준비','배송중','배송완료','취소'].forEach(function(s) {
        const opt = document.createElement('option')
        opt.value = s; opt.textContent = s
        if (s === o.status) opt.selected = true
        sel.appendChild(opt)
      })
      sel.addEventListener('change', async function() {
        try {
          const r = await updateOrderStatus(o.id, sel.value)
          if (r.error) throw new Error(r.error)
          badge.className = 'status-badge ' + (STATUS_CLASS[sel.value] ?? 'status-pending')
          badge.textContent = sel.value
        } catch (err) {
          console.error('[orders] 상태 변경 실패:', err)
          alert('상태 변경 실패: ' + err.message)
          sel.value = o.status
        }
      })
      tdAction.appendChild(sel)
    })
  } catch (err) {
    console.error('[orders] 주문 로딩 실패:', err)
    tbody.textContent = ''
    const tr = tbody.insertRow(); const td = tr.insertCell()
    td.colSpan = 7; td.textContent = '데이터 로딩 실패'
    td.style.cssText = 'text-align:center; padding:40px; color:var(--color-danger)'
  }
}

function openOrderDetail(order) {
  currentOrderId = order.id
  const contentEl = document.getElementById('order-detail-content')
  if (!contentEl) return
  contentEl.textContent = ''

  const items = order.hgm_order_items ?? []

  function makeRow(label, value, highlight) {
    const row = document.createElement('div')
    row.className = 'order-detail-row'
    const lbl = document.createElement('span')
    lbl.className = 'order-detail-label'
    lbl.textContent = label
    const val = document.createElement('span')
    val.textContent = value ?? '—'
    if (highlight) val.style.cssText = 'font-weight:700; color:var(--color-primary);'
    row.appendChild(lbl); row.appendChild(val)
    return row
  }

  function makeSectionTitle(text) {
    const el = document.createElement('div')
    el.style.cssText = 'font-size:12px; font-weight:800; color:var(--color-text-light); letter-spacing:0.06em; text-transform:uppercase; margin:16px 0 6px;'
    el.textContent = text
    return el
  }

  // 주문 기본 정보
  contentEl.appendChild(makeSectionTitle('주문 정보'))
  contentEl.appendChild(makeRow('주문번호', order.order_number, true))
  contentEl.appendChild(makeRow('총 결제금액', fmt(order.total_price) + '원', true))
  contentEl.appendChild(makeRow('결제 수단', order.payment_method || '—'))
  contentEl.appendChild(makeRow('결제 상태', order.payment_status || '—'))

  // 주문자 정보 (비회원/회원 구분)
  contentEl.appendChild(makeSectionTitle(order.is_guest ? '주문자 정보 (비회원)' : '주문자 정보'))
  if (order.is_guest) {
    const guestBadge = document.createElement('div')
    guestBadge.style.cssText = 'display:inline-block; font-size:11px; font-weight:700; color:#fff; background:#888; border-radius:4px; padding:2px 8px; margin-bottom:8px;'
    guestBadge.textContent = '비회원 주문'
    contentEl.appendChild(guestBadge)
  }
  contentEl.appendChild(makeRow('주문자 이름', order.orderer_name || order.receiver_name))
  if (order.orderer_email) {
    contentEl.appendChild(makeRow('주문자 이메일', order.orderer_email))
  }

  // 배송지 정보
  contentEl.appendChild(makeSectionTitle('배송지 정보'))
  contentEl.appendChild(makeRow('받는 분', order.receiver_name))
  contentEl.appendChild(makeRow('연락처', order.receiver_phone))
  contentEl.appendChild(makeRow('주소', (order.address ?? '') + (order.address_detail ? ' ' + order.address_detail : '')))
  contentEl.appendChild(makeRow('우편번호', order.zipcode))
  contentEl.appendChild(makeRow('배송 메모', order.delivery_memo || '없음'))

  // 주문 상품
  if (items.length > 0) {
    contentEl.appendChild(makeSectionTitle('주문 상품'))
    items.forEach(function(item) {
      contentEl.appendChild(makeRow(
        item.product_name,
        item.quantity + '개 × ' + fmt(item.price) + '원 = ' + fmt(item.quantity * item.price) + '원'
      ))
    })
  }

  // 현재 상태 select 반영
  const sel = document.getElementById('order-status-select')
  if (sel) sel.value = order.status

  // 운송장 번호 및 택배사 복원
  const trackingInput = document.getElementById('tracking-number-input')
  const carrierSelect = document.getElementById('carrier-select')
  const trackingLinkArea = document.getElementById('tracking-link-area')
  const trackingLink = document.getElementById('tracking-link')

  let savedCarrier = ''
  let savedTracking = ''

  if (order.tracking_number) {
    // "택배사:운송장번호" 형식 파싱
    const parts = order.tracking_number.split(':')
    if (parts.length >= 2) {
      savedCarrier = parts[0]
      savedTracking = parts.slice(1).join(':')
    } else {
      savedTracking = order.tracking_number
    }
  }

  if (trackingInput) trackingInput.value = savedTracking
  if (carrierSelect) carrierSelect.value = savedCarrier

  // 기존 운송장이 있으면 배송조회 링크 표시
  if (savedTracking) {
    const url = getTrackingUrl(savedCarrier, savedTracking)
    if (trackingLink) { trackingLink.href = url }
    if (trackingLinkArea) trackingLinkArea.style.display = 'block'
  } else {
    if (trackingLinkArea) trackingLinkArea.style.display = 'none'
  }

  document.getElementById('order-modal')?.classList.add('open')
}

function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      if (btn.dataset.guest === '1') {
        // 비회원 필터: 상태 필터 초기화
        guestOnly = true
        currentStatus = ''
      } else {
        guestOnly = false
        currentStatus = btn.dataset.status ?? ''
      }
      currentPage = 1
      loadOrders()
    })
  })

  document.getElementById('btn-filter')?.addEventListener('click', function() {
    currentPage = 1; loadOrders()
  })
  document.getElementById('filter-search')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { currentPage = 1; loadOrders() }
  })

  document.getElementById('btn-order-modal-close')?.addEventListener('click', function() {
    document.getElementById('order-modal')?.classList.remove('open')
  })

  document.getElementById('btn-order-status-save')?.addEventListener('click', async function() {
    if (!currentOrderId) return
    const sel = document.getElementById('order-status-select')
    if (!sel) return

    const trackingInput = document.getElementById('tracking-number-input')
    const carrierSelect = document.getElementById('carrier-select')
    const trackingLinkArea = document.getElementById('tracking-link-area')
    const trackingLink = document.getElementById('tracking-link')

    const trackingNumber = trackingInput?.value?.trim() ?? ''
    const carrier = carrierSelect?.value ?? ''

    // 운송장 번호가 입력됐으면 상태를 자동으로 "배송중"으로 변경
    let newStatus = sel.value
    if (trackingNumber && newStatus !== '배송완료' && newStatus !== '취소') {
      newStatus = '배송중'
      sel.value = '배송중'
    }

    // 운송장 번호를 "택배사:번호" 형식으로 합쳐서 저장
    const trackingValue = trackingNumber
      ? (carrier ? carrier + ':' + trackingNumber : trackingNumber)
      : null

    try {
      // 주문 상태 업데이트
      const result = await updateOrderStatus(currentOrderId, newStatus)
      if (result.error) throw new Error(result.error)

      // 운송장 번호 저장 (tracking_number 컬럼)
      if (trackingValue !== null) {
        const { error: trackingError } = await supabase
          .from('hgm_orders')
          .update({ tracking_number: trackingValue, shipped_at: new Date().toISOString() })
          .eq('id', currentOrderId)
        if (trackingError) throw new Error(trackingError.message)

        // 배송조회 링크 갱신
        const url = getTrackingUrl(carrier, trackingNumber)
        if (trackingLink) { trackingLink.href = url }
        if (trackingLinkArea) trackingLinkArea.style.display = 'block'
      }

      document.getElementById('order-modal')?.classList.remove('open')
      await loadOrders()
    } catch (err) {
      console.error('[orders] 주문 상태 저장 실패:', err)
      alert('상태 저장 실패: ' + err.message)
    }
  })

  document.getElementById('order-modal')?.addEventListener('click', function(e) {
    if (e.target === this) document.getElementById('order-modal')?.classList.remove('open')
  })
}

initPage()
