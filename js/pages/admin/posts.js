// admin/posts.js — 입고 소식 관리 페이지 스크립트
import { requireAdminAuth, adminLogout } from '/js/utils/admin-auth.js'
import { supabase } from '/js/config.js'
import { getPosts, createPost, updatePost, deletePost } from '/js/api/posts.js'
import { sendNewArrivalAlert } from '/js/api/notifications.js'
import { getNotifyUsers } from '/js/api/users.js'

// 관리자 접근 제어
await requireAdminAuth()

try {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const el = document.getElementById('admin-user-name')
    if (el) el.textContent = user.email
  }
} catch (e) { console.error('[posts] 유저 정보 조회 실패:', e) }

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

let currentEditId = null
let deleteTargetId = null
let currentTypeFilter = ''

async function initPage() {
  await loadPosts()
  setupEventListeners()
}

// 연결 상품 select에 상품 목록 로드
async function loadProductsForSelect() {
  const sel = document.getElementById('pt-product')
  if (!sel) return
  try {
    const products = await getProducts({ limit: 100 })
    if (!products.error && Array.isArray(products)) {
      products.forEach(function(p) {
        const opt = document.createElement('option')
        opt.value = p.id; opt.textContent = p.name
        sel.appendChild(opt)
      })
    }
  } catch (err) { console.error('[posts] 상품 목록 로딩 실패:', err) }
}

// 포스트 목록 로드
async function loadPosts() {
  const tbody = document.getElementById('posts-body')
  if (!tbody) return
  tbody.textContent = ''

  try {
    const posts = await getPosts({ type: currentTypeFilter || undefined, limit: 50 })
    if (posts.error) throw new Error(posts.error)

    if (!posts || posts.length === 0) {
      const tr = tbody.insertRow(); const td = tr.insertCell()
      td.colSpan = 8; td.textContent = '등록된 포스트가 없습니다.'
      td.style.cssText = 'text-align:center; padding:40px; color:var(--color-text-light)'
      return
    }

    posts.forEach(function(p) {
      const tr = tbody.insertRow()

      // 썸네일
      const tdImg = tr.insertCell()
      if (p.image_url || p.thumbnail) {
        const img = document.createElement('img')
        img.src = p.image_url ?? p.thumbnail; img.alt = p.title ?? ''
        img.style.cssText = 'width:50px; height:50px; object-fit:cover; border-radius:var(--radius-sm);'
        tdImg.appendChild(img)
      } else {
        tdImg.textContent = '—'
      }

      // 제목
      const tdTitle = tr.insertCell(); tdTitle.textContent = p.title ?? '—'; tdTitle.style.fontWeight = '600'

      // 타입
      const tdType = tr.insertCell()
      const typeTag = document.createElement('span')
      typeTag.textContent = p.type === 'new_arrival' ? '입고 소식' : '가드닝 가이드'
      typeTag.style.cssText = p.type === 'new_arrival'
        ? 'font-size:12px; background:#e8f5e9; color:#2d5a3d; padding:2px 8px; border-radius:99px;'
        : 'font-size:12px; background:#fff3e0; color:#e65100; padding:2px 8px; border-radius:99px;'
      tdType.appendChild(typeTag)

      // 연결 상품
      const tdProduct = tr.insertCell()
      tdProduct.textContent = p.product_id ? '연결됨' : '—'
      tdProduct.style.cssText = 'font-size:12px; color:var(--color-text-sub);'

      // 발행 여부
      const tdPublish = tr.insertCell()
      const pubTag = document.createElement('span')
      pubTag.textContent = p.is_published ? '발행' : '비발행'
      pubTag.style.cssText = p.is_published ? 'font-size:12px; color:var(--color-success);' : 'font-size:12px; color:var(--color-text-light);'
      tdPublish.appendChild(pubTag)

      // 조회수
      const tdView = tr.insertCell(); tdView.textContent = (p.view_count ?? 0).toLocaleString('ko-KR')

      // 등록일
      const tdDate = tr.insertCell()
      tdDate.textContent = p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : '—'
      tdDate.style.fontSize = '12px'

      // 관리 버튼
      const tdAction = tr.insertCell()
      const editBtn = document.createElement('button')
      editBtn.textContent = '수정'; editBtn.className = 'btn btn-ghost'
      editBtn.style.cssText = 'font-size:12px; height:28px; padding:0 10px; margin-right:4px;'
      editBtn.addEventListener('click', function() { openEditModal(p) })
      tdAction.appendChild(editBtn)
      const delBtn = document.createElement('button')
      delBtn.textContent = '삭제'; delBtn.className = 'btn'
      delBtn.style.cssText = 'font-size:12px; height:28px; padding:0 10px; background:var(--color-danger); color:#fff;'
      delBtn.addEventListener('click', function() { openDeleteModal(p.id) })
      tdAction.appendChild(delBtn)
    })
  } catch (err) {
    console.error('[posts] 포스트 로딩 실패:', err)
    tbody.textContent = ''
    const tr = tbody.insertRow(); const td = tr.insertCell()
    td.colSpan = 8; td.textContent = '데이터 로딩 실패'
    td.style.cssText = 'text-align:center; padding:40px; color:var(--color-danger)'
  }
}

function setupEventListeners() {
  document.getElementById('btn-add-post')?.addEventListener('click', openAddModal)

  // 타입 탭
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      currentTypeFilter = btn.dataset.type ?? ''
      loadPosts()
    })
  })

  document.getElementById('btn-modal-cancel')?.addEventListener('click', closeModal)
  document.getElementById('post-form')?.addEventListener('submit', async function(e) {
    e.preventDefault(); await savePost()
  })
  document.getElementById('pt-image-file')?.addEventListener('change', async function(e) {
    const file = e.target.files?.[0]; if (file) await uploadAndPreview(file)
  })
  document.getElementById('btn-delete-cancel')?.addEventListener('click', function() {
    document.getElementById('delete-modal')?.classList.remove('open')
  })
  document.getElementById('btn-delete-confirm')?.addEventListener('click', async function() {
    if (!deleteTargetId) return
    try {
      const result = await deletePost(deleteTargetId)
      if (result.error) throw new Error(result.error)
      document.getElementById('delete-modal')?.classList.remove('open')
      await loadPosts()
    } catch (err) {
      console.error('[posts] 삭제 실패:', err)
      alert('삭제 중 오류: ' + err.message)
    }
  })
  document.getElementById('post-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal()
  })
}

function openAddModal() {
  currentEditId = null
  document.getElementById('modal-title').textContent = '글 등록'
  document.getElementById('post-form').reset()
  document.getElementById('post-id').value = ''
  document.getElementById('pt-image-url').value = ''
  document.getElementById('pt-is-published').checked = true
  const preview = document.getElementById('pt-image-preview')
  if (preview) { preview.textContent = '📷'; preview.className = 'img-placeholder' }
  document.getElementById('post-modal')?.classList.add('open')
}

function openEditModal(post) {
  currentEditId = post.id
  document.getElementById('modal-title').textContent = '글 수정'
  document.getElementById('post-id').value = post.id
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? '' }
  set('pt-type', post.type)
  set('pt-title', post.title)
  set('pt-content', post.content)
  set('pt-image-url', post.image_url ?? post.thumbnail)
  set('pt-product-id', post.product_id)
  const el = document.getElementById('pt-is-published'); if (el) el.checked = !!post.is_published
  const preview = document.getElementById('pt-image-preview')
  const imgUrl = post.image_url ?? post.thumbnail
  if (imgUrl && preview) {
    preview.textContent = ''
    const img = document.createElement('img')
    img.src = imgUrl; img.className = 'preview-img'
    preview.appendChild(img)
  }
  document.getElementById('post-modal')?.classList.add('open')
}

function openDeleteModal(id) {
  deleteTargetId = id
  document.getElementById('delete-modal')?.classList.add('open')
}

function closeModal() {
  document.getElementById('post-modal')?.classList.remove('open')
}

async function uploadAndPreview(file) {
  const statusEl = document.getElementById('pt-upload-status')
  if (statusEl) statusEl.textContent = '업로드 중...'
  try {
    const ext = file.name.split('.').pop()
    const filename = 'posts/' + Date.now() + '.' + ext
    const { error } = await supabase.storage.from('hgm-images').upload(filename, file, { upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('hgm-images').getPublicUrl(filename)
    document.getElementById('pt-image-url').value = urlData.publicUrl
    const preview = document.getElementById('pt-image-preview')
    if (preview) {
      preview.textContent = ''
      const img = document.createElement('img')
      img.src = urlData.publicUrl; img.className = 'preview-img'
      preview.appendChild(img)
    }
    if (statusEl) statusEl.textContent = '업로드 완료'
  } catch (err) {
    console.error('[posts] 이미지 업로드 실패:', err)
    if (statusEl) statusEl.textContent = '업로드 실패: ' + err.message
  }
}

async function savePost() {
  try {
    const postData = {
      type: document.getElementById('pt-type')?.value,
      title: document.getElementById('pt-title')?.value?.trim(),
      content: document.getElementById('pt-content')?.value?.trim(),
      image_url: document.getElementById('pt-image-url')?.value,
      product_id: document.getElementById('pt-product-id')?.value || null,
      is_published: document.getElementById('pt-is-published')?.checked ?? false,
    }
    if (!postData.title) { alert('제목은 필수입니다.'); return }
    let result
    if (currentEditId) {
      result = await updatePost(currentEditId, postData)
    } else {
      result = await createPost(postData)
    }
    if (result.error) throw new Error(result.error)

    // 입고 소식 신규 발행 시 → 텔레그램 + 이메일 알림 발송
    const isNewPost = !currentEditId
    const isNewArrival = postData.type === 'new_arrival'
    const isPublished = postData.is_published
    if (isNewPost && isNewArrival && isPublished) {
      // 텔레그램 발송
      const notifyUsers = await getNotifyUsers('notify_new')
      sendNewArrivalAlert(postData, notifyUsers.length).catch(e =>
        console.warn('[posts] 신상 입고 텔레그램 알림 실패:', e)
      )

      // 이메일 발송 (Vercel Serverless Function)
      fetch('/api/send-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post: { ...postData, image_url: result.image_url }, notifyType: 'notify_new' }),
      })
        .then(r => r.json())
        .then(r => console.log('[posts] 이메일 발송 결과:', r))
        .catch(e => console.warn('[posts] 이메일 발송 실패:', e))
    }

    closeModal()
    await loadPosts()
  } catch (err) {
    console.error('[posts] 저장 실패:', err)
    alert('저장 중 오류: ' + err.message)
  }
}

initPage()
