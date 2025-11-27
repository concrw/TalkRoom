import { supabase, TalkRoom, RoomParticipant } from '../supabase'

// 토크룸 목록 가져오기 (활성 상태만)
export const getTalkRooms = async () => {
  const { data, error } = await supabase
    .from('talk_rooms')
    .select(`
      *,
      host:users(id, name, nickname, avatar_url)
    `)
    .eq('status', 'recruiting')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching talk rooms:', error)
    return { data: [], error }
  }

  return { data: data || [], error: null }
}

// 내가 참여한 토크룸 목록
export const getMyTalkRooms = async (userId: string) => {
  const { data, error } = await supabase
    .from('room_participants')
    .select(`
      *,
      talk_room:talk_rooms(
        *,
        host:users(id, name, nickname, avatar_url)
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) {
    console.error('Error fetching my talk rooms:', error)
    return { data: [], error }
  }

  return { data: data?.map(p => p.talk_room) || [], error: null }
}

// 토크룸 생성
export const createTalkRoom = async (roomData: {
  title: string
  author: string
  description: string
  media_type: string
  media_url?: string
  host_id: string
  capacity: number
  start_date: string
  end_date: string
  category: string
  tags?: string[]
  level?: string
}) => {
  const { data, error } = await supabase
    .from('talk_rooms')
    .insert({
      ...roomData,
      status: 'recruiting',
      current_participants: 1,
      is_public: true
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating talk room:', error)
    return { data: null, error }
  }

  // 생성자를 자동으로 참여자로 추가
  await supabase
    .from('room_participants')
    .insert({
      user_id: roomData.host_id,
      room_id: data.id,
      role: 'host',
      status: 'active'
    })

  return { data, error: null }
}

// 토크룸 참여
export const joinTalkRoom = async (userId: string, roomId: string) => {
  // 이미 참여했는지 확인
  const { data: existing } = await supabase
    .from('room_participants')
    .select('id')
    .eq('user_id', userId)
    .eq('room_id', roomId)
    .single()

  if (existing) {
    return { data: null, error: { message: '이미 참여한 토크룸입니다.' } }
  }

  // 토크룸 정원 확인
  const { data: room } = await supabase
    .from('talk_rooms')
    .select('capacity, current_participants')
    .eq('id', roomId)
    .single()

  if (room && room.current_participants >= room.capacity) {
    return { data: null, error: { message: '정원이 가득 찼습니다.' } }
  }

  const { data, error } = await supabase
    .from('room_participants')
    .insert({
      user_id: userId,
      room_id: roomId,
      role: 'participant',
      status: 'active'
    })
    .select()
    .single()

  if (!error) {
    // 참여자 수 업데이트
    await supabase
      .from('talk_rooms')
      .update({ 
        current_participants: (room?.current_participants || 0) + 1 
      })
      .eq('id', roomId)
  }

  return { data, error }
}

// 토크룸 상세 정보
export const getTalkRoom = async (id: string) => {
  const { data, error } = await supabase
    .from('talk_rooms')
    .select(`
      *,
      host:users(id, name, nickname, avatar_url, bio),
      participants:room_participants(
        *,
        user:users(id, name, nickname, avatar_url)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching talk room:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// 토크룸 참여자 목록
export const getRoomParticipants = async (roomId: string) => {
  const { data, error } = await supabase
    .from('room_participants')
    .select(`
      *,
      user:users(id, name, nickname, avatar_url)
    `)
    .eq('room_id', roomId)
    .eq('status', 'active')

  if (error) {
    console.error('Error fetching participants:', error)
    return { data: [], error }
  }

  return { data: data || [], error: null }
}