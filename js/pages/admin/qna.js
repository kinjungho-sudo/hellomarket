// admin/qna.js — 묻고 답하기 관리 페이지 스크립트
import { requireAdminAuth, adminLogout } from '/js/utils/admin-auth.js'
import { supabase } from '/js/config.js'
import { getQnaList, answerQna, deleteQna } from '/js/api/qna.js'

// 관리자 접근 제어
requireAdminAuth()

try {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const el = document.getElementById('admin-user-name')
    if (el) el.textContent = user.email
  }
} catch (e) { console.error('[qna] 유저 정보 조회 실패:', e) }

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

// 현재 필터 (all / unanswered / answered)
let currentFilter = 'all'
let currentPage = 1
const PAGE_SIZE = 20

// 현재 열려있는 Q&A ID
let currentQnaId = null

async function initPage() {
  await loadQnaList()
  setupEventListeners()
}

// Q&A 목록 로드
async function loadQnaList() {
  const tbody = document.getElementById('qna-body')
  if (!tbody) return
  tbody.textContent = ''

  try {
    const result = await getQnaList({ page: currentPage, limit: PAGE_SIZE })
    if (result.error) throw new Error(result.error)
    const allItems = result.data ?? []

    // 클라이언트 사이드 필터링
    let items = allItems
    if (currentFilter === 'unanswered') items = allItems.filter(q => !q.is_answered)
    else if (currentFilter === 'answered') items = allItems.filter(q => q.is_answered)

    // 탭 카운트 업데이트
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text }
    setText('count-all', '(' + allItems.length + ')')
    setText('count-unanswered', '(' + allItems.filter(q => !q.is_answered).length + ')')

    if (items.length === 0) {
      const tr = tbody.insertRow(); const td = tr.insertCell()
      td.colSpan = 7; td.textContent = 'Q&A가 없습니다.'
      td.style.cssText = 'text-align:center; padding:40px; color:var(--color-text-light)'
      return
    }

    items.forEach(function(q, idx) {
      const tr = tbody.insertRow()

      // 미답변 행 배경 강조
      if (!q.is_answered) tr.className = 'unanswered-highlight'

      // 번호
      const tdNum = tr.insertCell(); tdNum.textContent = idx + 1 + ((currentPage - 1) * PAGE_SIZE)

      // 제목 (클릭 시 상세 모달)
      const tdTitle = tr.insertCell()
      const titleLink = document.createElement('a')
      titleLink.href = '#'; titleLink.textContent = q.title ?? '—'
      titleLink.style.cssText = 'color:var(--color-text); font-weight:600;'
      titleLink.addEventListener('click', function(e) { e.preventDefault(); openQnaModal(q) })
      tdTitle.appendChild(titleLink)

      // 작성자
      const tdAuthor = tr.insertCell()
      tdAuthor.textContent = q.hgm_users?.name ?? '알 수 없음'

      // 비밀글 여부
      const tdSecret = tr.insertCell()
      if (q.is_secret) {
        const lock = document.createElement('span')
        lock.textContent = '🔒'; lock.style.fontSize = '13px'
        tdSecret.appendChild(lock)
      }

      // 상태 뱃지
      const tdStatus = tr.insertCell()
      const badge = document.createElement('span')
      badge.className = 'status-badge ' + (q.is_answered ? 'status-complete' : 'status-pending')
      badge.textContent = q.is_answered ? '답변완료' : '미답변'
      tdStatus.appendChild(badge)

      // 작성일
      const tdDate = tr.insertCell()
      tdDate.textContent = q.created_at ? new Date(q.created_at).toLocaleDateString('ko-KR') : '—'
      tdDate.style.fontSize = '12px'

      // 관리 버튼
      const tdAction = tr.insertCell()
      const answerBtn = document.createElement('button')
      answerBtn.textContent = q.is_answered ? '수정' : '답변'
      answerBtn.className = 'btn btn-ghost'
      answerBtn.style.cssText = 'font-size:12px; height:28px; padding:0 10px; margin-right:4px;'
      answerBtn.addEventListener('click', function() { openQnaModal(q) })
      tdAction.appendChild(answerBtn)
    })
  } catch (err) {
    console.error('[qna] Q&A 로딩 실패:', err)
    tbody.textContent = ''
    const tr = tbody.insertRow(); const td = tr.insertCell()
    td.colSpan = 7; td.textContent = '데이터 로딩 실패'
    td.style.cssText = 'text-align:center; padding:40px; color:var(--color-danger)'
  }
}

// Q&A 상세 / 답변 모달 열기
function openQnaModal(qna) {
  currentQnaId = qna.id
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text }
  setText('qna-author', qna.hgm_users?.name ?? '알 수 없음')
  setText('qna-date', qna.created_at ? new Date(qna.created_at).toLocaleString('ko-KR') : '—')
  setText('qna-title', qna.title ?? '—')
  setText('qna-content', qna.content ?? '—')

  // 비밀글 뱃지
  const secretBadge = document.getElementById('qna-secret-badge')
  if (secretBadge) secretBadge.style.display = qna.is_secret ? 'inline' : 'none'

  // 기존 답변 표시
  const answerWrap = document.getElementById('existing-answer-wrap')
  const existingAnswer = document.getElementById('existing-answer')
  if (answerWrap && existingAnswer) {
    if (qna.answer) {
      existingAnswer.textContent = qna.answer
      answerWrap.style.display = 'block'
    } else {
      answerWrap.style.display = 'none'
    }
  }

  // 답변 textarea 초기화
  const answerEl = document.getElementById('qna-answer')
  if (answerEl) answerEl.value = qna.answer ?? ''

  document.getElementById('qna-modal')?.classList.add('open')
}

function setupEventListeners() {
  // 탭 클릭
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      currentFilter = btn.dataset.filter ?? 'all'
      currentPage = 1
      loadQnaList()
    })
  })

  // Q&A 모달 닫기
  document.getElementById('btn-qna-modal-close')?.addEventListener('click', function() {
    document.getElementById('qna-modal')?.classList.remove('open')
  })

  // 답변 등록
  document.getElementById('btn-qna-answer-save')?.addEventListener('click', async function() {
    if (!currentQnaId) return
    const answerEl = document.getElementById('qna-answer')
    const answer = answerEl?.value?.trim()
    if (!answer) { alert('답변 내용을 입력해주세요.'); return }
    try {
      const result = await answerQna(currentQnaId, answer)
      if (result.error) throw new Error(result.error)
      document.getElementById('qna-modal')?.classList.remove('open')
      await loadQnaList()
    } catch (err) {
      console.error('[qna] 답변 저장 실패:', err)
      alert('답변 저장 실패: ' + err.message)
    }
  })

  // Q&A 삭제
  document.getElementById('btn-qna-delete')?.addEventListener('click', async function() {
    if (!currentQnaId) return
    if (!confirm('이 Q&A를 삭제하시겠어요? 삭제 후 복구할 수 없습니다.')) return
    try {
      const result = await deleteQna(currentQnaId)
      if (result.error) throw new Error(result.error)
      document.getElementById('qna-modal')?.classList.remove('open')
      await loadQnaList()
    } catch (err) {
      console.error('[qna] Q&A 삭제 실패:', err)
      alert('삭제 실패: ' + err.message)
    }
  })

  // 모달 바깥 클릭
  document.getElementById('qna-modal')?.addEventListener('click', function(e) {
    if (e.target === this) document.getElementById('qna-modal')?.classList.remove('open')
  })
}

initPage()
