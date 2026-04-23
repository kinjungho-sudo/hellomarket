// admin/products.js — 상품 관리 페이지 스크립트
import { requireAdminAuth, adminLogout } from '/js/utils/admin-auth.js'
import { supabase } from '/js/config.js'
import { getProducts, createProduct, updateProduct, deleteProduct } from '/js/api/products.js'
import { sendNewProductEmail } from '/js/api/orders.js'

// 관리자 접근 제어
requireAdminAuth()

try {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const el = document.getElementById('admin-user-name')
    if (el) el.textContent = user.email
  }
} catch (e) { console.error('[products] 유저 정보 조회 실패:', e) }

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

// 숫자 포맷
const fmt = (n) => (n ?? 0).toLocaleString('ko-KR')

// 현재 수정 대상 상품 ID
let currentEditId = null
// 삭제 대상 ID
let deleteTargetId = null

// 현재 필터 상태
let currentFilter = { category: '', status: '', search: '' }
let currentPage = 1
const PAGE_SIZE = 20

async function initPage() {
  await loadProducts()
  setupEventListeners()
}

// 상품 목록 로드 및 테이블 렌더링
async function loadProducts() {
  const tbody = document.getElementById('products-body')
  if (!tbody) return
  tbody.textContent = ''

  // 로딩 표시
  const loadingRow = tbody.insertRow()
  const loadingCell = loadingRow.insertCell()
  loadingCell.colSpan = 8
  loadingCell.textContent = '로딩 중...'
  loadingCell.style.cssText = 'text-align:center; padding:40px; color:var(--color-text-light)'

  try {
    const options = {
      category: currentFilter.category || undefined,
      status: currentFilter.status || undefined,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    }
    const products = await getProducts(options)
    if (products.error) throw new Error(products.error)

    tbody.textContent = ''
    if (!products || products.length === 0) {
      const tr = tbody.insertRow(); const td = tr.insertCell()
      td.colSpan = 8; td.textContent = '등록된 상품이 없습니다.'
      td.style.cssText = 'text-align:center; padding:40px; color:var(--color-text-light)'
      return
    }

    // 검색어 필터 (클라이언트 사이드)
    const keyword = currentFilter.search.toLowerCase()
    const filtered = keyword ? products.filter(p => (p.name ?? '').toLowerCase().includes(keyword)) : products

    filtered.forEach(function(p) {
      const tr = tbody.insertRow()

      // 이미지
      const tdImg = tr.insertCell()
      if (p.image_url) {
        const img = document.createElement('img')
        img.src = p.image_url; img.alt = p.name ?? ''
        img.style.cssText = 'width:40px; height:40px; object-fit:cover; border-radius:var(--radius-sm);'
        tdImg.appendChild(img)
      } else {
        tdImg.textContent = '—'
      }

      // 상품명
      const tdName = tr.insertCell(); tdName.textContent = p.name ?? '—'; tdName.style.fontWeight = '600'

      // 카테고리
      const tdCat = tr.insertCell(); tdCat.textContent = p.category ?? '—'

      // 가격
      const tdPrice = tr.insertCell(); tdPrice.textContent = fmt(p.price) + '원'

      // 상태 뱃지
      const tdStatus = tr.insertCell()
      const badge = document.createElement('span')
      badge.className = 'status-badge ' + (p.status === '판매중' ? 'status-complete' : p.status === '품절' ? 'status-cancel' : 'status-pending')
      badge.textContent = p.status ?? '—'
      tdStatus.appendChild(badge)

      // 신상/베스트
      const tdFlags = tr.insertCell()
      if (p.is_new) { const tag = document.createElement('span'); tag.textContent = '신상'; tag.style.cssText = 'font-size:11px; background:#e3f2fd; color:#1565c0; padding:2px 6px; border-radius:99px; margin-right:4px;'; tdFlags.appendChild(tag) }
      if (p.is_best) { const tag = document.createElement('span'); tag.textContent = '베스트'; tag.style.cssText = 'font-size:11px; background:#fff3e0; color:#e65100; padding:2px 6px; border-radius:99px;'; tdFlags.appendChild(tag) }

      // 발행 여부
      const tdPublish = tr.insertCell()
      const pubTag = document.createElement('span')
      pubTag.textContent = p.is_published ? '발행' : '비발행'
      pubTag.style.cssText = p.is_published ? 'font-size:12px; color:var(--color-success);' : 'font-size:12px; color:var(--color-text-light);'
      tdPublish.appendChild(pubTag)

      // 등록일
      const tdDate = tr.insertCell()
      tdDate.textContent = p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : '—'
      tdDate.style.fontSize = '12px'

      // 관리 버튼
      const tdAction = tr.insertCell()
      const editBtn = document.createElement('button')
      editBtn.textContent = '수정'
      editBtn.className = 'btn btn-ghost'
      editBtn.style.cssText = 'font-size:12px; height:28px; padding:0 10px; margin-right:4px;'
      editBtn.addEventListener('click', function() { openEditModal(p) })
      tdAction.appendChild(editBtn)
      const delBtn = document.createElement('button')
      delBtn.textContent = '삭제'
      delBtn.className = 'btn'
      delBtn.style.cssText = 'font-size:12px; height:28px; padding:0 10px; background:var(--color-danger); color:#fff;'
      delBtn.addEventListener('click', function() { openDeleteModal(p.id) })
      tdAction.appendChild(delBtn)
    })
  } catch (err) {
    console.error('[products] 상품 로딩 실패:', err)
    tbody.textContent = ''
    const tr = tbody.insertRow(); const td = tr.insertCell()
    td.colSpan = 8; td.textContent = '데이터 로딩 실패'
    td.style.cssText = 'text-align:center; padding:40px; color:var(--color-danger)'
  }
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 상품 등록 버튼
  document.getElementById('btn-add-product')?.addEventListener('click', function() { openAddModal() })

  // 필터 검색 버튼
  document.getElementById('btn-filter')?.addEventListener('click', function() {
    currentFilter.category = document.getElementById('filter-category')?.value ?? ''
    currentFilter.status = document.getElementById('filter-status')?.value ?? ''
    currentFilter.search = document.getElementById('filter-search')?.value ?? ''
    currentPage = 1
    loadProducts()
  })

  // 모달 취소 버튼
  document.getElementById('btn-modal-cancel')?.addEventListener('click', closeModal)

  // 상품 폼 제출 (등록/수정)
  document.getElementById('product-form')?.addEventListener('submit', async function(e) {
    e.preventDefault()
    await saveProduct()
  })

  // 이미지 파일 선택 시 미리보기
  document.getElementById('p-image-file')?.addEventListener('change', async function(e) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadAndPreview(file)
  })

  // 삭제 모달 버튼
  document.getElementById('btn-delete-cancel')?.addEventListener('click', function() {
    document.getElementById('delete-modal')?.classList.remove('open')
  })
  document.getElementById('btn-delete-confirm')?.addEventListener('click', async function() {
    if (!deleteTargetId) return
    try {
      const result = await deleteProduct(deleteTargetId)
      if (result.error) throw new Error(result.error)
      document.getElementById('delete-modal')?.classList.remove('open')
      await loadProducts()
    } catch (err) {
      console.error('[products] 상품 삭제 실패:', err)
      alert('삭제 중 오류가 발생했습니다: ' + err.message)
    }
  })

  // 모달 바깥 클릭으로 닫기
  document.getElementById('product-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal()
  })
}

// 등록 모달 열기
function openAddModal() {
  currentEditId = null
  document.getElementById('modal-title').textContent = '상품 등록'
  document.getElementById('product-form').reset()
  document.getElementById('product-id').value = ''
  document.getElementById('p-image-url').value = ''
  const preview = document.getElementById('p-image-preview')
  preview.textContent = ''; preview.className = 'img-placeholder'; preview.textContent = '📷'
  document.getElementById('product-modal')?.classList.add('open')
}

// 수정 모달 열기
function openEditModal(product) {
  currentEditId = product.id
  document.getElementById('modal-title').textContent = '상품 수정'
  document.getElementById('product-id').value = product.id

  // 필드 채우기
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? '' }
  set('p-name', product.name)
  set('p-category', product.category)
  set('p-price', product.price)
  set('p-delivery', product.delivery_fee ?? 3000)
  set('p-status', product.status)
  set('p-lighting', product.lighting)
  set('p-water', product.water_cycle)
  set('p-description', product.description)
  set('p-detail', product.detail)
  set('p-image-url', product.image_url)

  // 체크박스
  const check = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val }
  check('p-is-new', product.is_new)
  check('p-is-best', product.is_best)
  check('p-is-published', product.is_published)

  // 이미지 미리보기
  const preview = document.getElementById('p-image-preview')
  if (product.image_url) {
    preview.textContent = ''
    const img = document.createElement('img')
    img.src = product.image_url; img.className = 'preview-img'
    preview.appendChild(img)
  } else {
    preview.textContent = '📷'; preview.className = 'img-placeholder'
  }

  document.getElementById('product-modal')?.classList.add('open')
}

// 삭제 모달 열기
function openDeleteModal(id) {
  deleteTargetId = id
  document.getElementById('delete-modal')?.classList.add('open')
}

// 모달 닫기
function closeModal() {
  document.getElementById('product-modal')?.classList.remove('open')
}

// 이미지 업로드 및 미리보기
async function uploadAndPreview(file) {
  const statusEl = document.getElementById('p-upload-status')
  if (statusEl) statusEl.textContent = '업로드 중...'
  try {
    const ext = file.name.split('.').pop()
    const filename = `products/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('hgm-images').upload(filename, file, { upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('hgm-images').getPublicUrl(filename)
    const imageUrl = urlData.publicUrl
    document.getElementById('p-image-url').value = imageUrl

    const preview = document.getElementById('p-image-preview')
    preview.textContent = ''
    const img = document.createElement('img')
    img.src = imageUrl; img.className = 'preview-img'
    preview.appendChild(img)

    if (statusEl) statusEl.textContent = '업로드 완료'
  } catch (err) {
    console.error('[products] 이미지 업로드 실패:', err)
    if (statusEl) statusEl.textContent = '업로드 실패: ' + err.message
  }
}

// 상품 저장 (등록 or 수정)
async function saveProduct() {
  const saveBtn = document.getElementById('btn-modal-save')
  if (saveBtn) saveBtn.disabled = true

  try {
    const productData = {
      name: document.getElementById('p-name')?.value?.trim(),
      category: document.getElementById('p-category')?.value,
      price: parseInt(document.getElementById('p-price')?.value) || 0,
      delivery_fee: parseInt(document.getElementById('p-delivery')?.value) || 3000,
      status: document.getElementById('p-status')?.value,
      lighting: document.getElementById('p-lighting')?.value?.trim(),
      water_cycle: document.getElementById('p-water')?.value?.trim(),
      description: document.getElementById('p-description')?.value?.trim(),
      detail: document.getElementById('p-detail')?.value?.trim(),
      image_url: document.getElementById('p-image-url')?.value,
      is_new: document.getElementById('p-is-new')?.checked ?? false,
      is_best: document.getElementById('p-is-best')?.checked ?? false,
      is_published: document.getElementById('p-is-published')?.checked ?? true,
    }

    if (!productData.name || !productData.category) {
      alert('상품명과 카테고리는 필수입니다.'); return
    }

    let result
    const isNew = !currentEditId
    if (currentEditId) {
      result = await updateProduct(currentEditId, productData)
    } else {
      result = await createProduct(productData)
    }

    if (result.error) throw new Error(result.error)

    // 신규 상품 등록 시 이메일 알림 발송 여부 확인
    if (isNew && result.id) {
      const sendEmail = confirm(`✅ 상품이 등록되었습니다!\n\n신규 상품 알림 이메일을 구독 회원에게 발송할까요?\n(수신 동의한 회원에게만 발송됩니다)`)
      if (sendEmail) {
        const emailResult = await sendNewProductEmail(result.id)
        if (emailResult.error) {
          alert('이메일 발송 중 오류: ' + emailResult.error)
        } else {
          alert(`📧 이메일이 ${emailResult.sent ?? 0}명에게 발송되었습니다!`)
        }
      }
    }

    closeModal()
    await loadProducts()
  } catch (err) {
    console.error('[products] 상품 저장 실패:', err)
    alert('저장 중 오류가 발생했습니다: ' + err.message)
  } finally {
    if (saveBtn) saveBtn.disabled = false
  }
}

initPage()
