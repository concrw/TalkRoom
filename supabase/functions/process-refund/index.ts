import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { roomId, userId, reason } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 토크룸 정보 조회
    const { data: room } = await supabaseClient
      .from('talk_rooms')
      .select('starts_at, price_cents')
      .eq('id', roomId)
      .single()

    if (!room) {
      throw new Error('Room not found')
    }

    // 2. 환불 정책 확인
    const now = new Date()
    const startsAt = new Date(room.starts_at)
    const hoursUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60)

    let refundPercentage = 0
    let refundReason = ''

    if (hoursUntilStart >= 24) {
      refundPercentage = 100
      refundReason = '시작 24시간 전 취소'
    } else if (hoursUntilStart > 0) {
      refundPercentage = 50
      refundReason = '시작 24시간 이내 취소'
    } else {
      return new Response(
        JSON.stringify({ error: '토크룸 시작 후에는 환불이 불가능합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const refundAmount = Math.round(room.price_cents * (refundPercentage / 100))

    // 3. 환불 레코드 생성
    const { data: refund } = await supabaseClient
      .from('refunds')
      .insert({
        user_id: userId,
        room_id: roomId,
        amount_cents: refundAmount,
        reason: reason || refundReason,
        status: 'pending'
      })
      .select()
      .single()

    // 4. Stripe/TossPayments 환불 처리 (실제 결제 연동 시)
    // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    //   apiVersion: '2023-10-16',
    // })
    // await stripe.refunds.create({
    //   payment_intent: paymentIntentId,
    //   amount: refundAmount,
    // })

    // 5. room_participants 삭제
    await supabaseClient
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId)

    // 6. 환불 완료 처리
    await supabaseClient
      .from('refunds')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', refund.id)

    // 7. 알림 전송
    await supabaseClient.functions.invoke('send-notification', {
      body: {
        userId,
        title: '환불 완료',
        message: `${refundPercentage}% 환불이 완료되었습니다. (${Math.round(refundAmount / 100)}원)`,
        type: 'system'
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        refundAmount,
        refundPercentage,
        message: `${refundPercentage}% 환불이 완료되었습니다.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
