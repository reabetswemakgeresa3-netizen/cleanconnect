// Supabase Edge Function: verify-whatsapp-otp
// Verifies the code sent by send-whatsapp-otp, then signs in (or creates) the
// matching auth user. Since there's no admin API to mint a session directly,
// we mint a real one the supported way: generate an internal magic-link OTP
// for the user's (synthetic) email and hand that code back to the client,
// which exchanges it for a real session via the public verifyOtp() call.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const { phone, code, fullName } = await req.json()
    const normalized = normalizeSAPhone(phone)
    if (!normalized || !code) return json({ error: 'Missing phone number or code' })

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Simple housekeeping on every call — no cron needed
    await supabase.from('otp_codes').delete().lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    const { data: otpRow, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', normalized)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!otpRow) return json({ error: 'No pending code for this number. Please request a new one.' })
    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      return json({ error: 'This code has expired. Please request a new one.' })
    }
    if (otpRow.code !== String(code).trim()) {
      return json({ error: 'Incorrect code. Please check and try again.' })
    }

    await supabase.from('otp_codes').update({ verified: true }).eq('id', otpRow.id)

    // Phone-only users get a stable synthetic email as their auth identity —
    // no email is ever sent to it, it just gives Supabase Auth something to
    // key the account and the magic-link OTP exchange on.
    const fakeEmail = `${normalized.replace('+', '')}@whatsapp.cleanconnect.local`

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', normalized)
      .maybeSingle()

    let userId: string

    if (existingProfile) {
      userId = existingProfile.id
    } else {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        phone: normalized,
        phone_confirm: true,
        email: fakeEmail,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName, phone: normalized } : { phone: normalized }
      })
      if (createError) throw createError
      userId = created.user!.id

      await supabase.from('profiles').upsert({
        id: userId, phone: normalized, full_name: fullName || null, created_at: new Date().toISOString()
      })
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: fakeEmail
    })
    if (linkError) throw linkError

    return json({ success: true, email: fakeEmail, otp: linkData.properties.email_otp, userId })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Something went wrong. Please try again.' })
  }
})
