// 로그인 페이지 스크립트
import { signInWithGoogle, getSession, updateNavAuth } from '../auth.js'

const btnGoogle = document.getElementById('btn-google')
const errorBox = document.getElementById('login-error')
const toast = document.getElementById('toast')

/** 토스트 표시 */
function showToast(msg, type = '') {
  toast.textContent = msg
  toast.className = `toast show ${type}`
  setTimeout(() => { toast.className = 'toast' }, 3500)
}

/** 에러 메시지 표시 */
function showError(msg) {
  errorBox.textContent = msg
  errorBox.classList.add('show')
}

/** 에러 메시지 숨김 */
function hideError() {
  errorBox.classList.remove('show')
}

/** 이미 로그인된 상태면 리다이렉트 */
async function checkAlreadyLoggedIn() {
  try {
    const { session } = await getSession()
    if (session) {
      const saved = sessionStorage.getItem('loginReturnUrl') || ''
      sessionStorage.removeItem('loginReturnUrl')
      // admin 경로는 무시하고 마이페이지로
      const returnUrl = (saved && !saved.startsWith('/admin')) ? saved : '/mypage.html'
      window.location.href = returnUrl
    }
  } catch (err) {
    console.error('[HGM] 세션 확인 오류:', err)
  }
}

/** 구글 버튼을 로딩 상태로 변환 (DOM 조작, innerHTML 미사용) */
function setGoogleButtonLoading(original) {
  btnGoogle.textContent = ''
  btnGoogle.disabled = true

  const spinner = document.createElement('span')
  spinner.className = 'loading-spinner'
  spinner.style.cssText = 'width:20px;height:20px;border-width:2px;'

  const label = document.createElement('span')
  label.textContent = '로그인 중...'
  label.style.cssText = 'font-size:14px;color:#3c4043;'

  btnGoogle.appendChild(spinner)
  btnGoogle.appendChild(label)
}

/** 구글 버튼을 원래 상태로 복원 */
function restoreGoogleButton() {
  btnGoogle.textContent = ''
  btnGoogle.disabled = false

  // 구글 SVG 아이콘
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('class', 'btn-social__icon')

  const paths = [
    { d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z', fill: '#4285F4' },
    { d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z', fill: '#34A853' },
    { d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z', fill: '#FBBC05' },
    { d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z', fill: '#EA4335' },
  ]
  paths.forEach(({ d, fill }) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    path.setAttribute('fill', fill)
    svg.appendChild(path)
  })

  const label = document.createElement('span')
  label.className = 'btn-social__text'
  label.textContent = '구글로 로그인'

  btnGoogle.appendChild(svg)
  btnGoogle.appendChild(label)
}

/** 구글 로그인 클릭 핸들러 */
async function handleGoogleLogin() {
  hideError()
  setGoogleButtonLoading()

  try {
    const { error } = await signInWithGoogle()
    if (error) throw error
    // OAuth 리다이렉트이므로 이후 코드 실행 안 됨
  } catch (err) {
    console.error('[HGM] 구글 로그인 오류:', err)
    showError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    restoreGoogleButton()
  }
}

/** OAuth 콜백 — URL에 error 파라미터가 있는 경우 처리 */
function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const error = params.get('error') || hashParams.get('error')
  const errorDescription = params.get('error_description') || hashParams.get('error_description')

  if (error) {
    const messages = {
      'access_denied': '로그인이 취소되었습니다.',
      'server_error': '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    }
    showError(messages[error] || errorDescription || '로그인 오류가 발생했습니다.')
  }
}

/** 햄버거 메뉴 토글 */
function initHamburger() {
  const hamburger = document.getElementById('hamburger')
  const mobileMenu = document.getElementById('mobile-menu')
  if (!hamburger || !mobileMenu) return

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active')
    mobileMenu.classList.toggle('active')
  })
}

/** 초기화 */
async function init() {
  initHamburger()
  updateNavAuth()
  await checkAlreadyLoggedIn()
  handleOAuthCallback()

  btnGoogle.addEventListener('click', handleGoogleLogin)
}

init()
