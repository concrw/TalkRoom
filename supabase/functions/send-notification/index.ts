import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, title, message, type = 'system' } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // DB에 알림 저장
    const { error: dbError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        is_read: false,
      })

    if (dbError) throw dbError

    // FCM 푸시 알림 전송 (옵션)
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
    if (fcmServerKey) {
      // FCM 토큰 조회
      const { data: userData } = await supabaseClient
        .from('users')
        .select('fcm_token')
        .eq('id', userId)
        .single()

      if (userData?.fcm_token) {
        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${fcmServerKey}`
          },
          body: JSON.stringify({
            to: userData.fcm_token,
            notification: {
              title,
              body: message,
              icon: '/icon.png'
            }
          })
        })

        if (!fcmResponse.ok) {
          console.error('FCM error:', await fcmResponse.text())
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
