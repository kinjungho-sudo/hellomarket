import { supabase } from '../config.js'
import { upsertUserProfile } from '../auth.js'

/**
 * Q&A 목록 조회 (페이지네이션 지원)
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호 (1부터 시작)
 * @param {number} [options.limit=10] - 페이지당 조회 수
 */
export async function getQnaList({ page = 1, limit = 10 } = {}) {
  try {
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('hgm_qna')
      .select('*, hgm_users(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return { data, count, page, limit }
  } catch (err) {
    console.error('[getQnaList] Q&A 목록 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * Q&A 단건 조회
 * @param {number|string} id - Q&A ID
 */
export async function getQnaById(id) {
  try {
    const { data, error } = await supabase
      .from('hgm_qna')
      .select('*, hgm_users(name)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getQnaById] Q&A 단건 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * Q&A 등록 (로그인 필요)
 * @param {string} userId - 작성자 유저 ID
 * @param {Object} data - Q&A 내용
 * @param {string} data.title - 제목
 * @param {string} data.content - 내용
 * @param {boolean} data.isSecret - 비밀글 여부
 */
export async function createQna(userId, data) {
  try {
    // hgm_users row가 없으면 자동 생성 (FK 제약 방지)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await upsertUserProfile(user)

    const { data: created, error } = await supabase
      .from('hgm_qna')
      .insert([
        {
          user_id: userId,
          title: data.title,
          content: data.content,
          is_secret: data.isSecret || false,
          is_answered: false,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return created
  } catch (err) {
    console.error('[createQna] Q&A 등록 실패:', err)
    return { error: err.message }
  }
}

/**
 * Q&A 답변 등록 (관리자 전용)
 * @param {number|string} id - Q&A ID
 * @param {string} answer - 답변 내용
 */
export async function answerQna(id, answer) {
  try {
    const { data, error } = await supabase
      .from('hgm_qna')
      .update({
        answer,
        is_answered: true,
        answered_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[answerQna] Q&A 답변 등록 실패:', err)
    return { error: err.message }
  }
}

/**
 * Q&A 삭제 (관리자 전용)
 * @param {number|string} id - Q&A ID
 */
export async function deleteQna(id) {
  try {
    const { error } = await supabase
      .from('hgm_qna')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[deleteQna] Q&A 삭제 실패:', err)
    return { error: err.message }
  }
}

/**
 * Q&A 조회수 증가 (상세 페이지 진입 시 호출)
 * @param {number|string} id - Q&A ID
 */
export async function incrementQnaView(id) {
  try {
    // RPC 함수로 원자적 증가 처리 시도
    const { error } = await supabase.rpc('increment_qna_view', { qna_id: id })

    if (error) {
      // RPC가 없을 경우 직접 업데이트로 폴백
      const { data: qna } = await supabase
        .from('hgm_qna')
        .select('view_count')
        .eq('id', id)
        .single()

      const { error: updateError } = await supabase
        .from('hgm_qna')
        .update({ view_count: (qna?.view_count || 0) + 1 })
        .eq('id', id)

      if (updateError) throw updateError
    }

    return { success: true }
  } catch (err) {
    console.error('[incrementQnaView] Q&A 조회수 증가 실패:', err)
    return { error: err.message }
  }
}
