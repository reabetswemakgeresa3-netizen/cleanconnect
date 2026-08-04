// Supabase Edge Function: process-refund
// Calls Yoco's refund endpoint for a booking's card payment and updates the
// booking + refund_log accordingly. Cash bookings never reach Yoco at all —
// they're never eligible here (checked below via payment_method).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { bookingId } = await req.json()
    if (!bookingId) return json({ error: 'Missing bookingId' })

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const YOCO_SECRET_KEY = Deno.env.get('YOCO_SECRET_KEY')!
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Identify the caller from their own JWT (forwarded automatically by
    // supabase.functions.invoke) — this client bypasses RLS via the service
    // role, so the caller's identity has to be checked explicitly here.
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !userData.user) return json({ error: 'Not signed in.' })
    const callerId = userData.user.id

    const { data: booking, error: bookingError } = await supabase
      .from('bookings').select('*').eq('id', bookingId).maybeSingle()
    if (bookingError) throw bookingError
    if (!booking) return json({ error: 'Booking not found.' })

    const { data: adminRow } = await supabase.from('admin_users').select('id').eq('id', callerId).maybeSingle()
    const isAdmin = !!adminRow
    const isOwner = booking.user_id === callerId
    if (!isAdmin && !isOwner) return json({ error: 'You are not allowed to refund this booking.' })

    if (booking.payment_method === 'cash') {
      return json({ error: 'This booking was paid in cash — there is nothing to refund via Yoco.' })
    }
    if (booking.payment_status !== 'paid') {
      return json({ error: 'This booking is not currently marked as paid.' })
    }
    if (!booking.payment_reference) {
      return json({ error: 'No payment reference on this booking — cannot look up the original charge.' })
    }

    const refundRes = await fetch(`https://payments.yoco.com/api/checkouts/${booking.payment_reference}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${YOCO_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })
    const refundData = await refundRes.json().catch(() => null)

    if (!refundRes.ok || !refundData || refundData.status !== 'successful') {
      const errorMessage = refundData?.message || `Yoco refund request failed (${refundRes.status})`
      await supabase.from('refund_log').insert({
        booking_id: bookingId,
        yoco_checkout_id: booking.payment_reference,
        amount: booking.amount,
        status: 'failed',
        error_message: errorMessage
      })
      return json({ error: errorMessage })
    }

    await supabase.from('bookings').update({ payment_status: 'refunded' }).eq('id', bookingId)
    await supabase.from('refund_log').insert({
      booking_id: bookingId,
      yoco_checkout_id: booking.payment_reference,
      yoco_refund_id: refundData.refundId,
      amount: booking.amount,
      status: 'succeeded'
    })

    return json({ success: true, refundId: refundData.refundId })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Something went wrong. Please try again.' })
  }
})
