// admin/dashboard.js — 대시보드 페이지 스크립트
import { requireAdminAuth, adminLogout } from '/js/utils/admin-auth.js'
import { supabase } from '/js/config.js'
import { getOrderStats, getAllOrders } from '/js/api/orders.js'
import { getUserCount } from '/js/api/users.js'
import { getTodayVisitors, getWeeklyRevenueStats, getCategoryStats, getHourlyOrderStats, getProductSalesStats } from '/js/api/analytics.js'
import { getQnaList } from '/js/api/qna.js'

// 관리자 접근 제어 — 비인증/비허가 UID 시 admin/login.html로 리다이렉트
await requireAdminAuth()

// 로그아웃 버튼
document.getElementById('btn-logout')?.addEventListener('click', async () => {
  await adminLogout()
})

// 모바일 사이드바 토글
document.getElementById('menu-toggle')?.addEventListener('click', () => {
  document.getElementById('admin-sidebar')?.classList.toggle('open')
  document.getElementById('sidebar-overlay')?.classList.toggle('active')
})
document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
  document.getElementById('admin-sidebar')?.classList.remove('open')
  document.getElementById('sidebar-overlay')?.classList.remove('active')
})

// 숫자 포맷 헬퍼
const fmt = (n) => (n ?? 0).toLocaleString('ko-KR')

// 주문 상태 뱃지 클래스 매핑
const STATUS_CLASS = {
  '주문완료': 'status-pending',
  '결제완료': 'status-shipping',
  '배송준비': 'status-shipping',
  '배송중':   'status-shipping',
  '배송완료': 'status-complete',
  '취소':     'status-cancel',
}

// 텍스트 안전 업데이트 (XSS 방지)
function setText(id, text) {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}

// 메인 초기화 — 병렬로 모든 데이터 로드
async function initPage() {
  await Promise.all([loadStats(), loadCharts(), loadRecentOrders(), loadOutOfStock(), loadProductSales()])
}

// 통계 카드 렌더링
async function loadStats() {
  try {
    const stats = await getOrderStats()
    if (!stats.error) {
      setText('today-orders', fmt(stats.today?.count))
      setText('today-revenue', fmt(stats.today?.revenue) + '원')
      setText('month-orders', fmt(stats.month?.count))
      setText('month-revenue', fmt(stats.month?.revenue) + '원')
    }
    const userCount = await getUserCount()
    if (typeof userCount === 'number') setText('total-users', fmt(userCount))
    const visitors = await getTodayVisitors()
    if (typeof visitors === 'number') setText('today-visitors', fmt(visitors))
    const qnaResult = await getQnaList({ limit: 100 })
    if (!qnaResult.error && qnaResult.data) {
      setText('unanswered-qna', qnaResult.data.filter(q => !q.is_answered).length)
    }
  } catch (err) { console.error('[dashboard] 통계 로딩 실패:', err) }
}

// Chart.js 차트 렌더링
async function loadCharts() {
  try {
    // 시간대별 주문 바 차트
    const hourly = await getHourlyOrderStats()
    if (!hourly.error && Array.isArray(hourly)) {
      const ctx = document.getElementById('chart-hourly')
      if (ctx && window.Chart) {
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: hourly.map(h => h.hour + '시'),
            datasets: [{ label: '주문 건수', data: hourly.map(h => h.count), backgroundColor: 'rgba(76,121,75,0.7)', borderRadius: 4 }]
          },
          options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        })
      }
    }
    // 카테고리별 판매량 도넛 차트
    const catStats = await getCategoryStats()
    if (!catStats.error && Array.isArray(catStats) && catStats.length > 0) {
      const ctx = document.getElementById('chart-category')
      if (ctx && window.Chart) {
        const colors = ['#4c794b','#6aaa69','#8ec58d','#b3d9b2','#d8edda','#2d5a2c','#a8c5a0','#3e6b3d']
        new Chart(ctx, {
          type: 'doughnut',
          data: { labels: catStats.map(c => c.category), datasets: [{ data: catStats.map(c => c.count), backgroundColor: colors.slice(0, catStats.length), borderWidth: 2, borderColor: '#fff' }] },
          options: { responsive: true, plugins: { legend: { position: 'right' } } }
        })
      }
    }
    // 최근 7일 매출 라인 차트
    const weekly = await getWeeklyRevenueStats()
    if (!weekly.error && Array.isArray(weekly)) {
      const ctx = document.getElementById('chart-weekly')
      if (ctx && window.Chart) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: weekly.map(d => { const dt = new Date(d.date); return (dt.getMonth()+1) + '/' + dt.getDate() }),
            datasets: [{ label: '매출', data: weekly.map(d => d.revenue), borderColor: '#4c794b', backgroundColor: 'rgba(76,121,75,0.1)', borderWidth: 2, tension: 0.4, fill: true, pointBackgroundColor: '#4c794b' }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: function(v) { return (v/10000).toFixed(0) + '만' } } } }
          }
        })
      }
    }
  } catch (err) { console.error('[dashboard] 차트 렌더링 실패:', err) }
}

// 최근 주문 테이블 렌더링 (DOM API 사용 — XSS 방지)
async function loadRecentOrders() {
  const tbody = document.getElementById('recent-orders-body')
  if (!tbody) return
  try {
    const result = await getAllOrders({ limit: 10 })
    const orders = result.data ?? []
    tbody.textContent = ''
    if (orders.length === 0) {
      const tr = tbody.insertRow()
      const td = tr.insertCell()
      td.colSpan = 6
      td.textContent = '주문이 없습니다.'
      td.style.cssText = 'text-align:center; padding:32px; color:var(--color-text-light)'
      return
    }
    orders.forEach(function(o) {
      const items = o.hgm_order_items ?? []
      const itemSummary = items.length > 0
        ? items[0].product_name + (items.length > 1 ? ' 외 ' + (items.length-1) + '건' : '')
        : '—'
      const orderDate = new Date(o.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      const tr = tbody.insertRow()
      const c0 = tr.insertCell(); c0.textContent = o.order_number ?? '—'; c0.style.fontWeight = '600'
      const c1 = tr.insertCell(); c1.textContent = o.receiver_name ?? '—'
      const c2 = tr.insertCell(); c2.textContent = itemSummary
      const c3 = tr.insertCell(); c3.textContent = fmt(o.total_price) + '원'
      const c4 = tr.insertCell()
      const badge = document.createElement('span')
      badge.className = 'status-badge ' + (STATUS_CLASS[o.status] ?? 'status-pending')
      badge.textContent = o.status ?? '—'
      c4.appendChild(badge)
      const c5 = tr.insertCell(); c5.textContent = orderDate; c5.style.cssText = 'font-size:12px; color:var(--color-text-sub)'
    })
  } catch (err) {
    console.error('[dashboard] 최근 주문 로딩 실패:', err)
    tbody.textContent = ''
    const tr = tbody.insertRow()
    const td = tr.insertCell()
    td.colSpan = 6; td.textContent = '데이터 로딩 실패'
    td.style.cssText = 'text-align:center; padding:32px; color:var(--color-danger)'
  }
}

// 제품별 판매량 테이블
let productSalesData = []

async function loadProductSales() {
  const tbody = document.getElementById('product-sales-body')
  if (!tbody) return
  try {
    const data = await getProductSalesStats(20)
    if (data.error) throw new Error(data.error)
    productSalesData = data
    renderProductSales('qty')
  } catch (err) {
    console.error('[dashboard] 제품별 판매량 로딩 실패:', err)
    if (tbody) {
      tbody.textContent = ''
      const tr = tbody.insertRow(); const td = tr.insertCell()
      td.colSpan = 7; td.textContent = '데이터 로딩 실패'
      td.style.cssText = 'text-align:center; padding:32px; color:var(--color-danger)'
    }
  }
}

function renderProductSales(sortKey) {
  const tbody = document.getElementById('product-sales-body')
  if (!tbody) return
  tbody.textContent = ''

  const sorted = [...productSalesData].sort((a, b) => b[sortKey] - a[sortKey])

  if (sorted.length === 0) {
    const tr = tbody.insertRow(); const td = tr.insertCell()
    td.colSpan = 7; td.textContent = '판매 데이터가 없습니다.'
    td.style.cssText = 'text-align:center; padding:32px; color:var(--color-text-light)'
    return
  }

  const maxQty = Math.max(...productSalesData.map(x => x.qty)) || 1

  sorted.forEach(function(p, i) {
    const tr = tbody.insertRow()

    // 순위
    const cRank = tr.insertCell()
    cRank.style.cssText = 'font-size:12px; font-weight:700; color:var(--color-text-light); text-align:center;'
    cRank.textContent = i < 3 ? ['🥇','🥈','🥉'][i] : String(i + 1)

    // 상품명 (썸네일 + 이름)
    const cName = tr.insertCell()
    const nameWrap = document.createElement('div')
    nameWrap.style.cssText = 'display:flex; align-items:center; gap:8px;'
    if (p.image_url) {
      const img = document.createElement('img')
      img.src = p.image_url; img.alt = p.product_name
      img.style.cssText = 'width:32px; height:32px; border-radius:4px; object-fit:cover; flex-shrink:0;'
      img.onerror = function() { img.style.display = 'none' }
      nameWrap.appendChild(img)
    }
    const nameText = document.createElement('span')
    nameText.textContent = p.product_name
    nameText.style.cssText = 'font-size:13px; font-weight:600;'
    nameWrap.appendChild(nameText)
    cName.appendChild(nameWrap)

    // 카테고리
    const cCat = tr.insertCell()
    const catBadge = document.createElement('span')
    catBadge.textContent = p.category
    catBadge.style.cssText = 'font-size:11px; background:#f0f7f0; color:#2d5a3d; border-radius:4px; padding:2px 7px; font-weight:600;'
    cCat.appendChild(catBadge)

    // 판매 수량 (바 + 숫자)
    const cQty = tr.insertCell(); cQty.style.textAlign = 'right'
    const qtyWrap = document.createElement('div')
    qtyWrap.style.cssText = 'display:flex; align-items:center; gap:8px; justify-content:flex-end;'
    const barWrap = document.createElement('div')
    barWrap.style.cssText = 'width:60px; height:6px; background:#eee; border-radius:3px; overflow:hidden;'
    const bar = document.createElement('div')
    bar.style.cssText = 'height:100%; background:#4c794b; border-radius:3px; width:' + Math.round((p.qty / maxQty) * 100) + '%;'
    barWrap.appendChild(bar)
    qtyWrap.appendChild(barWrap)
    const qtyText = document.createElement('span')
    qtyText.style.cssText = 'font-size:13px; font-weight:700; min-width:28px;'
    qtyText.textContent = fmt(p.qty) + '개'
    qtyWrap.appendChild(qtyText)
    cQty.appendChild(qtyWrap)

    // 주문 건수
    const cOrder = tr.insertCell()
    cOrder.textContent = fmt(p.order_count) + '건'
    cOrder.style.cssText = 'text-align:right; font-size:13px; color:var(--color-text-sub);'

    // 매출
    const cRev = tr.insertCell()
    cRev.textContent = fmt(p.revenue) + '원'
    cRev.style.cssText = 'text-align:right; font-size:13px; font-weight:700; color:var(--color-primary);'

    // 상품 보기 링크
    const cLink = tr.insertCell()
    if (p.product_id) {
      const a = document.createElement('a')
      a.href = '/product.html?id=' + p.product_id
      a.textContent = '보기'
      a.target = '_blank'
      a.style.cssText = 'font-size:12px; color:var(--color-primary); text-decoration:none;'
      cLink.appendChild(a)
    }
  })
}

document.getElementById('product-sales-sort')?.addEventListener('change', function(e) {
  renderProductSales(e.target.value)
})

// 품절/시즌한정 상품 목록 (DOM API)
async function loadOutOfStock() {
  const el = document.getElementById('out-of-stock-list')
  if (!el) return
  try {
    const { data, error } = await supabase
      .from('hgm_products').select('id, name, category, status')
      .in('status', ['품절', '시즌한정']).order('status', { ascending: true }).limit(10)
    if (error) throw error
    el.textContent = ''
    if (!data || data.length === 0) {
      const msg = document.createElement('div')
      msg.textContent = '품절 또는 시즌한정 상품이 없습니다 👍'
      msg.style.cssText = 'color:var(--color-success); font-size:13px;'
      el.appendChild(msg); return
    }
    data.forEach(function(p) {
      const row = document.createElement('div')
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f0f0f0;'
      const nameSpan = document.createElement('span')
      nameSpan.textContent = p.name; nameSpan.style.fontSize = '14px'
      row.appendChild(nameSpan)
      const right = document.createElement('div'); right.style.cssText = 'display:flex; gap:8px; align-items:center;'
      const catSpan = document.createElement('span')
      catSpan.textContent = p.category ?? '—'; catSpan.style.cssText = 'font-size:12px; color:var(--color-text-sub);'
      right.appendChild(catSpan)
      const badge = document.createElement('span')
      badge.className = 'status-badge ' + (p.status === '품절' ? 'status-cancel' : 'status-pending')
      badge.textContent = p.status; right.appendChild(badge)
      const link = document.createElement('a')
      link.href = '/admin/products.html'; link.textContent = '수정 →'
      link.style.cssText = 'font-size:12px; color:var(--color-primary);'; right.appendChild(link)
      row.appendChild(right); el.appendChild(row)
    })
  } catch (err) {
    console.error('[dashboard] 품절 상품 로딩 실패:', err)
    el.textContent = '데이터 로딩 실패'
  }
}

initPage()
