// Supabase Storage 이미지 업로드/삭제 헬퍼
import { supabase } from '../config.js'

const BUCKET = 'hgm-images'

/**
 * Supabase Storage hgm-images 버킷에 이미지 업로드
 * 경로: {folder}/{timestamp}_{파일명}
 * @param {File} file - 업로드할 파일 객체
 * @param {string} folder - 저장 폴더명 (기본: 'products')
 * @returns {Promise<{url: string}|{error: string}>}
 */
export async function uploadImage(file, folder = 'products') {
  try {
    // 경로: {folder}/{timestamp}_{파일명}
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${folder}/${timestamp}_${safeName}`

    // 버킷에 업로드
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false })

    if (uploadError) throw uploadError

    // 공개 URL 조회
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { url: data.publicUrl }
  } catch (err) {
    console.error('[HGM] uploadImage 오류:', err)
    return { error: err.message ?? '이미지 업로드 실패' }
  }
}

/**
 * 이미지 삭제
 * @param {string} path - 삭제할 파일 경로 (버킷 내 상대 경로)
 * @returns {Promise<{error: string|null}>}
 */
export async function deleteImage(path) {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw error
    return { error: null }
  } catch (err) {
    console.error('[HGM] deleteImage 오류:', err)
    return { error: err.message ?? '이미지 삭제 실패' }
  }
}

/**
 * 이미지 URL에서 버킷 내 path 추출
 * @param {string} url - Supabase Storage 공개 URL
 * @returns {string} - 버킷 내 상대 경로
 */
export function getImagePath(url) {
  if (!url) return ''
  try {
    // 공개 URL 형식: .../storage/v1/object/public/{bucket}/{path}
    const marker = `/object/public/${BUCKET}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return ''
    return url.slice(idx + marker.length)
  } catch {
    return ''
  }
}
