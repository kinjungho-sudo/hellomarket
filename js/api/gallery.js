import { supabase } from '../config.js'

/**
 * 갤러리 목록 조회
 * @param {Object} options - 조회 옵션
 * @param {string} [options.category] - 카테고리 필터
 * @param {string} [options.status] - 상태 필터 (published, draft 등)
 * @param {number} [options.limit=30] - 페이지당 조회 수
 * @param {number} [options.offset=0] - 시작 오프셋
 */
export async function getGallery({ category, status, limit = 30, offset = 0 } = {}) {
  try {
    let query = supabase
      .from('hgm_gallery')
      .select('*')
      .order('created_at', { ascending: false })

    // 카테고리 필터 적용
    if (category) {
      query = query.eq('category', category)
    }

    // 상태 필터 적용
    if (status) {
      query = query.eq('status', status)
    }

    // 페이지네이션 적용
    const { data, error } = await query.range(offset, offset + limit - 1)

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getGallery] 갤러리 목록 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 갤러리 아이템 단건 조회
 * @param {number|string} id - 갤러리 아이템 ID
 */
export async function getGalleryById(id) {
  try {
    const { data, error } = await supabase
      .from('hgm_gallery')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getGalleryById] 갤러리 단건 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 갤러리 아이템 등록 (관리자 전용)
 * @param {Object} data - 갤러리 아이템 데이터
 */
export async function createGalleryItem(data) {
  try {
    const { data: created, error } = await supabase
      .from('hgm_gallery')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return created
  } catch (err) {
    console.error('[createGalleryItem] 갤러리 등록 실패:', err)
    return { error: err.message }
  }
}

/**
 * 갤러리 아이템 수정 (관리자 전용)
 * @param {number|string} id - 갤러리 아이템 ID
 * @param {Object} data - 수정할 데이터
 */
export async function updateGalleryItem(id, data) {
  try {
    const { data: updated, error } = await supabase
      .from('hgm_gallery')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return updated
  } catch (err) {
    console.error('[updateGalleryItem] 갤러리 수정 실패:', err)
    return { error: err.message }
  }
}

/**
 * 갤러리 아이템 삭제 (관리자 전용)
 * @param {number|string} id - 갤러리 아이템 ID
 */
export async function deleteGalleryItem(id) {
  try {
    const { error } = await supabase
      .from('hgm_gallery')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[deleteGalleryItem] 갤러리 삭제 실패:', err)
    return { error: err.message }
  }
}
