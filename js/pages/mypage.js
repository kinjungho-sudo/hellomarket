// 마이페이지 스크립트
import { getSession, signOut, updateNavAuth, requireLogin } from '../auth.js'
import { getCurrentUser, updateUser, getWishlist, removeFromWishlist } from '../api/users.js'
import { getOrdersByUser } from '../api/orders.js'
import { formatPrice, formatDate } from '../utils/format.js'

// DOM 요소
const toast = document.getElementById('toast')
const ordersList = document.getElementById('orders-list')
const wishlistGrid = document.getElementById('wishlist-grid')

// 전역 상태
let currentUser = null
let allOrders = []
let currentOrderFilter = 'all'

/* =============================================
   토스트 / 유틸
============================================= */
function showToast(msg, type = '') {
  toast.textContent = msg
  toast.className = `toast show ${type}`
  setTimeout(() => { toast.className = 'toast' }, 3000)
}

/* =============================================
   프로필 렌더링
============================================= */
function renderProfile(user) {
  const profileName  = document.getElementById('profile-name')
  const profileEmail = document.getElementById('profile-email')
  const profileJoined = document.getElementById('profile-joined')
  const profileAvatar = document.getElementById('profile-avatar')
  const providerBadge = document.getElementById('profile-provider-badge')

  // 이름
  const displayName = user.profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || '회원'
  profileName.textContent = displayName

  // 이메일
  profileEmail.textContent = user.email || ''

  // 가입일
  profileJoined.textContent = '가입일: ' + formatDate(user.created_at)

  // 아바타 이미지 처리
  const avatarUrl = user.profile?.avatar_url || user.user_metadata?.avatar_url
  if (avatarUrl) {
    profileAvatar.textContent = ''
    const img = document.createElement('img')
    img.alt = displayName
    img.src = avatarUrl
    profileAvatar.appendChild(img)
  } else {
    profileAvatar.textContent = '🌱'
  }

  // 소셜 공급자 뱃지
  const provider = user.profile?.provider || user.app_metadata?.provider
  if (provider) {
    const labels = { google: { text: '구글', cls: 'badge-google' }, naver: { text: '네이버', cls: 'badge-naver' } }
    const info = labels[provider]
    if (info) {
      providerBadge.textContent = info.text + ' 계정'
      providerBadge.className = `profile-provider-badge ${info.cls}`
    }
  }
}

/* =============================================
   알림 설정 로드 / 저장
============================================= */
function loadNotifySettings(profile) {
  const toggleNew  = document.getElementById('toggle-new-arrival')
  const toggleSale = document.getElementById('toggle-sale')
  if (profile) {
    toggleNew.checked  = !!profile.notify_new
    toggleSale.checked = !!profile.notify_sale
  }
}

async function saveNotifySettings() {
  if (!currentUser) return
  const toggleNew  = document.getElementById('toggle-new-arrival')
  const toggleSale = document.getElementById('toggle-sale')
  const btn = document.getElementById('btn-save-notify')

  btn.disabled = true
  btn.textContent = '저장 중...'

  try {
    const result = await updateUser(currentUser.id, {
      notify_new: toggleNew.checked,
      notify_sale: toggleSale.checked,
    })
    if (result?.error) throw new Error(result.error)
    showToast('알림 설정이 저장되었습니다.', 'success')
  } catch (err) {
    console.error('[HGM] 알림 설정 저장 오류:', err)
    showToast('저장에 실패했습니다. 다시 시도해 주세요.', 'danger')
  } finally {
    btn.disabled = false
    btn.textContent = '알림 설정 저장'
  }
}

/* =============================================
   주문 내역 렌더링
============================================= */
function getStatusText(status) {
  const map = {
    '주문완료': '주문완료', '결제완료': '결제완료',
    '배송준비': '배송준비', '배송중': '배송중',
    '배송완료': '배송완료', '취소': '취소',
  }
  return map[status] || status
}

/** 단일 주문 카드 DOM 생성 (innerHTML 미사용) */
function createOrderCard(order) {
  const card = document.createElement('div')
  card.className = 'order-card'

  // 헤더
  const header = document.createElement('div')
  header.className = 'order-card__header'

  const numWrap = document.createElement('div')
  const orderNum = document.createElement('span')
  orderNum.className = 'order-number'
  orderNum.textContent = order.order_number || '-'
  const orderDate = document.createElement('span')
  orderDate.className = 'order-date'
  orderDate.textContent = formatDate(order.created_at)
  numWrap.appendChild(orderNum)
  numWrap.appendChild(document.createTextNode(' '))
  numWrap.appendChild(orderDate)

  const badge = document.createElement('span')
  const statusKey = order.status || '주문완료'
  badge.className = `order-status-badge status-${statusKey}`
  badge.textContent = getStatusText(statusKey)

  header.appendChild(numWrap)
  header.appendChild(badge)

  // 상품 목록
  const itemsWrap = document.createElement('div')
  itemsWrap.className = 'order-card__items'

  const items = order.hgm_order_items || []
  const displayItems = items.slice(0, 2) // 최대 2개 표시

  displayItems.forEach(item => {
    const row = document.createElement('div')
    row.className = 'order-item-row'

    const imgWrap = document.createElement('div')
    imgWrap.className = 'order-item-img'
    imgWrap.textContent = '🌿'

    const nameWrap = document.createElement('div')
    const name = document.createElement('p')
    name.className = 'order-item-name'
    name.textContent = item.product_name || '상품명 없음'
    const qty = document.createElement('p')
    qty.className = 'order-item-qty'
    qty.textContent = `수량: ${item.quantity || 1}개 · ${formatPrice(item.price)}`
    nameWrap.appendChild(name)
    nameWrap.appendChild(qty)

    row.appendChild(imgWrap)
    row.appendChild(nameWrap)
    itemsWrap.appendChild(row)
  })

  if (items.length > 2) {
    const more = document.createElement('p')
    more.style.cssText = 'font-size:12px;color:var(--color-text-light);margin-top:4px;'
    more.textContent = `외 ${items.length - 2}개 상품`
    itemsWrap.appendChild(more)
  }

  // 푸터 (총 금액)
  const footer = document.createElement('div')
  footer.className = 'order-card__footer'
  const totalLabel = document.createElement('span')
  totalLabel.style.cssText = 'font-size:13px;color:var(--color-text-sub);'
  totalLabel.textContent = '총 결제금액'
  const totalAmount = document.createElement('span')
  totalAmount.className = 'order-total'
  totalAmount.textContent = formatPrice(order.total_price || 0)
  footer.appendChild(totalLabel)
  footer.appendChild(totalAmount)

  card.appendChild(header)
  card.appendChild(itemsWrap)
  card.appendChild(footer)

  return card
}

function renderOrders(orders) {
  ordersList.textContent = ''

  if (!orders || orders.error) {
    const msg = document.createElement('p')
    msg.style.cssText = 'text-align:center;color:var(--color-text-sub);padding:40px 0;'
    msg.textContent = '주문 내역을 불러오는 중 오류가 발생했습니다.'
    ordersList.appendChild(msg)
    return
  }

  const filtered = currentOrderFilter === 'all'
    ? orders
    : orders.filter(o => o.status === currentOrderFilter)

  if (filtered.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'empty-state'

    const icon = document.createElement('span')
    icon.className = 'empty-state__icon'
    icon.textContent = '📦'

    const title = document.createElement('p')
    title.className = 'empty-state__title'
    title.textContent = '주문 내역이 없어요'

    const desc = document.createElement('p')
    desc.className = 'empty-state__desc'
    desc.textContent = '마음에 드는 식물을 장바구니에 담아보세요!'

    const btn = document.createElement('a')
    btn.href = '/shop.html'
    btn.className = 'btn btn-primary'
    btn.textContent = '쇼핑하러 가기'

    empty.appendChild(icon)
    empty.appendChild(title)
    empty.appendChild(desc)
    empty.appendChild(btn)
    ordersList.appendChild(empty)
    return
  }

  filtered.forEach(order => {
    ordersList.appendChild(createOrderCard(order))
  })
}

async function loadOrders() {
  if (!currentUser) return
  try {
    const orders = await getOrdersByUser(currentUser.id)
    allOrders = Array.isArray(orders) ? orders : []
    renderOrders(allOrders)
  } catch (err) {
    console.error('[HGM] 주문 내역 로드 오류:', err)
    renderOrders(null)
  }
}

/* =============================================
   위시리스트 렌더링
============================================= */
function createWishlistCard(item, onRemove) {
  const product = item.hgm_products
  if (!product) return null

  const card = document.createElement('div')
  card.className = 'wishlist-card'

  // 이미지
  const imgWrap = document.createElement('div')
  imgWrap.className = 'wishlist-card__img'
  if (product.image_url) {
    const img = document.createElement('img')
    img.alt = product.name
    img.src = product.image_url
    imgWrap.appendChild(img)
  } else {
    imgWrap.textContent = '🌿'
  }

  // 제거 버튼
  const removeBtn = document.createElement('button')
  removeBtn.className = 'wishlist-remove-btn'
  removeBtn.setAttribute('aria-label', '위시리스트에서 제거')
  removeBtn.textContent = '♥'
  removeBtn.style.color = '#e53935'
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    onRemove(item.product_id, card)
  })

  // 본문
  const body = document.createElement('div')
  body.className = 'wishlist-card__body'

  const name = document.createElement('p')
  name.className = 'wishlist-card__name'
  name.textContent = product.name

  const price = document.createElement('p')
  price.className = 'wishlist-card__price'
  price.textContent = formatPrice(product.price)

  body.appendChild(name)
  body.appendChild(price)

  card.appendChild(imgWrap)
  card.appendChild(removeBtn)
  card.appendChild(body)

  // 카드 클릭 시 상품 상세로 이동
  card.addEventListener('click', () => {
    window.location.href = `/product.html?id=${product.id}`
  })

  return card
}

async function handleRemoveWishlist(productId, cardEl) {
  try {
    cardEl.style.opacity = '0.4'
    cardEl.style.pointerEvents = 'none'
    const result = await removeFromWishlist(currentUser.id, productId)
    if (result?.error) throw new Error(result.error)
    cardEl.remove()
    showToast('위시리스트에서 제거했습니다.')

    // 위시리스트가 비어있으면 빈 상태 표시
    if (wishlistGrid.children.length === 0) {
      renderWishlistEmpty()
    }
  } catch (err) {
    console.error('[HGM] 위시리스트 제거 오류:', err)
    cardEl.style.opacity = ''
    cardEl.style.pointerEvents = ''
    showToast('제거에 실패했습니다.', 'danger')
  }
}

function renderWishlistEmpty() {
  wishlistGrid.textContent = ''
  const empty = document.createElement('div')
  empty.className = 'empty-state'
  empty.style.gridColumn = '1 / -1'

  const icon = document.createElement('span')
  icon.className = 'empty-state__icon'
  icon.textContent = '🤍'

  const title = document.createElement('p')
  title.className = 'empty-state__title'
  title.textContent = '위시리스트가 비어있어요'

  const desc = document.createElement('p')
  desc.className = 'empty-state__desc'
  desc.textContent = '마음에 드는 식물에 ♥를 눌러 저장해 보세요'

  const btn = document.createElement('a')
  btn.href = '/shop.html'
  btn.className = 'btn btn-primary'
  btn.textContent = '쇼핑하러 가기'

  empty.appendChild(icon)
  empty.appendChild(title)
  empty.appendChild(desc)
  empty.appendChild(btn)
  wishlistGrid.appendChild(empty)
}

async function loadWishlist() {
  if (!currentUser) return
  wishlistGrid.textContent = ''

  // 스켈레톤
  for (let i = 0; i < 3; i++) {
    const sk = document.createElement('div')
    sk.className = 'skeleton'
    sk.style.height = '200px'
    sk.style.borderRadius = 'var(--radius-md)'
    wishlistGrid.appendChild(sk)
  }

  try {
    const items = await getWishlist(currentUser.id)
    wishlistGrid.textContent = ''

    if (!Array.isArray(items) || items.length === 0) {
      renderWishlistEmpty()
      return
    }

    items.forEach(item => {
      const card = createWishlistCard(item, handleRemoveWishlist)
      if (card) wishlistGrid.appendChild(card)
    })
  } catch (err) {
    console.error('[HGM] 위시리스트 로드 오류:', err)
    wishlistGrid.textContent = ''
    renderWishlistEmpty()
  }
}

/* =============================================
   탭 전환
============================================= */
function switchTab(tabName) {
  // 메뉴 아이템 active 토글
  document.querySelectorAll('.side-menu__item[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName)
  })

  // 패널 active 토글
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`)
  })

  // 위시리스트 탭은 클릭 시 데이터 로드
  if (tabName === 'wishlist') loadWishlist()
}

/* =============================================
   초기화
============================================= */
function initHamburger() {
  const hamburger = document.getElementById('hamburger')
  const mobileMenu = document.getElementById('mobile-menu')
  if (!hamburger || !mobileMenu) return
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active')
    mobileMenu.classList.toggle('active')
  })
}

async function init() {
  initHamburger()
  updateNavAuth()

  // 로그인 확인 (비로그인 시 login.html로 리다이렉트)
  await requireLogin()

  try {
    const userData = await getCurrentUser()
    if (!userData || userData.error) throw new Error('유저 정보를 불러올 수 없습니다.')
    currentUser = userData

    renderProfile(currentUser)
    loadNotifySettings(currentUser.profile)
    await loadOrders()
  } catch (err) {
    console.error('[HGM] 마이페이지 초기화 오류:', err)
    showToast('정보를 불러오는 데 실패했습니다.', 'danger')
  }

  // 사이드 메뉴 탭 전환 이벤트
  document.querySelectorAll('.side-menu__item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  })

  // 주문 상태 필터 버튼
  document.querySelectorAll('.order-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.order-filter-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      currentOrderFilter = btn.dataset.status
      renderOrders(allOrders)
    })
  })

  // 알림 설정 저장
  document.getElementById('btn-save-notify').addEventListener('click', saveNotifySettings)

  // 로그아웃
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await signOut()
    window.location.href = '/index.html'
  })
}

init()
