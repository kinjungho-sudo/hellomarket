// admin/settings.js — 알림 설정 페이지 스크립트
import { requireAdmin, signOut } from '/js/auth.js'
import { supabase } from '/js/config.js'
import { getNotificationSettings, saveNotificationSettings, testTelegramConnection, sendHourlyReport } from '/js/api/notifications.js'

// 관리자 접근 제어
await requireAdmin()

try {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    // 관리자 이메일 표시
    const nameEl = document.getElementById('admin-user-name')
    if (nameEl) nameEl.textContent = user.email
    const emailEl = document.getElementById('admin-email')
    if (emailEl) emailEl.textContent = user.email
  }
} catch (e) { console.error('[settings] 유저 정보 조회 실패:', e) }

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

// 결과 메시지 표시 헬퍼
function showResult(id, message, isSuccess) {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = message
  el.className = 'test-result ' + (isSuccess ? 'success' : 'error')
  el.style.display = 'block'
  // 5초 후 자동 숨김
  setTimeout(function() { el.style.display = 'none' }, 5000)
}

async function initPage() {
  await loadSettings()
  setupEventListeners()
}

// 저장된 알림 설정 불러와서 폼에 채우기
async function loadSettings() {
  try {
    const settings = await getNotificationSettings()
    if (settings.error) {
      console.warn('[settings] 알림 설정 없음 (최초 설정 상태)')
      return
    }

    // Bot Token 필드 채우기 (값이 있으면 마스킹 표시)
    const botTokenEl = document.getElementById('telegram-bot-token')
    if (botTokenEl && settings.bot_token) {
      botTokenEl.value = settings.bot_token
    }

    // Chat ID 채우기
    const chatIdEl = document.getElementById('telegram-chat-id')
    if (chatIdEl && settings.chat_id) {
      chatIdEl.value = settings.chat_id
    }

    // 주문 알림 토글
    const orderToggle = document.getElementById('toggle-order-notify')
    if (orderToggle) orderToggle.checked = !!settings.is_enabled
  } catch (err) {
    console.error('[settings] 설정 로딩 실패:', err)
  }
}

function setupEventListeners() {
  // 연결 테스트 버튼
  document.getElementById('btn-test-telegram')?.addEventListener('click', async function() {
    const botToken = document.getElementById('telegram-bot-token')?.value?.trim()
    const chatId = document.getElementById('telegram-chat-id')?.value?.trim()

    if (!botToken || !chatId) {
      showResult('test-result', 'Bot Token과 Chat ID를 모두 입력해주세요.', false)
      return
    }

    const btn = document.getElementById('btn-test-telegram')
    if (btn) btn.disabled = true

    try {
      const result = await testTelegramConnection(botToken, chatId)
      if (result.error) throw new Error(result.error)
      showResult('test-result', '연결 테스트 성공! 텔레그램 메시지를 확인하세요.', true)
    } catch (err) {
      console.error('[settings] 연결 테스트 실패:', err)
      showResult('test-result', '연결 실패: ' + err.message, false)
    } finally {
      if (btn) btn.disabled = false
    }
  })

  // 설정 저장 버튼
  document.getElementById('btn-save-settings')?.addEventListener('click', async function() {
    const botToken = document.getElementById('telegram-bot-token')?.value?.trim()
    const chatId = document.getElementById('telegram-chat-id')?.value?.trim()
    const isEnabled = document.getElementById('toggle-order-notify')?.checked ?? false

    if (!botToken || !chatId) {
      showResult('save-result', 'Bot Token과 Chat ID를 입력해주세요.', false)
      return
    }

    const btn = document.getElementById('btn-save-settings')
    if (btn) btn.disabled = true

    try {
      const result = await saveNotificationSettings({
        bot_token: botToken,
        chat_id: chatId,
        is_enabled: isEnabled,
      })
      if (result.error) throw new Error(result.error)
      showResult('save-result', '설정이 저장되었습니다.', true)
    } catch (err) {
      console.error('[settings] 설정 저장 실패:', err)
      showResult('save-result', '저장 실패: ' + err.message, false)
    } finally {
      if (btn) btn.disabled = false
    }
  })
}

// 수동 리포트 발송 버튼
const btnSendReport = document.getElementById('btn-send-report')
if (btnSendReport) {
  btnSendReport.addEventListener('click', async () => {
    btnSendReport.disabled = true
    btnSendReport.textContent = '발송 중...'
    const result = await sendHourlyReport()
    const reportResult = document.getElementById('report-result')
    if (result.error) {
      reportResult.style.display = 'block'
      reportResult.style.color = 'var(--color-danger)'
      reportResult.textContent = '❌ ' + result.error
    } else {
      reportResult.style.display = 'block'
      reportResult.style.color = 'var(--color-success)'
      reportResult.textContent = '✅ 리포트가 텔레그램으로 발송되었습니다.'
    }
    btnSendReport.disabled = false
    btnSendReport.textContent = '📊 지금 리포트 발송'
  })
}

initPage()
