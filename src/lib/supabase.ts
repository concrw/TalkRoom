import { createClient } from '@supabase/supabase-js'

// Supabase 설정 (하드코딩된 값 사용)
const supabaseUrl = 'https://ctvdsjzazqoodeqenwza.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0dmRzanphenFvb2RlcWVud3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NTA1MzQsImV4cCI6MjA3MzQyNjUzNH0.URKd9oZGOopYVX4zpjzSsxjo601Kg1we9GBy7B6BCBc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 기존 데이터베이스 테이블에 맞는 타입 정의들
export interface User {
  id: string
  email: string
  name: string
  nickname?: string
  avatar_url?: string
  bio?: string
  execution_rate?: number
  completion_rate?: number
  streak_days?: number
  level?: number
  created_at?: string
  updated_at?: string
}

export interface TalkRoom {
  id: string
  title: string
  author: string
  description: string
  media_type: string
  media_url?: string
  cover_image_url?: string
  host_id?: string
  capacity: number
  current_participants?: number
  start_date: string
  end_date: string
  status: string
  category: string
  tags?: string[]
  meeting_time?: string
  location?: string
  level?: string
  features?: string[]
  allow_replay?: boolean
  is_public?: boolean
  created_at?: string
  updated_at?: string
  host?: User
  participant_count?: number
}

export interface RoomParticipant {
  id: string
  user_id?: string
  room_id?: string
  role: string
  status: string
  joined_at?: string
  user?: User
}

export interface Review {
  id: string
  user_id?: string
  room_id?: string
  talkroom_id?: string
  title: string
  content: string
  is_public?: boolean
  created_at?: string
  updated_at?: string
  user?: User
  talk_room?: TalkRoom
}

export interface CommunityPost {
  id: string
  user_id?: string
  title?: string
  content: string
  type?: string
  is_public?: boolean
  created_at?: string
  updated_at?: string
  user?: User
}

export interface TrainingCourse {
  id: string
  user_id?: string
  room_id?: string
  title?: string
  description?: string
  duration?: number
  difficulty?: string
  created_at?: string
  updated_at?: string
}

export interface DailyLog {
  id: string
  user_id?: string
  course_id?: string
  type?: string
  content: string
  mood?: string
  created_at?: string
  date?: string
  user?: User
}