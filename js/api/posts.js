import { supabase } from '../config.js'

/**
 * 포스트 목록 조회
 * @param {Object} options - 조회 옵션
 * @param {string} [options.type] - 포스트 유형 ('new_arrival' | 'guide')
 * @param {number} [options.limit=10] - 페이지당 조회 수
 * @param {number} [options.offset=0] - 시작 오프셋
 */
export async function getPosts({ type, limit = 10, offset = 0 } = {}) {
  try {
    let query = supabase
      .from('hgm_posts')
      .select('*')
      .order('created_at', { ascending: false })

    // 포스트 유형 필터 적용 (new_arrival 또는 guide)
    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query.range(offset, offset + limit - 1)

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getPosts] 포스트 목록 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 포스트 단건 조회
 * @param {number|string} id - 포스트 ID
 */
export async function getPostById(id) {
  try {
    const { data, error } = await supabase
      .from('hgm_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getPostById] 포스트 단건 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 포스트 등록 (관리자 전용)
 * @param {Object} data - 포스트 데이터 (title, content, type, thumbnail 등)
 */
export async function createPost(data) {
  try {
    const { data: created, error } = await supabase
      .from('hgm_posts')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return created
  } catch (err) {
    console.error('[createPost] 포스트 등록 실패:', err)
    return { error: err.message }
  }
}

/**
 * 포스트 수정 (관리자 전용)
 * @param {number|string} id - 포스트 ID
 * @param {Object} data - 수정할 데이터
 */
export async function updatePost(id, data) {
  try {
    const { data: updated, error } = await supabase
      .from('hgm_posts')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return updated
  } catch (err) {
    console.error('[updatePost] 포스트 수정 실패:', err)
    return { error: err.message }
  }
}

/**
 * 포스트 삭제 (관리자 전용)
 * @param {number|string} id - 포스트 ID
 */
export async function deletePost(id) {
  try {
    const { error } = await supabase
      .from('hgm_posts')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[deletePost] 포스트 삭제 실패:', err)
    return { error: err.message }
  }
}

/**
 * 포스트 조회수 증가 (포스트 상세 페이지 진입 시 호출)
 * @param {number|string} id - 포스트 ID
 */
export async function incrementPostView(id) {
  try {
    // RPC 함수로 원자적 증가 처리 시도
    const { error } = await supabase.rpc('increment_post_view', { post_id: id })

    if (error) {
      // RPC가 없을 경우 직접 업데이트로 폴백
      const { data: post } = await supabase
        .from('hgm_posts')
        .select('view_count')
        .eq('id', id)
        .single()

      const { error: updateError } = await supabase
        .from('hgm_posts')
        .update({ view_count: (post?.view_count || 0) + 1 })
        .eq('id', id)

      if (updateError) throw updateError
    }

    return { success: true }
  } catch (err) {
    console.error('[incrementPostView] 포스트 조회수 증가 실패:', err)
    return { error: err.message }
  }
}
