import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // 1. 모든 사용자의 streak_days 업데이트
    const { data: users } = await supabaseClient
      .from('users')
      .select('id, streak_days')

    for (const user of users || []) {
      // 어제와 오늘 로그 확인
      const { data: recentLogs } = await supabaseClient
        .from('daily_logs')
        .select('log_date, morning_promise, evening_review')
        .eq('user_id', user.id)
        .in('log_date', [yesterday, today])
        .order('log_date', { ascending: false })

      let newStreak = user.streak_days || 0

      // 오늘 로그가 완료되었는지 확인
      const todayLog = recentLogs?.find(l => l.log_date === today)
      const yesterdayLog = recentLogs?.find(l => l.log_date === yesterday)

      if (todayLog?.morning_promise && todayLog?.evening_review) {
        // 오늘 완료: streak 증가
        if (yesterdayLog?.morning_promise && yesterdayLog?.evening_review) {
          newStreak += 1
        } else {
          newStreak = 1 // 어제 없으면 초기화
        }
      } else if (!yesterdayLog?.morning_promise || !yesterdayLog?.evening_review) {
        // 어제도 완료 안 됨: streak 초기화
        newStreak = 0
      }

      // streak 업데이트
      await supabaseClient
        .from('users')
        .update({ streak_days: newStreak })
        .eq('id', user.id)
    }

    // 2. 토크룸별 평균 평점 계산
    const { data: rooms } = await supabaseClient
      .from('talk_rooms')
      .select('id')

    for (const room of rooms || []) {
      const { data: reviews } = await supabaseClient
        .from('reviews')
        .select('rating')
        .eq('room_id', room.id)
        .not('rating', 'is', null)

      if (reviews && reviews.length > 0) {
        const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length

        // 평균 평점을 talk_rooms 테이블에 저장 (컬럼 추가 필요)
        // await supabaseClient
        //   .from('talk_rooms')
        //   .update({ avg_rating: avgRating })
        //   .eq('id', room.id)
      }
    }

    // 3. 레벨 업데이트 (경험치 기반)
    for (const user of users || []) {
      const { data: logs } = await supabaseClient
        .from('daily_logs')
        .select('morning_promise, evening_review')
        .eq('user_id', user.id)

      const totalPromises = logs?.filter(l => l.morning_promise).length || 0
      const completedPromises = logs?.filter(l => l.evening_review).length || 0
      const streak = user.streak_days || 0

      const exp = totalPromises * 10 + completedPromises * 20 + streak * 5
      let level = 1
      let expNeeded = 100
      let remainingExp = exp

      while (remainingExp >= expNeeded) {
        remainingExp -= expNeeded
        level++
        expNeeded = level * 100
      }

      await supabaseClient
        .from('users')
        .update({ level })
        .eq('id', user.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stats aggregated successfully',
        processedUsers: users?.length || 0,
        processedRooms: rooms?.length || 0
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
