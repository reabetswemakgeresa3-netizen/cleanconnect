// Supabase Edge Function: send-whatsapp-otp
// Sends a 6-digit verification code over WhatsApp via Twilio, for phone-based
// signup/login. Reuses the same Twilio secrets as the send-whatsapp function:
// TWILIO_SID, TWILIO_TOKEN, TWILIO_WHATSAPP_FROM.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Accepts 0821234567, 821234567, 27821234567, or +27821234567
function normalizeSAPhone(input: string): string | null {
  if (!input) return null
  const digits = input.replace(/[^\d+]/g, '')
  if (digits.startsWith('+27') && digits.length === 12) return digits
  if (digits.startsWith('27') && digits.length === 11) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+27${digits.slice(1)}`
  if (/^\d{9}$/.test(digits)) return `+27${digits}`
  return null
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { phone } = await req.json()
    const normalized = normalizeSAPhone(phone)
    if (!normalized) return json({ error: 'Enter a valid South African phone number, e.g. 072 123 4567' })

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const TWILIO_SID = Deno.env.get('TWILIO_SID')
    const TWILIO_TOKEN = Deno.env.get('TWILIO_TOKEN')
    const FROM = Deno.env.get('TWILIO_WHATSAPP_FROM')

    if (!TWILIO_SID || !TWILIO_TOKEN || !FROM) {
      return json({ error: 'WhatsApp sign-in is not configured yet. Please contact support.' })
    }

    // One live code per number at a time
    await supabase.from('otp_codes').delete().eq('phone', normalized).eq('verified', false)

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    const { error: insertError } = await supabase.from('otp_codes').insert({ phone: normalized, code, expires_at: expiresAt })
    if (insertError) throw insertError

    const messageBody = `Your CleanConnect verification code is: ${code}. Valid for 5 minutes. Don't share this code with anyone.`

    const twilioResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`
        },
        body: new URLSearchParams({ From: FROM, To: `whatsapp:${normalized}`, Body: messageBody }).toString()
      }
    )
    const twilioData = await twilioResp.json()

    if (!twilioResp.ok) {
      // Don't leave an unusable code sitting around if the message never went out
      await supabase.from('otp_codes').delete().eq('phone', normalized).eq('code', code)

      const twilioMessage: string = twilioData?.message || ''
      let friendly = 'Could not send the WhatsApp message. Please try again shortly.'
      if (twilioData?.code === 63016 || twilioData?.code === 63007 || /channel/i.test(twilioMessage)) {
        friendly = "This number hasn't joined our WhatsApp sandbox yet. Send the join code we shared with you to the sandbox number on WhatsApp first, then try again."
      } else if (/not a valid/i.test(twilioMessage)) {
        friendly = 'That number could not be reached on WhatsApp. Double-check it and try again.'
      }
      return json({ error: friendly })
    }

    return json({ success: true, phone: normalized })
  } catch {
    return json({ error: 'Something went wrong sending your code. Please try again.' })
  }
})
