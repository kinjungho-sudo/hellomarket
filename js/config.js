// Supabase 클라이언트 초기화
// SUPABASE_ANON_KEY는 .env에서 주입 — 직접 하드코딩 금지
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://gqynptpjomcqzxyykqic.supabase.co'
// 아래 값을 Supabase 대시보드 → Settings → API → anon public key에서 복사해서 입력
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeW5wdHBqb21jcXp4eXlrcWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTcyNzMsImV4cCI6MjA4NzEzMzI3M30.7OgewnWhbE2GK1k0tTuuegrKUVkHuJrW_cpvbVRcH1E'

if (!SUPABASE_ANON_KEY) {
  console.warn('[HGM] SUPABASE_ANON_KEY가 설정되지 않았습니다. js/config.js를 확인하세요.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

