// admin/settings.js — 알림 설정 페이지 스크립트
import { requireAdminAuth, adminLogout } from '/js/utils/admin-auth.js'
import { supabase } from '/js/config.js'
import { getNotificationSettings, saveNotificationSettings, testTelegramConnection, sendHourlyReport } from '/js/api/notifications.js'

// 관리자 접근 제어
requireAdminAuth()

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

// 비밀번호 변경
document.getElementById('btn-change-password')?.addEventListener('click', async function() {
  const currentPw  = document.getElementById('current-password')?.value?.trim()
  const newPw      = document.getElementById('new-password')?.value?.trim()
  const newPwConf  = document.getElementById('new-password-confirm')?.value?.trim()
  const resultEl   = document.getElementById('pw-change-result')

  const showPwResult = (msg, ok) => {
    resultEl.textContent = (ok ? '✅ ' : '❌ ') + msg
    resultEl.style.color = ok ? 'var(--color-success)' : 'var(--color-danger)'
    resultEl.style.display = 'block'
    setTimeout(() => { resultEl.style.display = 'none' }, 4000)
  }

  if (!currentPw || !newPw || !newPwConf) return showPwResult('모든 항목을 입력해 주세요.', false)
  if (newPw.length < 6) return showPwResult('새 비밀번호는 6자 이상이어야 합니다.', false)
  if (newPw !== newPwConf) return showPwResult('새 비밀번호가 일치하지 않습니다.', false)

  // 현재 비밀번호 검증
  const { data: cur, error: curErr } = await supabase
    .from('hgm_notification_settings')
    .select('admin_password')
    .limit(1)
    .single()

  if (curErr || !cur) return showPwResult('설정 정보를 불러올 수 없습니다.', false)
  if (cur.admin_password !== currentPw) return showPwResult('현재 비밀번호가 올바르지 않습니다.', false)

  // 새 비밀번호 저장
  const { error: updErr } = await supabase
    .from('hgm_notification_settings')
    .update({ admin_password: newPw })
    .gte('id', '00000000-0000-0000-0000-000000000000')

  if (updErr) return showPwResult('저장 실패: ' + updErr.message, false)

  document.getElementById('current-password').value = ''
  document.getElementById('new-password').value = ''
  document.getElementById('new-password-confirm').value = ''
  showPwResult('비밀번호가 변경되었습니다.', true)
})

initPage()
