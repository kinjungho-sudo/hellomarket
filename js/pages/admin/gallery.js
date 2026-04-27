// admin/gallery.js — 갤러리 관리 페이지 스크립트
import { requireAdminAuth, adminLogout } from '/js/utils/admin-auth.js'
import { supabase } from '/js/config.js'
import { getGallery, createGalleryItem, updateGalleryItem, deleteGalleryItem } from '/js/api/gallery.js'

// 관리자 접근 제어
await requireAdminAuth()

try {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const el = document.getElementById('admin-user-name')
    if (el) el.textContent = user.email
  }
} catch (e) { console.error('[gallery] 유저 정보 조회 실패:', e) }

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  await adminLogout()
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

let currentEditId = null
let deleteTargetId = null
let currentFilter = { category: '', status: '' }

async function initPage() {
  await loadGallery()
  setupEventListeners()
}

// 갤러리 목록 로드
async function loadGallery() {
  const tbody = document.getElementById('gallery-body')
  if (!tbody) return
  tbody.textContent = ''

  try {
    const items = await getGallery({
      category: currentFilter.category || undefined,
      status: currentFilter.status || undefined,
      limit: 50,
    })
    if (items.error) throw new Error(items.error)

    if (!items || items.length === 0) {
      const tr = tbody.insertRow(); const td = tr.insertCell()
      td.colSpan = 8; td.textContent = '등록된 갤러리 항목이 없습니다.'
      td.style.cssText = 'text-align:center; padding:40px; color:var(--color-text-light)'
      return
    }

    items.forEach(function(item) {
      const tr = tbody.insertRow()

      // 이미지 썸네일
      const tdImg = tr.insertCell()
      if (item.image_url) {
        const img = document.createElement('img')
        img.src = item.image_url; img.alt = item.name ?? ''
        img.className = 'gallery-thumb'
        tdImg.appendChild(img)
      } else { tdImg.textContent = '—' }

      // 식물명
      const tdName = tr.insertCell(); tdName.textContent = item.name ?? '—'; tdName.style.fontWeight = '600'

      // 카테고리
      const tdCat = tr.insertCell(); tdCat.textContent = item.category ?? '—'

      // 상태 뱃지
      const tdStatus = tr.insertCell()
      const badge = document.createElement('span')
      badge.className = 'status-badge ' + (item.status === '판매중' ? 'status-complete' : item.status === '품절' ? 'status-cancel' : 'status-pending')
      badge.textContent = item.status ?? '—'
      tdStatus.appendChild(badge)

      // 가격
      const tdPrice = tr.insertCell(); tdPrice.textContent = item.price ? fmt(item.price) + '원' : '—'

      // 가격 공개 여부
      const tdShowPrice = tr.insertCell()
      const showTag = document.createElement('span')
      showTag.textContent = item.show_price ? '공개' : '비공개'
      showTag.style.fontSize = '12px'
      showTag.style.color = item.show_price ? 'var(--color-primary)' : 'var(--color-text-light)'
      tdShowPrice.appendChild(showTag)

      // 발행 여부
      const tdPublish = tr.insertCell()
      const pubTag = document.createElement('span')
      pubTag.textContent = item.is_published ? '발행' : '비발행'
      pubTag.style.cssText = item.is_published ? 'font-size:12px; color:var(--color-success);' : 'font-size:12px; color:var(--color-text-light);'
      tdPublish.appendChild(pubTag)

      // 관리 버튼
      const tdAction = tr.insertCell()
      const editBtn = document.createElement('button')
      editBtn.textContent = '수정'; editBtn.className = 'btn btn-ghost'
      editBtn.style.cssText = 'font-size:12px; height:28px; padding:0 10px; margin-right:4px;'
      editBtn.addEventListener('click', function() { openEditModal(item) })
      tdAction.appendChild(editBtn)
      const delBtn = document.createElement('button')
      delBtn.textContent = '삭제'; delBtn.className = 'btn'
      delBtn.style.cssText = 'font-size:12px; height:28px; padding:0 10px; background:var(--color-danger); color:#fff;'
      delBtn.addEventListener('click', function() { openDeleteModal(item.id) })
      tdAction.appendChild(delBtn)
    })
  } catch (err) {
    console.error('[gallery] 갤러리 로딩 실패:', err)
    tbody.textContent = ''
    const tr = tbody.insertRow(); const td = tr.insertCell()
    td.colSpan = 8; td.textContent = '데이터 로딩 실패'
    td.style.cssText = 'text-align:center; padding:40px; color:var(--color-danger)'
  }
}

function setupEventListeners() {
  document.getElementById('btn-add-gallery')?.addEventListener('click', openAddModal)
  document.getElementById('btn-filter')?.addEventListener('click', function() {
    currentFilter.category = document.getElementById('filter-category')?.value ?? ''
    currentFilter.status = document.getElementById('filter-status')?.value ?? ''
    loadGallery()
  })
  document.getElementById('btn-modal-cancel')?.addEventListener('click', closeModal)
  document.getElementById('gallery-form')?.addEventListener('submit', async function(e) {
    e.preventDefault(); await saveGalleryItem()
  })
  document.getElementById('g-image-file')?.addEventListener('change', async function(e) {
    const file = e.target.files?.[0]; if (file) await uploadAndPreview(file)
  })
  document.getElementById('btn-delete-cancel')?.addEventListener('click', function() {
    document.getElementById('delete-modal')?.classList.remove('open')
  })
  document.getElementById('btn-delete-confirm')?.addEventListener('click', async function() {
    if (!deleteTargetId) return
    try {
      const result = await deleteGalleryItem(deleteTargetId)
      if (result.error) throw new Error(result.error)
      document.getElementById('delete-modal')?.classList.remove('open')
      await loadGallery()
    } catch (err) {
      console.error('[gallery] 삭제 실패:', err)
      alert('삭제 중 오류: ' + err.message)
    }
  })
  document.getElementById('gallery-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal()
  })
}

function openAddModal() {
  currentEditId = null
  document.getElementById('modal-title').textContent = '갤러리 등록'
  document.getElementById('gallery-form').reset()
  document.getElementById('gallery-id').value = ''
  document.getElementById('g-image-url').value = ''
  const preview = document.getElementById('g-image-preview')
  if (preview) { preview.textContent = '📷'; preview.className = 'img-placeholder' }
  document.getElementById('gallery-modal')?.classList.add('open')
}

function openEditModal(item) {
  currentEditId = item.id
  document.getElementById('modal-title').textContent = '갤러리 수정'
  document.getElementById('gallery-id').value = item.id
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? '' }
  set('g-name', item.name)
  set('g-category', item.category)
  set('g-status', item.status)
  set('g-price', item.price)
  set('g-description', item.description)
  set('g-image-url', item.image_url)
  const check = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val }
  check('g-show-price', item.show_price)
  check('g-is-published', item.is_published)
  const preview = document.getElementById('g-image-preview')
  if (item.image_url && preview) {
    preview.textContent = ''
    const img = document.createElement('img')
    img.src = item.image_url; img.className = 'preview-img'
    preview.appendChild(img)
  }
  document.getElementById('gallery-modal')?.classList.add('open')
}

function openDeleteModal(id) {
  deleteTargetId = id
  document.getElementById('delete-modal')?.classList.add('open')
}

function closeModal() {
  document.getElementById('gallery-modal')?.classList.remove('open')
}

async function uploadAndPreview(file) {
  try {
    const ext = file.name.split('.').pop()
    const filename = 'gallery/' + Date.now() + '.' + ext
    const { error } = await supabase.storage.from('hgm-images').upload(filename, file, { upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('hgm-images').getPublicUrl(filename)
    document.getElementById('g-image-url').value = urlData.publicUrl
    const preview = document.getElementById('g-image-preview')
    if (preview) {
      preview.textContent = ''
      const img = document.createElement('img')
      img.src = urlData.publicUrl; img.className = 'preview-img'
      preview.appendChild(img)
    }
  } catch (err) { console.error('[gallery] 이미지 업로드 실패:', err); alert('이미지 업로드 실패: ' + err.message) }
}

async function saveGalleryItem() {
  try {
    const itemData = {
      name: document.getElementById('g-name')?.value?.trim(),
      category: document.getElementById('g-category')?.value,
      status: document.getElementById('g-status')?.value,
      price: parseInt(document.getElementById('g-price')?.value) || null,
      description: document.getElementById('g-description')?.value?.trim(),
      image_url: document.getElementById('g-image-url')?.value,
      show_price: document.getElementById('g-show-price')?.checked ?? false,
      is_published: document.getElementById('g-is-published')?.checked ?? true,
    }
    if (!itemData.name) { alert('식물명은 필수입니다.'); return }
    let result
    if (currentEditId) {
      result = await updateGalleryItem(currentEditId, itemData)
    } else {
      result = await createGalleryItem(itemData)
    }
    if (result.error) throw new Error(result.error)
    closeModal()
    await loadGallery()
  } catch (err) {
    console.error('[gallery] 저장 실패:', err)
    alert('저장 중 오류: ' + err.message)
  }
}

initPage()
