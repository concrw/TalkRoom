import { supabase, Review } from '../supabase'

// 내 리뷰 목록 가져오기
export const getMyReviews = async (userId: string) => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:users(id, name, profile_image),
      talk_room:talk_rooms(id, title, author)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching my reviews:', error)
    return { data: [], error }
  }

  return { data: data || [], error: null }
}

// 공개 리뷰 목록 가져오기 (커뮤니티용)
export const getPublicReviews = async () => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:users(id, name, profile_image),
      talk_room:talk_rooms(id, title, author, category)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching public reviews:', error)
    return { data: [], error }
  }

  return { data: data || [], error: null }
}

// 특정 토크룸의 리뷰 목록
export const getRoomReviews = async (roomId: string) => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:users(id, name, profile_image)
    `)
    .eq('room_id', roomId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching room reviews:', error)
    return { data: [], error }
  }

  return { data: data || [], error: null }
}

// 리뷰 작성
export const createReview = async (reviewData: {
  user_id: string
  room_id: string
  title: string
  content: string
  is_public?: boolean
}) => {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      ...reviewData,
      is_public: reviewData.is_public || false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating review:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// 리뷰 수정
export const updateReview = async (reviewId: string, updates: {
  title?: string
  content?: string
  is_public?: boolean
}) => {
  const { data, error } = await supabase
    .from('reviews')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', reviewId)
    .select()
    .single()

  if (error) {
    console.error('Error updating review:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// 리뷰 삭제
export const deleteReview = async (reviewId: string) => {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)

  if (error) {
    console.error('Error deleting review:', error)
    return { error }
  }

  return { error: null }
}

// 사용자의 특정 토크룸 리뷰 가져오기
export const getUserRoomReview = async (userId: string, roomId: string) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('room_id', roomId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user room review:', error)
    return { data: null, error }
  }

  return { data: data || null, error: null }
}