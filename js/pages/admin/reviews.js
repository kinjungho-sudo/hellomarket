// admin/reviews.js — 리뷰 관리 페이지 스크립트
import { requireAdmin, signOut } from '/js/auth.js'
import { supabase } from '/js/config.js'
import { toggleReviewPublish, deleteReview } from '/js/api/reviews.js'

// 관리자 접근 제어
await requireAdmin()

try {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const el = document.getElementById('admin-user-name')
    if (el) el.textContent = user.email
  }
} catch (e) { console.error('[reviews] 유저 정보 조회 실패:', e) }

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

// 이벤트 배너 저장 버튼 (이벤트 배너 기능이 있는 경우)
document.getElementById('btn-save-banner')?.addEventListener('click', async function() {
  const text = document.getElementById('event-banner-text')?.value?.trim()
  if (!text) return
  try {
    const { error } = await supabase
      .from('hgm_settings')
      .upsert([{ key: 'review_event_banner', value: text, updated_at: new Date().toISOString() }])
    if (error) throw error
    alert('배너 문구가 저장되었습니다.')
  } catch (err) {
    console.error('[reviews] 배너 저장 실패:', err)
    alert('저장 실패: ' + err.message)
  }
})

async function initPage() {
  await loadReviews()
  setupDeleteModal()
}

// 리뷰 목록 로드 (관리자용 — 모든 리뷰 포함)
async function loadReviews() {
  const tbody = document.getElementById('reviews-body')
  if (!tbody) return
  tbody.textContent = ''

  try {
    // 관리자는 비공개 리뷰도 포함해서 조회
    const { data, error } = await supabase
      .from('hgm_reviews')
      .select('*, hgm_users(name), hgm_products(name, image_url)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error

    if (!data || data.length === 0) {
      const tr = tbody.insertRow(); const td = tr.insertCell()
      td.colSpan = 8; td.textContent = '등록된 리뷰가 없습니다.'
      td.style.cssText = 'text-align:center; padding:40px; color:var(--color-text-light)'
      return
    }

    data.forEach(function(review) {
      const tr = tbody.insertRow()

      // 이미지 (리뷰 이미지가 있으면 첫 번째 이미지 표시)
      const tdImg = tr.insertCell()
      const images = Array.isArray(review.images) ? review.images : []
      const productImg = review.hgm_products?.image_url
      const imgSrc = images[0] ?? productImg
      if (imgSrc) {
        const img = document.createElement('img')
        img.src = imgSrc; img.alt = ''
        img.className = 'review-thumb'
        img.style.cssText = 'width:50px; height:50px; object-fit:cover; border-radius:var(--radius-sm);'
        tdImg.appendChild(img)
      } else { tdImg.textContent = '—' }

      // 제목 (상품명으로 표시)
      const tdTitle = tr.insertCell(); tdTitle.textContent = review.hgm_products?.name ?? '상품 없음'; tdTitle.style.fontWeight = '600'

      // 작성자
      const tdAuthor = tr.insertCell(); tdAuthor.textContent = review.hgm_users?.name ?? '알 수 없음'

      // 별점 (★ 표시)
      const tdRating = tr.insertCell()
      const stars = '★'.repeat(Math.max(0, Math.min(5, review.rating ?? 0))) + '☆'.repeat(5 - Math.max(0, Math.min(5, review.rating ?? 0)))
      const starSpan = document.createElement('span')
      starSpan.textContent = stars; starSpan.style.cssText = 'color:#f5c518; font-size:14px;'
      tdRating.appendChild(starSpan)

      // 내용 요약
      const tdContent = tr.insertCell()
      const contentText = review.content ?? '—'
      tdContent.textContent = contentText.length > 30 ? contentText.substring(0, 30) + '...' : contentText
      tdContent.style.fontSize = '13px'

      // 좋아요 수
      const tdLike = tr.insertCell(); tdLike.textContent = (review.like_count ?? 0).toLocaleString('ko-KR')

      // 발행 토글 스위치
      const tdPublish = tr.insertCell()
      const label = document.createElement('label')
      label.className = 'toggle-switch'
      const input = document.createElement('input')
      input.type = 'checkbox'; input.checked = !!review.is_published
      input.addEventListener('change', async function() {
        try {
          const result = await toggleReviewPublish(review.id, input.checked)
          if (result.error) throw new Error(result.error)
        } catch (err) {
          console.error('[reviews] 발행 토글 실패:', err)
          input.checked = !input.checked
          alert('발행 상태 변경 실패: ' + err.message)
        }
      })
      const slider = document.createElement('span'); slider.className = 'toggle-slider'
      label.appendChild(input); label.appendChild(slider)
      tdPublish.appendChild(label)

      // 등록일
      const tdDate = tr.insertCell()
      tdDate.textContent = review.created_at ? new Date(review.created_at).toLocaleDateString('ko-KR') : '—'
      tdDate.style.fontSize = '12px'

      // 삭제 버튼
      const tdAction = tr.insertCell()
      const delBtn = document.createElement('button')
      delBtn.textContent = '삭제'; delBtn.className = 'btn'
      delBtn.style.cssText = 'font-size:12px; height:28px; padding:0 10px; background:var(--color-danger); color:#fff;'
      delBtn.addEventListener('click', function() {
        openDeleteModal(review.id)
      })
      tdAction.appendChild(delBtn)
    })
  } catch (err) {
    console.error('[reviews] 리뷰 로딩 실패:', err)
    tbody.textContent = ''
    const tr = tbody.insertRow(); const td = tr.insertCell()
    td.colSpan = 8; td.textContent = '데이터 로딩 실패'
    td.style.cssText = 'text-align:center; padding:40px; color:var(--color-danger)'
  }
}

// 삭제 모달 설정
let deleteTargetId = null

function openDeleteModal(id) {
  deleteTargetId = id
  document.getElementById('delete-modal')?.classList.add('open')
}

function setupDeleteModal() {
  document.getElementById('btn-delete-cancel')?.addEventListener('click', function() {
    document.getElementById('delete-modal')?.classList.remove('open')
  })
  document.getElementById('btn-delete-confirm')?.addEventListener('click', async function() {
    if (!deleteTargetId) return
    try {
      const result = await deleteReview(deleteTargetId)
      if (result.error) throw new Error(result.error)
      document.getElementById('delete-modal')?.classList.remove('open')
      await loadReviews()
    } catch (err) {
      console.error('[reviews] 삭제 실패:', err)
      alert('삭제 중 오류: ' + err.message)
    }
  })
  document.getElementById('delete-modal')?.addEventListener('click', function(e) {
    if (e.target === this) document.getElementById('delete-modal')?.classList.remove('open')
  })
}

initPage()
