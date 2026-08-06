// Supabase Edge Function: send-whatsapp
// Deploy with: supabase functions deploy send-whatsapp
// Set secrets: supabase secrets set TWILIO_SID=xxx TWILIO_TOKEN=xxx TWILIO_WHATSAPP_FROM=whatsapp:+14155238886 ADMIN_WHATSAPP=whatsapp:+27XXXXXXXXX

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { booking, customerPhone, customerName, type } = await req.json()

    const TWILIO_SID = Deno.env.get('TWILIO_SID')
    const TWILIO_TOKEN = Deno.env.get('TWILIO_TOKEN')
    const FROM = Deno.env.get('TWILIO_WHATSAPP_FROM') || 'whatsapp:+14155238886'
    const ADMIN_WA = Deno.env.get('ADMIN_WHATSAPP')

    if (!TWILIO_SID || !TWILIO_TOKEN) {
      return new Response(JSON.stringify({ error: 'Twilio credentials not set' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Format SA phone number to WhatsApp format
    const formatPhone = (phone) => {
      if (!phone) return null
      const cleaned = phone.replace(/\D/g, '')
      if (cleaned.startsWith('27')) return `whatsapp:+${cleaned}`
      if (cleaned.startsWith('0')) return `whatsapp:+27${cleaned.slice(1)}`
      return `whatsapp:+27${cleaned}`
    }

    const customerWA = formatPhone(customerPhone)

    const sendMessage = async (to, body) => {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`
          },
          body: new URLSearchParams({ From: FROM, To: to, Body: body }).toString()
        }
      )
      return response.json()
    }

    const messages = []

    if (type === 'status_update') {
      // Status update message to customer
      if (customerWA) {
        const statusMessages = {
          confirmed: `✅ *Booking Confirmed!*\n\nHi ${customerName}, your CleanConnect booking has been confirmed.\n\n📋 *Ref:* ${booking.id}\n🧹 *Service:* ${booking.service_name}\n📅 *Date:* ${booking.booking_date}\n⏰ *Time:* ${booking.time_slot}\n📍 *Address:* ${booking.address}, ${booking.city}\n${booking.cleaner_assigned ? `👤 *Cleaner:* ${booking.cleaner_assigned}` : ''}\n\nWe'll be there on time! 🇿🇦`,
          'in-progress': `🔄 *Cleaning In Progress!*\n\nHi ${customerName}, our team has arrived and started cleaning your space.\n\n📋 *Ref:* ${booking.id}\n👤 *Cleaner:* ${booking.cleaner_assigned || 'CleanConnect Team'}\n\nSit back and relax! ✨`,
          completed: `✨ *Cleaning Complete!*\n\nHi ${customerName}, your space is now spotless!\n\n📋 *Ref:* ${booking.id}\n🧹 *Service:* ${booking.service_name}\n\nThank you for using CleanConnect 🇿🇦\nPlease rate your experience by replying with a number 1-5.`,
          cancelled: `❌ *Booking Cancelled*\n\nHi ${customerName}, your booking ${booking.id} has been cancelled.\n\nIf this is unexpected, please contact us. We're sorry for the inconvenience.`
        }

        const msg = statusMessages[booking.status]
        if (msg) {
          const result = await sendMessage(customerWA, msg)
          messages.push({ to: customerWA, sid: result.sid })
        }
      }
    } else if (type === 'job_accepted') {
      // A worker claimed a broadcasted job — let the customer know who and when.
      if (customerWA) {
        const msg = `🎉 *Good news!*\n\nHi ${customerName}, ${booking.cleaner_assigned || 'a cleaner'} has accepted your booking and will arrive at ${booking.time_slot} on ${booking.booking_date}.\n\n📋 *Ref:* ${booking.id}\n📍 *Address:* ${booking.address}, ${booking.city}\n\nWe'll be there on time! 🇿🇦`
        const result = await sendMessage(customerWA, msg)
        messages.push({ to: customerWA, sid: result.sid })
      }
    } else if (type === 'en_route') {
      // Cleaner tapped "I'm on my way" on the Active Job screen.
      if (customerWA) {
        const msg = `🚗 *${booking.cleaner_assigned || 'Your cleaner'} is on the way!*\n\nHi ${customerName}, ${booking.cleaner_assigned || 'your cleaner'} is on the way to your booking!\n\n📋 *Ref:* ${booking.id}\n📍 *Address:* ${booking.address}, ${booking.city}\n\nTrack their arrival from your dashboard. 🇿🇦`
        const result = await sendMessage(customerWA, msg)
        messages.push({ to: customerWA, sid: result.sid })
      }
    } else if (type === 'arrived') {
      // Cleaner tapped "I've arrived / Start cleaning".
      if (customerWA) {
        const msg = `🔔 *Your cleaner has arrived!*\n\nHi ${customerName}, ${booking.cleaner_assigned || 'your cleaner'} has arrived and started cleaning.\n\n📋 *Ref:* ${booking.id}\n🧹 *Service:* ${booking.service_name}\n\nSit back and relax! ✨`
        const result = await sendMessage(customerWA, msg)
        messages.push({ to: customerWA, sid: result.sid })
      }
    } else if (type === 'job_completed') {
      // Cleaner tapped "Mark job as done".
      if (customerWA) {
        const msg = `✨ *Cleaning Complete!*\n\nHi ${customerName}, your space is now spotless!\n\n📋 *Ref:* ${booking.id}\n🧹 *Service:* ${booking.service_name}\n\nThank you for using CleanConnect 🇿🇦\nPlease take a moment to rate your experience in the app.`
        const result = await sendMessage(customerWA, msg)
        messages.push({ to: customerWA, sid: result.sid })
      }
    } else {
      // New booking — message to customer
      if (customerWA) {
        const customerMsg = `🎉 *Booking Confirmed — CleanConnect!*\n\nHi ${customerName}, your booking is confirmed and payment received.\n\n📋 *Booking ID:* ${booking.id}\n🧹 *Service:* ${booking.service_name}\n📐 *Size:* ${booking.sqm}m²\n📅 *Date:* ${booking.booking_date}\n⏰ *Arrival:* ${booking.time_slot}\n📍 *Address:* ${booking.address}, ${booking.city}\n💳 *Paid:* R${(booking.amount || 0).toLocaleString('en-ZA')}\n\nA cleaner will be assigned shortly. Track your booking at cleanconnect.co.za\n\nQuestions? Reply to this message. 🇿🇦`
        const result = await sendMessage(customerWA, customerMsg)
        messages.push({ to: customerWA, sid: result.sid })
      }

      // New booking — alert to admin
      if (ADMIN_WA) {
        const adminMsg = `🔔 *New Booking Alert!*\n\n📋 *Ref:* ${booking.id}\n👤 *Customer:* ${customerName}\n📱 *Phone:* ${customerPhone}\n🧹 *Service:* ${booking.service_name}\n📐 *Size:* ${booking.sqm}m²\n📅 *Date:* ${booking.booking_date} · ${booking.time_slot}\n📍 *Location:* ${booking.address}, ${booking.city}, ${booking.province}\n💰 *Amount:* R${(booking.amount || 0).toLocaleString('en-ZA')}\n${booking.special_instructions ? `📝 *Notes:* ${booking.special_instructions}` : ''}\n\n➡️ Login to Admin panel to assign a cleaner.`
        const result = await sendMessage(ADMIN_WA, adminMsg)
        messages.push({ to: ADMIN_WA, sid: result.sid })
      }
    }

    return new Response(
      JSON.stringify({ success: true, messages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
