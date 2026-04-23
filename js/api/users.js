import { supabase } from '../config.js'

/**
 * 현재 로그인한 유저 정보 조회
 * Supabase Auth 세션에서 유저를 가져온 뒤 hgm_users 프로필도 함께 반환
 */
export async function getCurrentUser() {
  try {
    // Auth 세션에서 현재 유저 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) return null

    // hgm_users 프로필 테이블에서 추가 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('hgm_users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') throw profileError

    return { ...user, profile }
  } catch (err) {
    console.error('[getCurrentUser] 현재 유저 정보 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 유저 정보 upsert — 소셜 로그인 후 hgm_users 테이블에 저장
 * @param {Object} authUser - Supabase Auth 유저 객체
 */
export async function upsertUser(authUser) {
  try {
    const { data, error } = await supabase
      .from('hgm_users')
      .upsert(
        {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
          avatar_url: authUser.user_metadata?.avatar_url || '',
          provider: authUser.app_metadata?.provider || 'email',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[upsertUser] 유저 정보 upsert 실패:', err)
    return { error: err.message }
  }
}

/**
 * 유저 정보 수정
 * @param {string} userId - 유저 ID
 * @param {Object} data - 수정할 데이터 (name, phone, address 등)
 */
export async function updateUser(userId, data) {
  try {
    const { data: updated, error } = await supabase
      .from('hgm_users')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return updated
  } catch (err) {
    console.error('[updateUser] 유저 정보 수정 실패:', err)
    return { error: err.message }
  }
}

/**
 * 위시리스트에 상품 추가
 * @param {string} userId - 유저 ID
 * @param {number|string} productId - 상품 ID
 */
export async function addToWishlist(userId, productId) {
  try {
    const { data, error } = await supabase
      .from('hgm_wishlist')
      .insert([{ user_id: userId, product_id: productId }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[addToWishlist] 위시리스트 추가 실패:', err)
    return { error: err.message }
  }
}

/**
 * 위시리스트에서 상품 제거
 * @param {string} userId - 유저 ID
 * @param {number|string} productId - 상품 ID
 */
export async function removeFromWishlist(userId, productId) {
  try {
    const { error } = await supabase
      .from('hgm_wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[removeFromWishlist] 위시리스트 제거 실패:', err)
    return { error: err.message }
  }
}

/**
 * 위시리스트 목록 조회 (상품 상세 정보 포함)
 * @param {string} userId - 유저 ID
 */
export async function getWishlist(userId) {
  try {
    const { data, error } = await supabase
      .from('hgm_wishlist')
      .select('*, hgm_products(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (err) {
    console.error('[getWishlist] 위시리스트 목록 조회 실패:', err)
    return { error: err.message }
  }
}

/**
 * 위시리스트 등록 여부 확인
 * @param {string} userId - 유저 ID
 * @param {number|string} productId - 상품 ID
 * @returns {boolean} - 위시리스트 등록 여부
 */
export async function isWishlisted(userId, productId) {
  try {
    const { data, error } = await supabase
      .from('hgm_wishlist')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle()

    if (error) throw error
    return !!data
  } catch (err) {
    console.error('[isWishlisted] 위시리스트 확인 실패:', err)
    return { error: err.message }
  }
}

/**
 * 주문자 배송 정보 저장 (로그인 회원 전용)
 * @param {string} userId
 * @param {{ name, phone, zipcode, address, addressDetail, deliveryMemo }} info
 */
export async function saveShippingInfo(userId, info) {
  try {
    const { data, error } = await supabase
      .from('hgm_users')
      .update({
        name: info.name,
        phone: info.phone,
        default_zipcode: info.zipcode,
        default_address: info.address,
        default_address_detail: info.addressDetail,
        default_delivery_memo: info.deliveryMemo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('[saveShippingInfo] 배송 정보 저장 실패:', err)
    return { error: err.message }
  }
}

/**
 * 저장된 배송 정보 조회 (로그인 회원 전용)
 * @param {string} userId
 */
export async function getShippingInfo(userId) {
  try {
    const { data, error } = await supabase
      .from('hgm_users')
      .select('name, phone, default_zipcode, default_address, default_address_detail, default_delivery_memo')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  } catch (err) {
    console.error('[getShippingInfo] 배송 정보 조회 실패:', err)
    return null
  }
}

/**
 * 전체 회원 수 조회 (관리자 대시보드용)
 */
export async function getUserCount() {
  try {
    const { count, error } = await supabase
      .from('hgm_users')
      .select('*', { count: 'exact', head: true })

    if (error) throw error
    return count
  } catch (err) {
    console.error('[getUserCount] 회원 수 조회 실패:', err)
    return { error: err.message }
  }
}
