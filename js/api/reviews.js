import { supabase } from '../config.js'

/**
 * 리뷰 목록 조회 (공개된 리뷰만 기본 표시)
 * @param {Object} options - 조회 옵션
 * @param {string} [options.orderBy='created_at'] - 정렬 기준 컬럼
 * @param {boolean} [options.ascending=false] - 오름차순 여부
 * @param {number} [options.limit=12] - 페이지당 조회 수
 * @param {number} [options.offset=0] - 시작 오프셋
 */
export async function getReviews({ orderBy = 'created_at', ascending = false, limit = 12, offset = 0 } = {}) {
  try {
    const { data, error, count } = await supabase
      .from('hgm_reviews')
      .select('*, hgm_users(name, avatar_url), hgm_products(name, image_url)', { count: 'exact' })
      .eq('is_published', true)
      .order(orderBy, { ascending })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return { data, count }
  } catch (err) {
    console.error('[getReviews] 리뷰 목록 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 리뷰 단건 조회
 * @param {number|string} id - 리뷰 ID
 */
export async function getReviewById(id) {
  try {
    const { data, error } = await supabase
      .from('hgm_reviews')
      .select('*, hgm_users(name, avatar_url), hgm_products(name, image_url)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getReviewById] 리뷰 단건 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 리뷰 등록
 * @param {string} userId - 작성자 유저 ID
 * @param {number|string} orderId - 연관 주문 ID (구매 인증용)
 * @param {number|string} productId - 리뷰 대상 상품 ID
 * @param {Object} data - 리뷰 내용
 * @param {number} data.rating - 별점 (1~5)
 * @param {string} data.content - 리뷰 내용
 * @param {string[]} [data.images] - 리뷰 이미지 URL 배열
 */
export async function createReview(userId, orderId, productId, data) {
  try {
    const { data: created, error } = await supabase
      .from('hgm_reviews')
      .insert([
        {
          user_id: userId,
          order_id: orderId,
          product_id: productId,
          rating: data.rating,
          content: data.content,
          images: data.images || [],
          is_published: true, // 등록 즉시 공개 (관리자가 숨길 수 있음)
          like_count: 0,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return created
  } catch (err) {
    console.error('[createReview] 리뷰 등록 실패:', err)
    return { error: err.message }
  }
}

/**
 * 리뷰 발행/숨김 토글 (관리자 전용)
 * @param {number|string} id - 리뷰 ID
 * @param {boolean} isPublished - 발행 여부 (true: 공개, false: 숨김)
 */
export async function toggleReviewPublish(id, isPublished) {
  try {
    const { data, error } = await supabase
      .from('hgm_reviews')
      .update({ is_published: isPublished })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[toggleReviewPublish] 리뷰 발행 토글 실패:', err)
    return { error: err.message }
  }
}

/**
 * 리뷰 삭제 (관리자 전용)
 * @param {number|string} id - 리뷰 ID
 */
export async function deleteReview(id) {
  try {
    const { error } = await supabase
      .from('hgm_reviews')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[deleteReview] 리뷰 삭제 실패:', err)
    return { error: err.message }
  }
}

/**
 * 리뷰 좋아요 토글
 * 이미 좋아요를 눌렀으면 취소, 누르지 않았으면 추가
 * @param {number|string} reviewId - 리뷰 ID
 * @param {string} userId - 유저 ID
 */
export async function toggleReviewLike(reviewId, userId) {
  try {
    // 기존 좋아요 여부 확인
    const { data: existing, error: checkError } = await supabase
      .from('hgm_review_likes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .maybeSingle()

    if (checkError) throw checkError

    if (existing) {
      // 좋아요 취소: hgm_review_likes에서 레코드 삭제 후 like_count 감소
      const { error: deleteError } = await supabase
        .from('hgm_review_likes')
        .delete()
        .eq('id', existing.id)

      if (deleteError) throw deleteError

      // like_count 감소 (0 미만으로 내려가지 않도록 보정)
      const { data: review } = await supabase
        .from('hgm_reviews')
        .select('like_count')
        .eq('id', reviewId)
        .single()

      await supabase
        .from('hgm_reviews')
        .update({ like_count: Math.max(0, (review?.like_count || 1) - 1) })
        .eq('id', reviewId)

      return { liked: false }
    } else {
      // 좋아요 추가: hgm_review_likes에 레코드 삽입 후 like_count 증가
      const { error: insertError } = await supabase
        .from('hgm_review_likes')
        .insert([{ review_id: reviewId, user_id: userId }])

      if (insertError) throw insertError

      const { data: review } = await supabase
        .from('hgm_reviews')
        .select('like_count')
        .eq('id', reviewId)
        .single()

      await supabase
        .from('hgm_reviews')
        .update({ like_count: (review?.like_count || 0) + 1 })
        .eq('id', reviewId)

      return { liked: true }
    }
  } catch (err) {
    console.error('[toggleReviewLike] 리뷰 좋아요 토글 실패:', err)
    return { error: err.message }
  }
}
