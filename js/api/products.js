import { supabase } from '../config.js'

/**
 * 상품 목록 조회 (필터/정렬 지원)
 * @param {Object} options - 조회 옵션
 * @param {string} [options.category] - 카테고리 필터
 * @param {string} [options.status] - 상태 필터 (active, inactive 등)
 * @param {boolean} [options.isNew] - 신상품 여부 필터
 * @param {boolean} [options.isBest] - 베스트 상품 여부 필터
 * @param {number} [options.limit=20] - 페이지당 조회 수
 * @param {number} [options.offset=0] - 시작 오프셋
 * @param {string} [options.orderBy='created_at'] - 정렬 기준 컬럼
 * @param {boolean} [options.ascending=false] - 오름차순 여부
 */
export async function getProducts({
  category,
  status,
  isNew,
  isBest,
  limit = 20,
  offset = 0,
  orderBy = 'created_at',
  ascending = false,
} = {}) {
  try {
    // 기본 쿼리 빌드
    let query = supabase.from('hgm_products').select('*')

    // 카테고리 필터 적용
    if (category) {
      query = query.eq('category', category)
    }

    // 상태 필터 적용
    if (status) {
      query = query.eq('status', status)
    }

    // 신상품 필터 적용
    if (isNew !== undefined) {
      query = query.is('is_new', isNew)
    }

    // 베스트 상품 필터 적용
    if (isBest !== undefined) {
      query = query.is('is_best', isBest)
    }

    // 정렬 및 페이지네이션 적용
    const { data, error } = await query
      .order(orderBy, { ascending })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getProducts] 상품 목록 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 상품 단건 조회
 * @param {number|string} id - 상품 ID
 */
export async function getProductById(id) {
  try {
    const { data, error } = await supabase
      .from('hgm_products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getProductById] 상품 단건 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 상품 등록 (관리자 전용)
 * @param {Object} data - 상품 데이터
 */
export async function createProduct(data) {
  try {
    const { data: created, error } = await supabase
      .from('hgm_products')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return created
  } catch (err) {
    console.error('[createProduct] 상품 등록 실패:', err)
    return { error: err.message }
  }
}

/**
 * 상품 수정 (관리자 전용)
 * @param {number|string} id - 상품 ID
 * @param {Object} data - 수정할 데이터
 */
export async function updateProduct(id, data) {
  try {
    const { data: updated, error } = await supabase
      .from('hgm_products')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return updated
  } catch (err) {
    console.error('[updateProduct] 상품 수정 실패:', err)
    return { error: err.message }
  }
}

/**
 * 상품 삭제 (관리자 전용)
 * @param {number|string} id - 상품 ID
 */
export async function deleteProduct(id) {
  try {
    const { error } = await supabase
      .from('hgm_products')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[deleteProduct] 상품 삭제 실패:', err)
    return { error: err.message }
  }
}

/**
 * 조회수 증가 (상품 상세 페이지 진입 시 호출)
 * @param {number|string} id - 상품 ID
 */
export async function incrementViewCount(id) {
  try {
    // RPC 함수로 원자적 증가 처리
    const { error } = await supabase.rpc('increment_product_view', { product_id: id })

    if (error) {
      // RPC가 없을 경우 직접 업데이트로 폴백
      const { data: product } = await supabase
        .from('hgm_products')
        .select('view_count')
        .eq('id', id)
        .single()

      const { error: updateError } = await supabase
        .from('hgm_products')
        .update({ view_count: (product?.view_count || 0) + 1 })
        .eq('id', id)

      if (updateError) throw updateError
    }

    return { success: true }
  } catch (err) {
    console.error('[incrementViewCount] 조회수 증가 실패:', err)
    return { error: err.message }
  }
}

/**
 * 카테고리 목록 조회 (중복 제거)
 * 상품 테이블에서 고유한 카테고리 값을 추출
 */
export async function getCategories() {
  try {
    const { data, error } = await supabase
      .from('hgm_products')
      .select('category')
      .not('category', 'is', null)
      .order('category', { ascending: true })

    if (error) throw error

    // 클라이언트 사이드에서 중복 제거
    const categories = [...new Set(data.map((row) => row.category))]
    return categories
  } catch (err) {
    console.error('[getCategories] 카테고리 목록 조회 실패:', err)
    return { error: err.message }
  }
}
