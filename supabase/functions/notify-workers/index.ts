// Supabase Edge Function: notify-workers
// Broadcasts a newly-placed, unassigned booking to every verified+available
// cleaner: one WhatsApp message each, plus a worker_notifications row so it
// also shows up in-app (Worker Portal bell/list) even if WhatsApp is missed.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function formatWhatsApp(phone: string | null): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('27')) return `whatsapp:+${cleaned}`
  if (cleaned.startsWith('0')) return `whatsapp:+27${cleaned.slice(1)}`
  return `whatsapp:+27${cleaned}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { bookingId } = await req.json()
    if (!bookingId) return json({ error: 'Missing bookingId' })

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const TWILIO_SID = Deno.env.get('TWILIO_SID')
    const TWILIO_TOKEN = Deno.env.get('TWILIO_TOKEN')
    const FROM = Deno.env.get('TWILIO_WHATSAPP_FROM') || 'whatsapp:+14155238886'
    const SITE_URL = Deno.env.get('SITE_URL') || 'https://cleanconnect.co.za'
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: booking, error: bookingError } = await supabase
      .from('bookings').select('*').eq('id', bookingId).maybeSingle()
    if (bookingError) throw bookingError
    if (!booking) return json({ error: 'Booking not found.' })

    // Already claimed (or otherwise no longer open) — nothing to broadcast.
    // Makes repeat calls to this function harmless/idempotent.
    if (booking.job_status !== 'broadcasting') {
      return json({ success: true, notified: 0, skipped: 'not broadcasting' })
    }

    const { data: cleaners, error: cleanersError } = await supabase
      .from('cleaners').select('id, phone').eq('verified', true).eq('available', true)
    if (cleanersError) throw cleanersError
    if (!cleaners || cleaners.length === 0) return json({ success: true, notified: 0 })

    const amount = `R${(booking.amount || 0).toLocaleString('en-ZA')}`
    const messageBody = `🧹 *New job available!*\n\n${booking.service_name} · ${booking.sqm}m² · ${booking.city}, ${booking.province} · ${amount}\n📅 ${booking.booking_date} · ${booking.time_slot}\n\nReply or open the Worker Portal to accept: ${SITE_URL}/worker`

    const sendWhatsApp = async (to: string) => {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`
        },
        body: new URLSearchParams({ From: FROM, To: to, Body: messageBody }).toString()
      })
      return res.json()
    }

    let sent = 0
    for (const cleaner of cleaners) {
      const to = formatWhatsApp(cleaner.phone)
      if (to && TWILIO_SID && TWILIO_TOKEN) {
        await sendWhatsApp(to).catch(() => {})
        sent++
      }
    }

    await supabase.from('worker_notifications').insert(
      cleaners.map(c => ({ cleaner_id: c.id, booking_id: bookingId }))
    )

    return json({ success: true, notified: cleaners.length, whatsappSent: sent })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Something went wrong. Please try again.' })
  }
})
