// 장바구니 유틸리티 — localStorage 기반, Supabase 연동 없음

const CART_KEY = 'hgm_cart'

/**
 * 장바구니 불러오기
 * @returns {Array} 장바구니 아이템 배열
 */
export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * 장바구니 저장 (내부 사용)
 * @param {Array} items
 */
function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

/**
 * 상품 추가 (이미 있으면 수량 증가)
 * @param {{ id: string, name: string, price: number, delivery: number, imageUrl: string }} product
 * @param {number} quantity - 추가할 수량 (기본 1)
 */
export function addToCart(product, quantity = 1) {
  const items = getCart()
  const existing = items.find(item => item.id === product.id)
  if (existing) {
    existing.quantity += quantity
  } else {
    items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      delivery: product.delivery ?? 3000,
      imageUrl: product.imageUrl ?? '',
      quantity
    })
  }
  saveCart(items)
  updateCartBadge()
}

/**
 * 상품 제거
 * @param {string} productId
 */
export function removeFromCart(productId) {
  const items = getCart().filter(item => item.id !== productId)
  saveCart(items)
  updateCartBadge()
}

/**
 * 수량 변경
 * @param {string} productId
 * @param {number} quantity - 변경할 수량 (0 이하면 제거)
 */
export function updateCartQuantity(productId, quantity) {
  if (quantity <= 0) {
    removeFromCart(productId)
    return
  }
  const items = getCart()
  const item = items.find(i => i.id === productId)
  if (item) {
    item.quantity = quantity
    saveCart(items)
    updateCartBadge()
  }
}

/**
 * 장바구니 비우기
 */
export function clearCart() {
  saveCart([])
  updateCartBadge()
}

/**
 * 장바구니 수량 합계
 * @returns {number}
 */
export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0)
}

/**
 * 상품 금액 합계 (배송비 제외)
 * @returns {number}
 */
export function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/**
 * 배송비 계산 (동일 배송비 중 최대값 1개만 적용)
 * 장바구니 내 상품들의 배송비 중 가장 높은 값 1개를 반환
 * @returns {number}
 */
export function getDeliveryFee() {
  const items = getCart()
  if (items.length === 0) return 0
  const fees = items.map(item => item.delivery ?? 3000)
  return Math.max(...fees)
}

/**
 * 네비게이션 장바구니 카운트 뱃지 업데이트
 * id="cart-count" 요소에 getCartCount() 표시
 */
export function updateCartBadge() {
  const el = document.getElementById('cart-count')
  if (!el) return
  const count = getCartCount()
  el.textContent = count > 0 ? String(count) : ''
  el.style.display = count > 0 ? 'inline-flex' : 'none'
}
