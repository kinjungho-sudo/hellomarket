// admin/orders.js — 주문 관리 페이지 스크립트
import { requireAdmin, signOut } from '/js/auth.js'
import { supabase } from '/js/config.js'
import { getAllOrders, updateOrderStatus } from '/js/api/orders.js'

// 관리자 접근 제어
await requireAdmin()

try {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const el = document.getElementById('admin-user-name')
    if (el) el.textContent = user.email
  }
} catch (e) { console.error('[orders] 유저 정보 조회 실패:', e) }

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  await signOut(); window.location.href = '/login.html'
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

// 현재 필터 상태
let currentStatus = ''
let currentPage = 1
const PAGE_SIZE = 20

// 현재 열려있는 주문 ID
let currentOrderId = null

// 상태 뱃지 클래스 매핑
const STATUS_CLASS = {
  '주문완료': 'status-pending',
  '결제완료': 'status-shipping',
  '배송준비': 'status-shipping',
  '배송중':   'status-shipping',
  '배송완료': 'status-complete',
  '취소':     'status-cancel',
}

async function initPage() {
  await loadOrders()
  setupEventListeners()
}

// 주문 목록 로드
async function loadOrders() {
  const tbody = document.getElementById('orders-body')
  if (!tbody) return
  tbody.textContent = ''

  try {
    const search = document.getElementById('filter-search')?.value?.trim()
    const startDate = document.getElementById('filter-start')?.value
    const endDate = document.getElementById('filter-end')?.value

    const result = await getAllOrders({
      status: currentStatus || undefined,
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate ? endDate + 'T23:59:59' : undefined,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    })
    if (result.error) throw new Error(result.error)
    const orders = result.data ?? []

    if (orders.length === 0) {
      const tr = tbody.insertRow(); const td = tr.insertCell()
      td.colSpan = 7; td.textContent = '주문이 없습니다.'
      td.style.cssText = 'text-align:center; padding:40px; color:var(--color-text-light)'
      return
    }

    orders.forEach(function(o) {
      const items = o.hgm_order_items ?? []
      const itemSummary = items.length > 0
        ? items[0].product_name + (items.length > 1 ? ' 외 ' + (items.length-1) + '건' : '')
        : '—'
      const orderDate = new Date(o.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

      const tr = tbody.insertRow()

      // 주문번호 (클릭 시 상세 모달)
      const tdNum = tr.insertCell()
      const numLink = document.createElement('a')
      numLink.href = '#'; numLink.textContent = o.order_number ?? '—'
      numLink.style.cssText = 'color:var(--color-primary); font-weight:600; font-size:13px;'
      numLink.addEventListener('click', function(e) { e.preventDefault(); openOrderDetail(o) })
      tdNum.appendChild(numLink)

      const tdName = tr.insertCell(); tdName.textContent = o.receiver_name ?? '—'
      const tdItem = tr.insertCell(); tdItem.textContent = itemSummary; tdItem.style.fontSize = '13px'
      const tdAmt = tr.insertCell(); tdAmt.textContent = fmt(o.total_amount) + '원'

      const tdStatus = tr.insertCell()
      const badge = document.createElement('span')
      badge.className = 'status-badge ' + (STATUS_CLASS[o.status] ?? 'status-pending')
      badge.textContent = o.status ?? '—'
      tdStatus.appendChild(badge)

      const tdDate = tr.insertCell(); tdDate.textContent = orderDate; tdDate.style.fontSize = '12px'

      // 상태 변경 select
      const tdAction = tr.insertCell()
      const sel = document.createElement('select')
      sel.className = 'admin-input'
      sel.style.cssText = 'height:30px; font-size:12px; width:90px;'
      const statusOptions = ['주문완료','결제완료','배송준비','배송중','배송완료','취소']
      statusOptions.forEach(function(s) {
        const opt = document.createElement('option')
        opt.value = s; opt.textContent = s
        if (s === o.status) opt.selected = true
        sel.appendChild(opt)
      })
      sel.addEventListener('change', async function() {
        try {
          const result = await updateOrderStatus(o.id, sel.value)
          if (result.error) throw new Error(result.error)
          // 뱃지 즉시 업데이트
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

// 주문 상세 모달 열기
function openOrderDetail(order) {
  currentOrderId = order.id
  const contentEl = document.getElementById('order-detail-content')
  if (!contentEl) return

  contentEl.textContent = ''

  const items = order.hgm_order_items ?? []

  // 주문 정보 행 생성 헬퍼
  function makeRow(label, value) {
    const row = document.createElement('div')
    row.className = 'order-detail-row'
    const lbl = document.createElement('span')
    lbl.className = 'order-detail-label'; lbl.textContent = label
    const val = document.createElement('span'); val.textContent = value ?? '—'
    row.appendChild(lbl); row.appendChild(val)
    return row
  }

  contentEl.appendChild(makeRow('주문번호', order.order_number))
  contentEl.appendChild(makeRow('주문자', order.receiver_name))
  contentEl.appendChild(makeRow('연락처', order.receiver_phone))
  contentEl.appendChild(makeRow('배송지', (order.receiver_address ?? '') + ' ' + (order.receiver_address_detail ?? '')))
  contentEl.appendChild(makeRow('우편번호', order.receiver_zipcode))
  contentEl.appendChild(makeRow('배송메모', order.delivery_memo || '없음'))
  contentEl.appendChild(makeRow('총 결제금액', fmt(order.total_amount) + '원'))

  // 주문 상품 목록
  if (items.length > 0) {
    const heading = document.createElement('div')
    heading.style.cssText = 'font-size:13px; font-weight:700; margin: 12px 0 8px;'
    heading.textContent = '주문 상품'
    contentEl.appendChild(heading)
    items.forEach(function(item) {
      const row = makeRow(item.product_name, item.quantity + '개 × ' + fmt(item.price) + '원')
      contentEl.appendChild(row)
    })
  }

  // 현재 상태 select에 반영
  const sel = document.getElementById('order-status-select')
  if (sel) sel.value = order.status

  document.getElementById('order-modal')?.classList.add('open')
}

function setupEventListeners() {
  // 탭 클릭
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      currentStatus = btn.dataset.status ?? ''
      currentPage = 1
      loadOrders()
    })
  })

  // 검색 버튼
  document.getElementById('btn-filter')?.addEventListener('click', function() {
    currentPage = 1; loadOrders()
  })

  // 주문 상세 모달 닫기
  document.getElementById('btn-order-modal-close')?.addEventListener('click', function() {
    document.getElementById('order-modal')?.classList.remove('open')
  })

  // 주문 상태 저장 버튼
  document.getElementById('btn-order-status-save')?.addEventListener('click', async function() {
    if (!currentOrderId) return
    const sel = document.getElementById('order-status-select')
    if (!sel) return
    try {
      const result = await updateOrderStatus(currentOrderId, sel.value)
      if (result.error) throw new Error(result.error)
      document.getElementById('order-modal')?.classList.remove('open')
      await loadOrders()
    } catch (err) {
      console.error('[orders] 주문 상태 저장 실패:', err)
      alert('상태 저장 실패: ' + err.message)
    }
  })

  // 모달 바깥 클릭
  document.getElementById('order-modal')?.addEventListener('click', function(e) {
    if (e.target === this) document.getElementById('order-modal')?.classList.remove('open')
  })
}

initPage()
